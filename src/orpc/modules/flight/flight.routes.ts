import { FlightSchema, InsertFlightSchema } from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import { requireAuth } from "@/orpc/middleware/auth-middleware";
import {
	authProcedure,
	baseProcedure,
	travelMemberProcedure,
} from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import * as z from "zod";
import { createTravelDAO } from "../travel/travel.dao";
import { createFlightDAO } from "./flight.dao";
import { flightErrors } from "./flight.errors";
import {
	CreateFlightWithParticipantsSchema,
	DuplicateFlightResultSchema,
	FlightGroupSchema,
} from "./flight.model";
import {
	addFlightParticipantService,
	checkDuplicateFlightService,
	createFlightService,
	deleteFlightService,
	getFlightService,
	getFlightsByTravelService,
	removeFlightParticipantService,
	updateFlightService,
} from "./flight.service";

// Create flight with smart duplicate detection
export const createFlight = travelMemberProcedure
	.errors(flightErrors)
	.input(
		CreateFlightWithParticipantsSchema.extend({
			travelId: z.string(),
		}),
	)
	.output(
		z.object({
			id: z.string(),
			isDuplicate: z.boolean(),
			existingFlightId: z.string().nullable(),
		}),
	)
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await createFlightService(flightDAO, travelDAO, input);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const getFlightsByTravel = baseProcedure
	.errors(flightErrors)
	.input(z.object({ travelId: z.string() }))
	.output(z.array(FlightGroupSchema))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await getFlightsByTravelService(flightDAO, input.travelId);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const getFlight = baseProcedure
	.errors(flightErrors)
	.input(z.object({ id: z.string() }))
	.output(
		FlightSchema.extend({
			participants: z.array(
				z.object({
					id: z.string(),
					user: z.object({
						id: z.string(),
						name: z.string(),
						email: z.string(),
						image: z.string().nullable().optional(),
					}),
				}),
			),
		}).nullable(),
	)
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await getFlightService(flightDAO, input.id);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

// Update flight
export const updateFlight = authProcedure
	.use(requireAuth)
	.errors(flightErrors)
	.input(
		z.object({
			id: z.string(),
			flight: InsertFlightSchema.partial(),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await updateFlightService(flightDAO, input.id, input.flight);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

// Delete flight
export const deleteFlight = authProcedure
	.use(requireAuth)
	.errors(flightErrors)
	.input(z.object({ id: z.string() }))
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await deleteFlightService(flightDAO, input.id);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

// Add participant to flight
export const addFlightParticipant = authProcedure
	.use(requireAuth)
	.errors(flightErrors)
	.input(
		z.object({
			flightId: z.string(),
			userId: z.string(),
		}),
	)
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await addFlightParticipantService(
			flightDAO,
			input.flightId,
			input.userId,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

// Remove participant from flight
export const removeFlightParticipant = authProcedure
	.use(requireAuth)
	.errors(flightErrors)
	.input(
		z.object({
			flightId: z.string(),
			userId: z.string(),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await removeFlightParticipantService(
			flightDAO,
			input.flightId,
			input.userId,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

// Check for duplicate flight without creating
export const checkDuplicateFlight = authProcedure
	.use(requireAuth)
	.errors(flightErrors)
	.input(
		z.object({
			travelId: z.string(),
			originAirport: z.string(),
			destinationAirport: z.string(),
			cost: z.number().optional(),
		}),
	)
	.output(DuplicateFlightResultSchema)
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);

		const result = await checkDuplicateFlightService(
			flightDAO,
			input.travelId,
			input.originAirport,
			input.destinationAirport,
			input.cost,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});
