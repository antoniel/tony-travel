import { AppResult } from "@/orpc/appResult";
import { optionalAuthProcedure, travelMemberProcedure } from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import * as z from "zod";
import { createTravelDAO } from "../travel/travel.dao";
import { createEventDAO } from "./event.dao";
import {
	CreateEventInputSchema,
	CreateEventOutputSchema,
	FetchActivityImageInputSchema,
	FetchActivityImageOutputSchema,
	UpdateEventImageInputSchema,
	UpdateEventImageOutputSchema,
} from "./event.model";
import {
	createEventService,
	fetchActivityImageService,
	getEventService,
	getEventsByTravelService,
	updateEventImageService,
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

/**
 * Fetch activity image for an event
 */
export const fetchActivityImage = optionalAuthProcedure
	.input(FetchActivityImageInputSchema)
	.output(FetchActivityImageOutputSchema)
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);

		const result = await fetchActivityImageService(eventDAO, input);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

/**
 * Update event image
 */
export const updateEventImage = optionalAuthProcedure
	.input(UpdateEventImageInputSchema)
	.output(UpdateEventImageOutputSchema)
	.handler(async ({ input, context }) => {
		const eventDAO = createEventDAO(context.db);

		const result = await updateEventImageService(eventDAO, input);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

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
