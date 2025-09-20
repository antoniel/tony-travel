import type { InsertFlight } from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import type * as z from "zod";
import type { TravelDAO } from "../travel/travel.dao";
import type { FlightDAO } from "./flight.dao";
import { flightErrors } from "./flight.errors";
import type {
	CreateFlightWithParticipantsSchema,
	FlightGroup,
	FlightWithParticipants,
	UpdateFlightWithParticipantsSchema,
	UpsertFlightPayload,
} from "./flight.model";

/**
 * Create flight with smart duplicate detection and participant management
 */
export async function createFlightService(
	flightDAO: FlightDAO,
	travelDAO: TravelDAO,
	input: z.infer<typeof CreateFlightWithParticipantsSchema> & {
		travelId: string;
	},
): Promise<
	AppResult<{
		id: string;
		isDuplicate: boolean;
		existingFlightId: string | null;
	}>
> {
	// Verify travel exists
	const travel = await travelDAO.getTravelById(input.travelId);
	if (!travel) {
		return AppResult.failure(
			flightErrors,
			"TRAVEL_NOT_FOUND",
			"Viagem não encontrada",
			{ travelId: input.travelId },
		);
	}

	const summary = getFlightSummary(input.flight);

	// Check for duplicate flight
	const existingFlightId = await flightDAO.findDuplicateFlight(
		input.travelId,
		summary.originAirport,
		summary.destinationAirport,
		input.flight.totalAmount ?? undefined,
	);

	// If duplicate found, add participants to existing flight
	if (existingFlightId) {
		// Add new participants to existing flight
		const participantIds = input.participantIds || [];
		for (const userId of participantIds) {
			await flightDAO.addFlightParticipant(existingFlightId, userId);
		}

		return AppResult.success({
			id: existingFlightId,
			isDuplicate: true,
			existingFlightId,
		});
	}

	// Create new flight
	const flightData: InsertFlight = {
		originAirport: summary.originAirport,
		destinationAirport: summary.destinationAirport,
		departureDate: summary.departureDate,
		departureTime: summary.departureTime,
		arrivalDate: summary.arrivalDate,
		arrivalTime: summary.arrivalTime,
		cost: input.flight.totalAmount ?? null,
		totalAmount: input.flight.totalAmount ?? null,
		currency: input.flight.currency ?? "BRL",
		baseAmount: input.flight.baseAmount ?? null,
		taxAmount: input.flight.taxAmount ?? null,
		provider: input.flight.provider ?? null,
		offerReference: input.flight.offerReference ?? null,
		dataSource: input.flight.dataSource ?? null,
		metadata: input.flight.metadata ?? null,
		legacyMigratedAt: null,
		travelId: input.travelId,
	};
	const flightId = await flightDAO.createFlight(flightData, input.flight.slices);

	// Add participants to new flight
	const participantIds = input.participantIds || [];
	for (const userId of participantIds) {
		await flightDAO.addFlightParticipant(flightId, userId);
	}

	return AppResult.success({
		id: flightId,
		isDuplicate: false,
		existingFlightId: null,
	});
}

/**
 * Get flights grouped by origin airport for a travel
 */
export async function getFlightsByTravelService(
	flightDAO: FlightDAO,
	travelId: string,
): Promise<AppResult<FlightGroup[]>> {
	const flights = await flightDAO.getFlightsByTravel(travelId);

	const grouped = flights.reduce((acc, flight) => {
		const originAirport =
			flight.slices[0]?.segments[0]?.originAirport ?? flight.originAirport;
		const existing = acc.find((g) => g.originAirport === originAirport);

		if (existing) {
			existing.flights.push(flight);
		} else {
			acc.push({
				originAirport,
				flights: [flight],
			});
		}

		return acc;
	}, [] as FlightGroup[]);

	return AppResult.success(grouped);
}

/**
 * Get flight by ID with participants
 */
export async function getFlightService(
	flightDAO: FlightDAO,
	flightId: string,
): Promise<AppResult<FlightWithParticipants | null>> {
	const flight = await flightDAO.getFlightById(flightId);
	return AppResult.success(flight || null);
}

/**
 * Update flight with validation
 */
export async function updateFlightService(
	flightDAO: FlightDAO,
	input: z.infer<typeof UpdateFlightWithParticipantsSchema>,
): Promise<AppResult<{ success: boolean }>> {
	// Verify flight exists
	const existingFlight = await flightDAO.getFlightById(input.id);
	if (!existingFlight) {
		return AppResult.failure(
			flightErrors,
			"FLIGHT_NOT_FOUND",
			"Voo não encontrado",
			{ flightId: input.id },
		);
	}

	const summary = getFlightSummary(input.flight);
	const updatePayload: Partial<InsertFlight> = {
		originAirport: summary.originAirport,
		destinationAirport: summary.destinationAirport,
		departureDate: summary.departureDate,
		departureTime: summary.departureTime,
		arrivalDate: summary.arrivalDate,
		arrivalTime: summary.arrivalTime,
		cost: input.flight.totalAmount ?? null,
		totalAmount: input.flight.totalAmount ?? null,
		currency: input.flight.currency ?? "BRL",
		baseAmount: input.flight.baseAmount ?? null,
		taxAmount: input.flight.taxAmount ?? null,
		provider: input.flight.provider ?? null,
		offerReference: input.flight.offerReference ?? null,
		dataSource: input.flight.dataSource ?? null,
		metadata: input.flight.metadata ?? null,
		legacyMigratedAt: existingFlight.legacyMigratedAt ?? null,
	};

	await flightDAO.updateFlight(input.id, updatePayload, input.flight.slices);
	return AppResult.success({ success: true });
}

/**
 * Delete flight with validation
 */
export async function deleteFlightService(
	flightDAO: FlightDAO,
	flightId: string,
): Promise<AppResult<{ success: boolean }>> {
	// Verify flight exists
	const existingFlight = await flightDAO.getFlightById(flightId);
	if (!existingFlight) {
		return AppResult.failure(
			flightErrors,
			"FLIGHT_NOT_FOUND",
			"Voo não encontrado",
			{ flightId },
		);
	}

	await flightDAO.deleteFlight(flightId);
	return AppResult.success({ success: true });
}

/**
 * Add participant to flight with validation
 */
export async function addFlightParticipantService(
	flightDAO: FlightDAO,
	flightId: string,
	userId: string,
): Promise<AppResult<{ id: string }>> {
	// Verify flight exists
	const existingFlight = await flightDAO.getFlightById(flightId);
	if (!existingFlight) {
		return AppResult.failure(
			flightErrors,
			"FLIGHT_NOT_FOUND",
			"Voo não encontrado",
			{ flightId },
		);
	}

	// Add participant (DAO handles duplicate check)
	const participantId = await flightDAO.addFlightParticipant(flightId, userId);
	return AppResult.success({ id: participantId });
}

/**
 * Remove participant from flight with validation
 */
export async function removeFlightParticipantService(
	flightDAO: FlightDAO,
	flightId: string,
	userId: string,
): Promise<AppResult<{ success: boolean }>> {
	// Verify flight exists
	const existingFlight = await flightDAO.getFlightById(flightId);
	if (!existingFlight) {
		return AppResult.failure(
			flightErrors,
			"FLIGHT_NOT_FOUND",
			"Voo não encontrado",
			{ flightId },
		);
	}

	// Verify participant exists on flight
	const participantExists = existingFlight.participants.some(
		(p) => p.user.id === userId,
	);
	if (!participantExists) {
		return AppResult.failure(
			flightErrors,
			"PARTICIPANT_NOT_FOUND",
			"Participante não encontrado neste voo",
			{ userId, flightId },
		);
	}

	await flightDAO.removeFlightParticipant(flightId, userId);
	return AppResult.success({ success: true });
}

function getFlightSummary(flight: UpsertFlightPayload) {
	const firstSlice = flight.slices[0];
	const firstSegment = firstSlice.segments[0];
	const lastSlice = flight.slices[flight.slices.length - 1];
	const lastSegment =
		lastSlice.segments[lastSlice.segments.length - 1] ?? firstSegment;

	return {
		originAirport: firstSegment.originAirport,
		destinationAirport: lastSegment.destinationAirport,
		departureDate: firstSegment.departureDate,
		departureTime: firstSegment.departureTime,
		arrivalDate: lastSegment.arrivalDate,
		arrivalTime: lastSegment.arrivalTime,
	};
}

/**
 * Check for duplicate flight without creating
 */
export async function checkDuplicateFlightService(
	flightDAO: FlightDAO,
	travelId: string,
	originAirport: string,
	destinationAirport: string,
	cost?: number,
): Promise<
	AppResult<{
		isDuplicate: boolean;
		existingFlightId: string | null;
		message?: string;
	}>
> {
	const existingFlightId = await flightDAO.findDuplicateFlight(
		travelId,
		originAirport,
		destinationAirport,
		cost,
	);

	return AppResult.success({
		isDuplicate: !!existingFlightId,
		existingFlightId: existingFlightId || null,
		message: existingFlightId
			? "Um voo com essas características já existe. Deseja adicionar participantes ao voo existente?"
			: undefined,
	});
}
