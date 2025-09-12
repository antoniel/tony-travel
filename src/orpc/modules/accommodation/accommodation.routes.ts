import {
	AccommodationSchema,
	InsertAccommodationSchema,
} from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import { requireAuth } from "@/orpc/middleware/auth-middleware";
import { authProcedure, baseProcedure } from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import * as z from "zod";
import { createTravelDAO } from "../travel/travel.dao";
import { createAccommodationDAO } from "./accommodation.dao";
import { accommodationErrors } from "./accommodation.errors";
import {
	createAccommodationService,
	updateAccommodationService,
	suggestAccommodationDates,
} from "./accommodation.service";

export const createAccommodation = authProcedure
	.errors(accommodationErrors)
	.input(
		z.object({
			accommodation: InsertAccommodationSchema.omit({ travelId: true }),
			travelId: z.string(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			hasOverlap: z.boolean(),
			conflictingAccommodation: AccommodationSchema.nullable(),
			validationError: z.string().nullable(),
		}),
	)
	.handler(async ({ input, context }) => {
		const accommodationDAO = createAccommodationDAO(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await createAccommodationService(
			accommodationDAO,
			travelDAO,
			input.travelId,
			input.accommodation,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const getAccommodationsByTravel = baseProcedure
	.errors(accommodationErrors)
	.input(z.object({ travelId: z.string() }))
	.output(z.array(AccommodationSchema))
	.handler(async ({ input, context }) => {
		const accommodationDAO = createAccommodationDAO(context.db);
		return await accommodationDAO.getAccommodationsByTravel(input.travelId);
	});

export const getAccommodation = baseProcedure
	.input(z.object({ id: z.string() }))
	.output(AccommodationSchema.nullable())
	.handler(async ({ input, context }) => {
		const accommodationDAO = createAccommodationDAO(context.db);
		return await accommodationDAO.getAccommodationById(input.id);
	});

export const updateAccommodation = authProcedure
	.use(requireAuth)
	.input(
		z.object({
			id: z.string(),
			accommodation: InsertAccommodationSchema.partial().omit({
				travelId: true,
			}),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			hasOverlap: z.boolean(),
			conflictingAccommodation: AccommodationSchema.nullable(),
			validationError: z.string().nullable(),
		}),
	)
	.handler(async ({ input, context }) => {
		const accommodationDAO = createAccommodationDAO(context.db);

		const result = await updateAccommodationService(
			accommodationDAO,
			input.id,
			input.accommodation,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const deleteAccommodation = authProcedure
	.use(requireAuth)
	.input(z.object({ id: z.string() }))
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const accommodationDAO = createAccommodationDAO(context.db);
		await accommodationDAO.deleteAccommodation(input.id);
		return { success: true };
	});

export const getSuggestedAccommodationDates = authProcedure
	.use(requireAuth)
	.input(z.object({ travelId: z.string() }))
	.output(
		z
			.object({
				startDate: z.date(),
				endDate: z.date(),
			})
			.nullable(),
	)
	.handler(async ({ input, context }) => {
		const accommodationDAO = createAccommodationDAO(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await suggestAccommodationDates(
			accommodationDAO,
			travelDAO,
			input.travelId,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});
