import { AppResult } from "@/orpc/appResult";
import type { TravelDAO } from "../travel/travel.dao";
import type { EventDAO } from "./event.dao";
import { eventErrors } from "./event.errors";
import type {
	CreateEventInput,
	CreateEventOutput,
	UpdateEventInput,
	UpdateEventOutput,
} from "./event.model";

export async function createEventService(
	eventDAO: EventDAO,
	travelDAO: TravelDAO,
	input: CreateEventInput,
): Promise<AppResult<CreateEventOutput>> {
	const travel = await travelDAO.getTravelById(input.travelId);
	if (!travel) {
		return AppResult.failure(
			eventErrors,
			"TRAVEL_NOT_FOUND",
			"Viagem não encontrada",
			{ travelId: input.travelId },
		);
	}

	try {
		const eventId = await eventDAO.createEvent({
			title: input.title,
			startDate: input.startDate,
			endDate: input.endDate,
			estimatedCost: input.estimatedCost,
			cost: input.cost,
			type: input.type,
			location: input.location,
			travelId: input.travelId,
			parentEventId: input.parentEventId,
			imageUrl: input.imageUrl,
			imageMetadata: input.imageMetadata,
		});

		return AppResult.success({ id: eventId });
	} catch (error) {
		console.error("Error creating event:", error);
		return AppResult.failure(
			eventErrors,
			"INVALID_EVENT_DATA",
			"Erro ao criar evento",
		);
	}
}

export async function getEventService(
	eventDAO: EventDAO,
	eventId: string,
): Promise<
	AppResult<NonNullable<Awaited<ReturnType<typeof eventDAO.getEventById>>>>
> {
	const event = await eventDAO.getEventById(eventId);

	if (!event) {
		return AppResult.failure(
			eventErrors,
			"EVENT_NOT_FOUND",
			"Evento não encontrado",
			{ eventId },
		);
	}

	return AppResult.success(event);
}

export async function getEventsByTravelService(
	eventDAO: EventDAO,
	travelDAO: TravelDAO,
	travelId: string,
): Promise<
	AppResult<Awaited<ReturnType<typeof eventDAO.getEventsByTravelId>>>
> {
	// Verify travel exists
	const travel = await travelDAO.getTravelById(travelId);
	if (!travel) {
		return AppResult.failure(
			eventErrors,
			"TRAVEL_NOT_FOUND",
			"Viagem não encontrada",
			{ travelId },
		);
	}

	const events = await eventDAO.getEventsByTravelId(travelId);
	return AppResult.success(events);
}

export async function updateEventService(
	eventDAO: EventDAO,
	input: UpdateEventInput,
): Promise<AppResult<UpdateEventOutput>> {
	const existing = await eventDAO.getEventById(input.id);
	if (!existing) {
		return AppResult.failure(
			eventErrors,
			"EVENT_NOT_FOUND",
			"Evento não encontrado",
			{ eventId: input.id },
		);
	}

	try {
		await eventDAO.updateEvent(input.id, input.event);
		return AppResult.success({ success: true });
	} catch (error) {
		console.error("Error updating event:", error);
		return AppResult.failure(
			eventErrors,
			"INVALID_EVENT_DATA",
			"Erro ao atualizar evento",
			{},
		);
	}
}
