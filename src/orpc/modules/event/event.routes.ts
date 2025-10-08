import { AppResult } from "@/orpc/appResult";
import { optionalAuthProcedure, travelMemberProcedure } from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import * as z from "zod";
import { createTravelDAO } from "../travel/travel.dao";
import { createEventDAO } from "./event.dao";
import {
	CreateEventInputSchema,
	CreateEventOutputSchema,
	DeleteEventInputSchema,
	DeleteEventOutputSchema,
	UpdateEventInputSchema,
	UpdateEventOutputSchema,
} from "./event.model";
import {
	createEventService,
	deleteEventService,
	getEventService,
	getEventsByTravelService,
	updateEventService,
} from "./event.service";

/**
 * Create a new event for a travel
 */
export const createEvent = travelMemberProcedure
	.input(CreateEventInputSchema)
	.output(CreateEventOutputSchema)
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await createEventService(eventDAO, travelDAO, input);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

// Removed dynamic image endpoints (Pixabay integration)

/**
 * Get event by ID
 */
export const getEvent = optionalAuthProcedure
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);

		const result = await getEventService(eventDAO, input.id);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

/**
 * Get all events for a travel
 */
export const getEventsByTravel = optionalAuthProcedure
	.input(z.object({ travelId: z.string() }))
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);
		const travelDAO = createTravelDAO(context.db);

		const result = await getEventsByTravelService(
			eventDAO,
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

/**
 * Update an event (partial)
 */
export const updateEvent = travelMemberProcedure
	.input(UpdateEventInputSchema)
	.output(UpdateEventOutputSchema)
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);

		const result = await updateEventService(eventDAO, input);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const deleteEvent = travelMemberProcedure
	.input(DeleteEventInputSchema)
	.output(DeleteEventOutputSchema)
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);

		const result = await deleteEventService(eventDAO, input.id, input.travelId);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});
