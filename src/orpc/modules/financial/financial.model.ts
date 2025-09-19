import { z } from "zod";

// Input DTOs
export const UpdateTravelBudgetSchema = z.object({
	travelId: z.string(),
	budget: z.number().positive("Budget must be positive"),
});

export const GetFinancialSummarySchema = z.object({
	travelId: z.string(),
});

// Output DTOs
export const FinancialModeSummarySchema = z.object({
	budget: z.number().nullable(),
	totalExpenses: z.number(),
	remainingBudget: z.number().nullable(),
	budgetUtilization: z.number().nullable(),
});

export const ExpenseCategorySchema = z.object({
	category: z.enum(["passagens", "acomodacoes", "atracoes"]),
	total: z.number(),
	percentage: z.number(),
	items: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			cost: z.number(),
			parentId: z.string().nullable().optional(),
		}),
	),
});

export const FinancialSummarySchema = z.object({
	travelId: z.string(),
	participantsCount: z.number().int().nonnegative(),
	budgetPerPerson: z.number().nullable(),
	perPerson: FinancialModeSummarySchema,
	group: FinancialModeSummarySchema,
	categories: z.array(ExpenseCategorySchema),
});

// Type exports
export type UpdateTravelBudgetInput = z.infer<typeof UpdateTravelBudgetSchema>;
export type GetFinancialSummaryInput = z.infer<
	typeof GetFinancialSummarySchema
>;
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type FinancialModeSummary = z.infer<typeof FinancialModeSummarySchema>;
export type FinancialSummary = z.infer<typeof FinancialSummarySchema>;

// Internal DAO types
export interface ExpenseItem {
	id: string;
	name: string;
	cost: number;
	category: "passagens" | "acomodacoes" | "atracoes";
	parentId?: string | null;
}

export interface TravelFinancialData {
	id: string;
	budget: number | null;
	participantsCount: number;
	accommodations: Array<{
		id: string;
		name: string;
		price: number;
	}>;
	flights: Array<{
		id: string;
		airline: string; // formatted as "origin → destination"
		cost: number;
		participantCount: number;
	}>;
	events: Array<{
		id: string;
		name: string;
		cost: number; // explicit cost when provided
		estimatedCost: number; // fallback when cost is not provided
		parentEventId: string | null;
	}>;
}
