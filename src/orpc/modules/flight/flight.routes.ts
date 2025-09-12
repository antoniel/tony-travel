import { FlightSchema, InsertFlightSchema } from "@/lib/db/schema";
import { requireAuth } from "@/orpc/middleware/auth-middleware";
import { authProcedure, baseProcedure } from "@/orpc/procedure";
import * as z from "zod";
import { createFlightDAO } from "./flight.dao";
import {
	CreateFlightWithParticipantsSchema,
	DuplicateFlightResultSchema,
	FlightGroupSchema,
	type FlightWithParticipants,
} from "./flight.model";

// Create flight with smart duplicate detection
export const createFlight = authProcedure
	.use(requireAuth)
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
		// Check for duplicate flight
		const existingFlightId = await flightDAO.findDuplicateFlight(
			input.travelId,
			input.flight.originAirport,
			input.flight.destinationAirport,
			input.flight.cost || undefined,
		);

		// If duplicate found, add participants to existing flight
		if (existingFlightId) {
			// Add new participants to existing flight
			for (const userId of input.participantIds) {
				await flightDAO.addFlightParticipant(existingFlightId, userId);
			}

			return {
				id: existingFlightId,
				isDuplicate: true,
				existingFlightId,
			};
		}

		// Create new flight
		const flightData = {
			...input.flight,
			travelId: input.travelId,
		};
		const flightId = await flightDAO.createFlight(flightData);

		// Add participants to new flight
		for (const userId of input.participantIds) {
			await flightDAO.addFlightParticipant(flightId, userId);
		}

		return {
			id: flightId,
			isDuplicate: false,
			existingFlightId: null,
		};
	});

export const getFlightsByTravel = baseProcedure
	.input(z.object({ travelId: z.string() }))
	.output(z.array(FlightGroupSchema))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);
		const flights = await flightDAO.getFlightsByTravel(input.travelId);

		const grouped = flights.reduce(
			(acc, flight) => {
				const existing = acc.find(
					(g) => g.originAirport === flight.originAirport,
				);

				if (existing) {
					existing.flights.push(flight);
				} else {
					acc.push({
						originAirport: flight.originAirport,
						flights: [flight],
					});
				}

				return acc;
			},
			[] as Array<{ originAirport: string; flights: FlightWithParticipants[] }>,
		);

		return grouped;
	});

export const getFlight = baseProcedure
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
		const flight = await flightDAO.getFlightById(input.id);
		return flight || null;
	});

// Update flight
export const updateFlight = authProcedure
	.use(requireAuth)
	.input(
		z.object({
			id: z.string(),
			flight: InsertFlightSchema.partial(),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);
		await flightDAO.updateFlight(input.id, input.flight);
		return { success: true };
	});

// Delete flight
export const deleteFlight = authProcedure
	.use(requireAuth)
	.input(z.object({ id: z.string() }))
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);
		await flightDAO.deleteFlight(input.id);
		return { success: true };
	});

// Add participant to flight
export const addFlightParticipant = authProcedure
	.use(requireAuth)
	.input(
		z.object({
			flightId: z.string(),
			userId: z.string(),
		}),
	)
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);
		const id = await flightDAO.addFlightParticipant(
			input.flightId,
			input.userId,
		);
		return { id };
	});

// Remove participant from flight
export const removeFlightParticipant = authProcedure
	.use(requireAuth)
	.input(
		z.object({
			flightId: z.string(),
			userId: z.string(),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const flightDAO = createFlightDAO(context.db);
		await flightDAO.removeFlightParticipant(input.flightId, input.userId);
		return { success: true };
	});

// Check for duplicate flight without creating
export const checkDuplicateFlight = authProcedure
	.use(requireAuth)
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
		const existingFlightId = await flightDAO.findDuplicateFlight(
			input.travelId,
			input.originAirport,
			input.destinationAirport,
			input.cost,
		);

		return {
			isDuplicate: !!existingFlightId,
			existingFlightId: existingFlightId || null,
			message: existingFlightId
				? "Um voo com essas características já existe. Deseja adicionar participantes ao voo existente?"
				: undefined,
		};
	});
