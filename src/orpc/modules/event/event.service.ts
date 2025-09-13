import { pixabayService } from "@/lib/services/pixabay";
import { AppResult } from "@/orpc/appResult";
import type { TravelDAO } from "../travel/travel.dao";
import type { EventDAO } from "./event.dao";
import { eventErrors } from "./event.errors";
import type {
	CreateEventInput,
	CreateEventOutput,
	FetchActivityImageInput,
	FetchActivityImageOutput,
	UpdateEventImageInput,
	UpdateEventImageOutput,
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

export async function fetchActivityImageService(
	eventDAO: EventDAO,
	input: FetchActivityImageInput,
): Promise<AppResult<FetchActivityImageOutput>> {
	// Verify event exists if eventId is provided
	if (input.eventId) {
		const event = await eventDAO.getEventById(input.eventId);
		if (!event) {
			return AppResult.failure(
				eventErrors,
				"EVENT_NOT_FOUND",
				"Evento não encontrado",
				{ eventId: input.eventId },
			);
		}
	}

	try {
		const image = await pixabayService.searchActivityImage(
			input.title,
			input.location,
		);

		if (!image) {
			return AppResult.success({
				success: false,
				error: "No suitable image found",
				imageUrl: null,
				metadata: null,
			});
		}

		const metadata = pixabayService.createImageMetadata(image);

		// Update event image if eventId is provided
		if (input.eventId) {
			await eventDAO.updateEventImage(
				input.eventId,
				image.webformatURL,
				metadata,
			);
		}

		return AppResult.success({
			success: true,
			imageUrl: image.webformatURL,
			metadata,
			imageSizes: pixabayService.getImageSizes(image),
		});
	} catch (error) {
		console.error("Error fetching activity image:", error);
		return AppResult.failure(
			eventErrors,
			"IMAGE_FETCH_FAILED",
			"Falha ao buscar imagem da atividade",
			{ title: input.title, location: input.location },
		);
	}
}

export async function updateEventImageService(
	eventDAO: EventDAO,
	input: UpdateEventImageInput,
): Promise<AppResult<UpdateEventImageOutput>> {
	// Verify event exists
	const event = await eventDAO.getEventById(input.eventId);
	if (!event) {
		return AppResult.failure(
			eventErrors,
			"EVENT_NOT_FOUND",
			"Evento não encontrado",
			{ eventId: input.eventId },
		);
	}

	try {
		await eventDAO.updateEventImage(
			input.eventId,
			input.imageUrl,
			input.metadata,
		);

		return AppResult.success({ success: true });
	} catch (error) {
		console.error("Error updating event image:", error);
		return AppResult.failure(
			eventErrors,
			"IMAGE_UPDATE_FAILED",
			"Erro ao atualizar imagem do evento",
			{ eventId: input.eventId },
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
