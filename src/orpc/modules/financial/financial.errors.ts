import type { ErrorType } from "@/orpc/appResult";
import * as z from "zod";

export type financialErrors = typeof financialErrors;
export const financialErrors = {
	FINANCIAL_DATA_NOT_FOUND: {
		message: "Nenhuma informação financeira encontrada para a viagem",
		data: z.object({
			travelId: z.string(),
		}),
	},
	BUDGET_UPDATE_FAILED: {
		message: "Não foi possível atualizar o orçamento da viagem",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	INVALID_BUDGET_AMOUNT: {
		message: "O valor do orçamento deve ser positivo",
		data: z.object({
			travelId: z.string(),
			providedAmount: z.number(),
		}),
	},
	EXPENSE_CALCULATION_FAILED: {
		message: "Não foi possível calcular os gastos",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	USER_NOT_AUTHORIZED: {
		message: "Usuário sem autorização para acessar os dados financeiros",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
} satisfies ErrorType;

/**
 * Type helper to extract financial error types
 */
export type FinancialErrorTypes = keyof typeof financialErrors;
