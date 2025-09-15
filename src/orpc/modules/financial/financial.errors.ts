import * as z from "zod";

export type financialErrors = typeof financialErrors;
export const financialErrors = {
	FINANCIAL_DATA_NOT_FOUND: {
		message: "Financial data not found for travel",
		data: z.object({
			travelId: z.string(),
		}),
	},
	BUDGET_UPDATE_FAILED: {
		message: "Failed to update travel budget",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	INVALID_BUDGET_AMOUNT: {
		message: "Budget amount must be positive",
		data: z.object({
			travelId: z.string(),
			providedAmount: z.number(),
		}),
	},
	EXPENSE_CALCULATION_FAILED: {
		message: "Failed to calculate expenses",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	USER_NOT_AUTHORIZED: {
		message: "User not authorized to access financial data",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
} as const;

/**
 * Type helper to extract financial error types
 */
export type FinancialErrorTypes = keyof typeof financialErrors;