import { AppResult } from "@/orpc/appResult";
import { authProcedure } from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import * as z from "zod";
import { createTravelDAO } from "../travel/travel.dao";
import { FinancialDao } from "./financial.dao";
import { financialErrors } from "./financial.errors";
import {
	FinancialSummarySchema,
	GetFinancialSummarySchema,
	UpdateTravelBudgetSchema,
} from "./financial.model";
import {
	getFinancialSummaryService,
	updateTravelBudgetService,
} from "./financial.service";

/**
 * Get comprehensive financial summary for a travel
 */
export const getFinancialSummary = authProcedure
	.errors(financialErrors)
	.input(GetFinancialSummarySchema)
	.output(FinancialSummarySchema)
	.handler(async ({ input, context }) => {
		const financialDao = new FinancialDao(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await getFinancialSummaryService(
			financialDao,
			travelDAO,
			input.travelId,
			context.user.id,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

/**
 * Update travel budget (owner only)
 */
export const updateTravelBudget = authProcedure
	.errors(financialErrors)
	.input(UpdateTravelBudgetSchema)
	.output(z.void())
	.handler(async ({ input, context }) => {
		const financialDao = new FinancialDao(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await updateTravelBudgetService(
			financialDao,
			travelDAO,
			context.user.id,
			input,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});
