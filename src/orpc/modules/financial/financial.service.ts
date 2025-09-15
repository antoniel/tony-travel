import { AppResult } from "@/orpc/appResult"
import type { TravelDAO } from "../travel/travel.dao"
import type { FinancialDao } from "./financial.dao"
import { financialErrors } from "./financial.errors"
import type {
  ExpenseCategory,
  ExpenseItem,
  FinancialSummary,
  TravelFinancialData,
  UpdateTravelBudgetInput,
} from "./financial.model"

/**
 * Validates if user has permission to access financial data
 */
export async function validateFinancialAccess(
  travelDAO: TravelDAO,
  travelId: string,
  userId: string
): Promise<AppResult<boolean, typeof financialErrors>> {
  try {
    const member = await travelDAO.getTravelMember(travelId, userId)

    if (!member) {
      return AppResult.failure(
        financialErrors,
        "USER_NOT_AUTHORIZED",
        "Usuário não autorizado para acessar dados financeiros",
        { travelId, userId }
      )
    }

    return AppResult.success(true)
  } catch (error) {
    return AppResult.failure(
      financialErrors,
      "USER_NOT_AUTHORIZED",
      "Erro ao verificar permissões de acesso financeiro",
      { travelId, userId }
    )
  }
}

/**
 * Transforms raw financial data into expense items by category
 */
export function transformToExpenseItems(financialData: TravelFinancialData): ExpenseItem[] {
  const expenseItems: ExpenseItem[] = []

  // Add flight expenses (passagens)
  for (const flight of financialData.flights) {
    expenseItems.push({
      id: flight.id,
      name: flight.airline,
      cost: flight.cost,
      category: "passagens",
    })
  }

  // Add accommodation expenses (acomodacoes)
  for (const accommodation of financialData.accommodations) {
    expenseItems.push({
      id: accommodation.id,
      name: accommodation.name,
      cost: accommodation.price,
      category: "acomodacoes",
    })
  }

  // Add event expenses (atracoes) - includes hierarchical calculations
  for (const event of financialData.events) {
    expenseItems.push({
      id: event.id,
      name: event.name,
      cost: event.estimatedCost,
      category: "atracoes",
      parentId: event.parentEventId,
    })
  }

  return expenseItems
}

/**
 * Calculates hierarchical expenses for events with parent/child relationships
 */
export function calculateHierarchicalExpenses(expenseItems: ExpenseItem[]): ExpenseItem[] {
  const eventItems = expenseItems.filter((item) => item.category === "atracoes")
  const eventMap = new Map<string, ExpenseItem>()

  // Build map of all events
  for (const item of eventItems) {
    eventMap.set(item.id, { ...item })
  }

  // Calculate costs including child events
  for (const item of eventItems) {
    if (!item.parentId) {
      // This is a parent event, calculate total including children
      const childCosts = eventItems
        .filter((child) => child.parentId === item.id)
        .reduce((sum, child) => sum + child.cost, 0)

      const eventInMap = eventMap.get(item.id)
      if (eventInMap) {
        eventInMap.cost = item.cost + childCosts
      }
    }
  }

  // Return only parent events (children costs are now included in parents)
  const parentEvents = Array.from(eventMap.values()).filter((item) => !item.parentId)

  // Return non-event items plus calculated parent events
  return [...expenseItems.filter((item) => item.category !== "atracoes"), ...parentEvents]
}

/**
 * Groups expense items by category and calculates totals and percentages
 */
export function groupExpensesByCategory(expenseItems: ExpenseItem[], totalExpenses: number): ExpenseCategory[] {
  const categoryMap = new Map<string, ExpenseCategory>()

  // Initialize categories
  const categories = ["passagens", "acomodacoes", "atracoes"] as const
  for (const category of categories) {
    categoryMap.set(category, {
      category,
      total: 0,
      percentage: 0,
      items: [],
    })
  }

  // Group items by category and calculate totals
  for (const item of expenseItems) {
    const categoryData = categoryMap.get(item.category)
    if (categoryData) {
      categoryData.total += item.cost
      categoryData.items.push({
        id: item.id,
        name: item.name,
        cost: item.cost,
        parentId: item.parentId,
      })
    }
  }

  // Calculate percentages
  for (const categoryData of categoryMap.values()) {
    if (totalExpenses > 0) {
      categoryData.percentage = (categoryData.total / totalExpenses) * 100
    }
  }

  return Array.from(categoryMap.values())
}

export async function updateTravelBudgetService(
  financialDao: FinancialDao,
  travelDAO: TravelDAO,
  userId: string,
  input: UpdateTravelBudgetInput
): Promise<AppResult<void, typeof financialErrors>> {
  try {
    // Validate budget amount
    if (input.budget <= 0) {
      return AppResult.failure(financialErrors, "INVALID_BUDGET_AMOUNT", "Valor do orçamento deve ser positivo", {
        travelId: input.travelId,
        providedAmount: input.budget,
      })
    }

    // Check user permissions
    const permissionResult = await validateFinancialAccess(travelDAO, input.travelId, userId)

    if (AppResult.isFailure(permissionResult)) {
      return permissionResult
    }

    // Check if user has owner permissions for budget updates
    const member = await travelDAO.getTravelMember(input.travelId, userId)
    if (!member || member.role !== "owner") {
      return AppResult.failure(
        financialErrors,
        "USER_NOT_AUTHORIZED",
        "Apenas proprietários podem atualizar o orçamento",
        {
          travelId: input.travelId,
          userId,
        }
      )
    }

    // Update budget
    await financialDao.updateTravelBudget(input)

    return AppResult.success(undefined)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return AppResult.failure(financialErrors, "BUDGET_UPDATE_FAILED", "Falha ao atualizar orçamento da viagem", {
      travelId: input.travelId,
      reason: errorMessage,
    })
  }
}

/**
 * Gets comprehensive financial summary for a travel
 */
export async function getFinancialSummaryService(
  financialDao: FinancialDao,
  travelDAO: TravelDAO,
  travelId: string,
  userId: string
): Promise<AppResult<FinancialSummary, typeof financialErrors>> {
  try {
    // Check user permissions
    const permissionResult = await validateFinancialAccess(travelDAO, travelId, userId)

    if (AppResult.isFailure(permissionResult)) {
      return permissionResult
    }

    // Get financial data
    const financialData = await financialDao.getTravelFinancialData(travelId)

    if (!financialData) {
      return AppResult.failure(
        financialErrors,
        "FINANCIAL_DATA_NOT_FOUND",
        "Dados financeiros não encontrados para esta viagem",
        { travelId }
      )
    }

    // Transform data into expense items
    const rawExpenseItems = transformToExpenseItems(financialData)

    // Calculate hierarchical expenses (for parent/child events)
    const expenseItems = calculateHierarchicalExpenses(rawExpenseItems)

    // Calculate total expenses
    const totalExpenses = expenseItems.reduce((sum, item) => sum + item.cost, 0)

    // Group by category with percentages
    const categories = groupExpensesByCategory(expenseItems, totalExpenses)

    // Calculate budget utilization
    let remainingBudget: number | null = null
    let budgetUtilization: number | null = null

    if (financialData.budget !== null) {
      remainingBudget = financialData.budget - totalExpenses
      budgetUtilization = financialData.budget > 0 ? (totalExpenses / financialData.budget) * 100 : 0
    }

    const summary: FinancialSummary = {
      travelId,
      budget: financialData.budget,
      totalExpenses,
      remainingBudget,
      budgetUtilization,
      categories,
    }

    return AppResult.success(summary)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return AppResult.failure(financialErrors, "EXPENSE_CALCULATION_FAILED", "Falha ao calcular despesas da viagem", {
      travelId,
      reason: errorMessage,
    })
  }
}
