import type { InsertFlight } from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import type * as z from "zod";
import type { TravelDAO } from "../travel/travel.dao";
import type { FlightDAO } from "./flight.dao";
import { flightErrors } from "./flight.errors";
import type { CreateFlightWithParticipantsSchema, FlightWithParticipants } from "./flight.model";

/**
 * Create flight with smart duplicate detection and participant management
 */
export async function createFlightService(
	flightDAO: FlightDAO,
	travelDAO: TravelDAO,
	input: z.infer<typeof CreateFlightWithParticipantsSchema> & { travelId: string },
): Promise<AppResult<{
	id: string;
	isDuplicate: boolean;
	existingFlightId: string | null;
}>> {
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
		...input.flight,
		travelId: input.travelId,
	};
	const flightId = await flightDAO.createFlight(flightData);

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
): Promise<AppResult<Array<{ originAirport: string; flights: FlightWithParticipants[] }>>> {
	const flights = await flightDAO.getFlightsByTravel(travelId);

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
	flightId: string,
	flightData: Partial<InsertFlight>,
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

	// Check if flight has already departed (if departure date is being checked)
	if (existingFlight.departureDate) {
		const departureDate = new Date(existingFlight.departureDate);
		if (departureDate < new Date()) {
			return AppResult.failure(
				flightErrors,
				"FLIGHT_DEPARTURE_PASSED",
				"Não é possível modificar voo após a data de partida",
				{ flightId, departureDate: departureDate.toISOString() },
			);
		}
	}

	await flightDAO.updateFlight(flightId, flightData);
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

	// Check if flight has already departed
	if (existingFlight.departureDate) {
		const departureDate = new Date(existingFlight.departureDate);
		if (departureDate < new Date()) {
			return AppResult.failure(
				flightErrors,
				"CANCELLATION_NOT_ALLOWED",
				"Não é possível cancelar voo após a data de partida",
				{ flightId, reason: "Flight has already departed" },
			);
		}
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

	// Check if flight has already departed
	if (existingFlight.departureDate) {
		const departureDate = new Date(existingFlight.departureDate);
		if (departureDate < new Date()) {
			return AppResult.failure(
				flightErrors,
				"PARTICIPANT_CANNOT_BE_ADDED",
				"Não é possível adicionar participante após a data de partida",
				{ userId, flightId, reason: "Flight has already departed" },
			);
		}
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

	// Check if flight has already departed
	if (existingFlight.departureDate) {
		const departureDate = new Date(existingFlight.departureDate);
		if (departureDate < new Date()) {
			return AppResult.failure(
				flightErrors,
				"PARTICIPANT_CANNOT_BE_REMOVED",
				"Não é possível remover participante após a data de partida",
				{ userId, flightId, reason: "Flight has already departed" },
			);
		}
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

/**
 * Check for duplicate flight without creating
 */
export async function checkDuplicateFlightService(
	flightDAO: FlightDAO,
	travelId: string,
	originAirport: string,
	destinationAirport: string,
	cost?: number,
): Promise<AppResult<{
	isDuplicate: boolean;
	existingFlightId: string | null;
	message?: string;
}>> {
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