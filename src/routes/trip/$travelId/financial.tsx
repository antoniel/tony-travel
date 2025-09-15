import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { formatCurrencyBRL, formatNumberPtBR, maskCurrencyInputPtBR } from "@/lib/currency"
import { Separator } from "@/components/ui/separator"
// removed unused types
import { orpc } from "@/orpc/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
	BarChart3,
	Calculator,
	ChevronDown,
	ChevronRight,
    DollarSign,
	Home,
	MapPin,
	Plane,
	TrendingUp,
    Wallet,
  } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

export const Route = createFileRoute("/trip/$travelId/financial")({
	component: FinancialPage,
})

const BudgetUpdateSchema = z.object({
	budget: z.number().min(0, "O orçamento deve ser maior que zero"),
})

type BudgetUpdateFormData = z.infer<typeof BudgetUpdateSchema>

interface FinancialData {
	totalBudget: number
	actualSpending: number
	flightCosts: number
	accommodationCosts: number
	activityCosts: number
	activities: Array<{
		id: string
		title: string
		cost: number
		percentage: number
		dependencies?: Array<{
			id: string
			title: string
			cost: number
		}>
	}>
}

function BudgetSection({ 
	financialData, 
	canWrite,
	onBudgetUpdate 
}: { 
	financialData: FinancialData
	canWrite: boolean
	onBudgetUpdate: (budget: number) => void
}) {
	const [isEditing, setIsEditing] = useState(false)
	const budgetUtilization = financialData.totalBudget > 0 
		? (financialData.actualSpending / financialData.totalBudget) * 100 
		: 0

	const form = useForm<BudgetUpdateFormData>({
		resolver: zodResolver(BudgetUpdateSchema),
		defaultValues: {
			budget: financialData.totalBudget,
		},
	})

	const onSubmit = (data: BudgetUpdateFormData) => {
		onBudgetUpdate(data.budget)
		setIsEditing(false)
		toast.success("Orçamento atualizado com sucesso!")
	}

    // currency formatting handled by shared util when needed

	const getUtilizationColor = (percentage: number) => {
		if (percentage <= 50) return "bg-green-500"
		if (percentage <= 80) return "bg-yellow-500"
		return "bg-red-500"
	}

	const getUtilizationStatus = (percentage: number) => {
		if (percentage <= 50) return { text: "Excelente", color: "text-green-600" }
		if (percentage <= 80) return { text: "Atenção", color: "text-yellow-600" }
		return { text: "Limite", color: "text-red-600" }
	}

	const status = getUtilizationStatus(budgetUtilization)

	return (
		<Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-primary/10">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
							<Wallet className="w-6 h-6 text-primary" />
						</div>
						<div>
							<CardTitle className="text-xl">Controle Orçamentário</CardTitle>
							<p className="text-sm text-muted-foreground">
								Gerencie e acompanhe seus gastos de viagem
							</p>
						</div>
					</div>
					{canWrite && !isEditing && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsEditing(true)}
							className="gap-2"
						>
							<Calculator className="w-4 h-4" />
							Editar Orçamento
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{isEditing ? (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
        control={form.control}
        name="budget"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Orçamento Total</FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-8"
                  value={typeof field.value === "number" ? formatNumberPtBR(field.value) : ""}
                  onChange={(e) => {
                    const { numeric } = maskCurrencyInputPtBR(e.target.value)
                    field.onChange(numeric ?? 0)
                  }}
                />
              </div>
            </FormControl>
            <FormDescription>
              Defina o orçamento total disponível para esta viagem
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
							<div className="flex gap-2 justify-end">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsEditing(false)}
								>
									Cancelar
								</Button>
								<Button type="submit" size="sm">
									Salvar
								</Button>
							</div>
						</form>
					</Form>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="text-2xl font-bold text-primary">
                {formatCurrencyBRL(financialData.totalBudget)}
              </div>
              <div className="text-sm text-muted-foreground">Orçamento Total</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="text-2xl font-bold">
                {formatCurrencyBRL(financialData.actualSpending)}
              </div>
              <div className="text-sm text-muted-foreground">Gasto Atual</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <div className="text-2xl font-bold">
                {formatCurrencyBRL(financialData.totalBudget - financialData.actualSpending)}
              </div>
              <div className="text-sm text-muted-foreground">Restante</div>
            </div>
						</div>

						{financialData.totalBudget > 0 && (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Utilização do Orçamento</span>
									<div className="flex items-center gap-2">
										<Badge 
											variant="secondary" 
											className={`${status.color} border-current/20`}
										>
											{status.text}
										</Badge>
										<span className="text-sm font-medium">
											{budgetUtilization.toFixed(1)}%
										</span>
									</div>
								</div>
								<Progress 
									value={Math.min(budgetUtilization, 100)} 
									className="h-3"
									indicatorClassName={getUtilizationColor(budgetUtilization)}
								/>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function ExpenseBreakdown({ financialData }: { financialData: FinancialData }) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(amount)
	}

	const getPercentage = (amount: number) => {
		return financialData.actualSpending > 0 
			? ((amount / financialData.actualSpending) * 100).toFixed(1)
			: "0"
	}

	const expenses = [
		{
			title: "Passagens",
			amount: financialData.flightCosts,
			icon: Plane,
			color: "text-blue-600",
			bg: "bg-blue-50",
			border: "border-blue-200",
		},
		{
			title: "Acomodações",
			amount: financialData.accommodationCosts,
			icon: Home,
			color: "text-green-600",
			bg: "bg-green-50",
			border: "border-green-200",
		},
		{
			title: "Atrações",
			amount: financialData.activityCosts,
			icon: MapPin,
			color: "text-purple-600",
			bg: "bg-purple-50",
			border: "border-purple-200",
		},
	]

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<BarChart3 className="w-6 h-6 text-primary" />
				<div>
					<h2 className="text-xl font-semibold">Resumo de Gastos</h2>
					<p className="text-sm text-muted-foreground">
						Breakdown detalhado por categoria
					</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{expenses.map((expense) => {
					const Icon = expense.icon
					return (
						<Card 
							key={expense.title}
							className={`border-2 ${expense.border} ${expense.bg}/30 hover:shadow-lg transition-all duration-200`}
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className={`w-10 h-10 ${expense.bg} rounded-full flex items-center justify-center`}>
											<Icon className={`w-5 h-5 ${expense.color}`} />
										</div>
										<div>
											<CardTitle className="text-base">{expense.title}</CardTitle>
											<p className="text-xs text-muted-foreground">
												{getPercentage(expense.amount)}% do total
											</p>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{formatCurrency(expense.amount)}
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

function AttractionsTree({ financialData }: { financialData: FinancialData }) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

	const toggleExpanded = (itemId: string) => {
		const newExpanded = new Set(expandedItems)
		if (newExpanded.has(itemId)) {
			newExpanded.delete(itemId)
		} else {
			newExpanded.add(itemId)
		}
		setExpandedItems(newExpanded)
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(amount)
	}

	if (financialData.activities.length === 0) {
		return (
			<Card className="border-2 border-dashed">
				<CardContent className="text-center py-12">
					<div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center mb-4">
						<MapPin className="w-8 h-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold mb-2">Nenhuma atração cadastrada</h3>
					<p className="text-muted-foreground">
						Adicione eventos e atividades para ver o breakdown de custos aqui
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<TrendingUp className="w-6 h-6 text-primary" />
				<div>
					<h2 className="text-xl font-semibold">Detalhamento de Atrações</h2>
					<p className="text-sm text-muted-foreground">
						Custos organizados por atividade principal
					</p>
				</div>
			</div>

			<div className="space-y-3">
				{financialData.activities.map((activity) => {
					const isExpanded = expandedItems.has(activity.id)
					const hasDependencies = activity.dependencies && activity.dependencies.length > 0

					return (
						<Card key={activity.id} className="overflow-hidden">
							<CardHeader 
								className={`pb-3 ${hasDependencies ? 'cursor-pointer hover:bg-muted/30' : ''}`}
								onClick={hasDependencies ? () => toggleExpanded(activity.id) : undefined}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										{hasDependencies && (
											<div className="text-muted-foreground">
												{isExpanded ? (
													<ChevronDown className="w-4 h-4" />
												) : (
													<ChevronRight className="w-4 h-4" />
												)}
											</div>
										)}
										<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
											<MapPin className="w-5 h-5 text-primary" />
										</div>
										<div className="flex-1">
											<CardTitle className="text-base">{activity.title}</CardTitle>
											<div className="flex items-center gap-2 mt-1">
												<Badge variant="outline" className="text-xs">
													{activity.percentage.toFixed(1)}% do total
												</Badge>
												{hasDependencies && (
													<Badge variant="secondary" className="text-xs">
														{activity.dependencies?.length} item{activity.dependencies?.length !== 1 ? 's' : ''} relacionado{activity.dependencies?.length !== 1 ? 's' : ''}
													</Badge>
												)}
											</div>
										</div>
									</div>
									<div className="text-right">
										<div className="text-lg font-bold">
											{formatCurrency(activity.cost)}
										</div>
									</div>
								</div>
							</CardHeader>

							{isExpanded && hasDependencies && (
								<CardContent className="pt-0">
									<div className="pl-7 space-y-2 border-l-2 border-primary/20">
										{activity.dependencies?.map((dependency) => (
											<div 
												key={dependency.id}
												className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
											>
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
														<MapPin className="w-4 h-4 text-muted-foreground" />
													</div>
													<span className="text-sm font-medium">{dependency.title}</span>
												</div>
												<span className="text-sm font-medium">
													{formatCurrency(dependency.cost)}
												</span>
											</div>
										))}
									</div>
								</CardContent>
							)}
						</Card>
					)
				})}
			</div>
		</div>
	)
}

function FinancialPage() {
	const { travelId } = Route.useParams()

	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } })
	)

	const accommodationsQuery = useQuery(
		orpc.accommodationRoutes.getAccommodationsByTravel.queryOptions({
			input: { travelId },
		})
	)

	const flightsQuery = useQuery(
		orpc.flightRoutes.getFlightsByTravel.queryOptions({
			input: { travelId },
		})
	)

	const eventsQuery = useQuery(
		orpc.eventRoutes.getEventsByTravel.queryOptions({
			input: { travelId },
		})
	)

	const isLoading = 
		travelQuery.isLoading || 
		accommodationsQuery.isLoading || 
		flightsQuery.isLoading || 
		eventsQuery.isLoading

	if (isLoading) {
		return (
			<div className="space-y-8">
				<div className="space-y-2">
					<div className="h-8 w-64 bg-muted animate-pulse rounded" />
					<div className="h-4 w-96 bg-muted animate-pulse rounded" />
				</div>
				<div className="space-y-6">
					<div className="h-48 bg-muted animate-pulse rounded-lg" />
					<div className="grid gap-4 md:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
						))}
					</div>
					<div className="h-64 bg-muted animate-pulse rounded-lg" />
				</div>
			</div>
		)
	}

	const travel = travelQuery.data
	const accommodations = accommodationsQuery.data || []
	const flights = flightsQuery.data || []
	const events = eventsQuery.data || []

	// Calculate financial data from existing records
	const flightCosts = flights.reduce((sum, flight) => sum + (flight.cost || 0), 0)
	const accommodationCosts = accommodations.reduce((sum, acc) => sum + (acc.price || 0), 0)
	
	// Group events by parent-child relationship for activities breakdown
	const parentEvents = events.filter(event => !event.parentEventId)
	const childEvents = events.filter(event => event.parentEventId)
	
	const activities = parentEvents.map(event => {
		const dependencies = childEvents.filter(child => child.parentEventId === event.id)
		const mainCost = event.estimatedCost || 0
		const dependencyCosts = dependencies.reduce((sum, dep) => sum + (dep.estimatedCost || 0), 0)
		const totalCost = mainCost + dependencyCosts
		
		return {
			id: event.id,
			title: event.title,
			cost: totalCost,
			percentage: 0, // Will be calculated after we have total
			dependencies: dependencies.length > 0 ? dependencies.map(dep => ({
				id: dep.id,
				title: dep.title,
				cost: dep.estimatedCost || 0,
			})) : undefined,
		}
	})

	const activityCosts = activities.reduce((sum, activity) => sum + activity.cost, 0)
	const actualSpending = flightCosts + accommodationCosts + activityCosts

	// Calculate percentages
	activities.forEach(activity => {
		activity.percentage = activityCosts > 0 ? (activity.cost / activityCosts) * 100 : 0
	})

	// For now, use a default budget since there's no budget field in the schema yet
	// This will be replaced when the financial backend is properly integrated
	const totalBudget = 10000 // Default budget - will come from backend

	const financialData: FinancialData = {
		totalBudget,
		actualSpending,
		flightCosts,
		accommodationCosts,
		activityCosts,
		activities,
	}

	const canWrite = !!travel?.userMembership

	const handleBudgetUpdate = (budget: number) => {
		// This will be implemented when the financial backend is available
		// For now, just show a success message
		console.log("Budget update:", budget)
		// TODO: Implement actual budget update via financial backend
	}

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					<DollarSign className="w-8 h-8 text-primary" />
					Controle Financeiro
				</h1>
				<p className="text-lg text-muted-foreground">
					Gerencie o orçamento e acompanhe os gastos da sua viagem
				</p>
			</div>

			<BudgetSection 
				financialData={financialData}
				canWrite={canWrite}
				onBudgetUpdate={handleBudgetUpdate}
			/>

			<Separator />

			<ExpenseBreakdown financialData={financialData} />

			<Separator />

			<AttractionsTree financialData={financialData} />
		</div>
	)
}
