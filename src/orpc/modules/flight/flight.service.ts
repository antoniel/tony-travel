import type { InsertFlight } from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import type * as z from "zod";
import type { TravelDAO } from "../travel/travel.dao";
import type { FlightDAO } from "./flight.dao";
import { flightErrors } from "./flight.errors";
import type {
	CreateFlightWithParticipantsSchema,
	FlightChainInfo,
	FlightGroup,
	FlightWithParticipants,
	FlightWithSlices,
	HierarchicalFlightGroup,
	SliceFlight,
	SliceFlightGroup,
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
		travelId: input.travelId,
	};
	const flightId = await flightDAO.createFlight(
		flightData,
		input.flight.slices,
	);

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
 * Get flights by slice - each slice becomes its own flight card
 */
export async function getSliceFlightsByTravelService(
	flightDAO: FlightDAO,
	travelId: string,
): Promise<AppResult<SliceFlightGroup[]>> {
	const flights = await flightDAO.getFlightsByTravel(travelId);

	// Flatten flights into slice-based representations
	const sliceFlights: SliceFlight[] = [];

	for (const flight of flights) {
		for (const [sliceIndex, slice] of flight.slices.entries()) {
			// Get first and last segments for this slice
			const firstSegment = slice.segments[0];
			const lastSegment = slice.segments[slice.segments.length - 1];

			if (!firstSegment || !lastSegment) continue;

			sliceFlights.push({
				id: slice.id,
				flightId: flight.id,
				sliceIndex,
				originAirport: slice.originAirport,
				destinationAirport: slice.destinationAirport,
				departureDate: firstSegment.departureDate,
				departureTime: firstSegment.departureTime,
				arrivalDate: lastSegment.arrivalDate,
				arrivalTime: lastSegment.arrivalTime,
				durationMinutes: slice.durationMinutes,
				cabinClass: slice.cabinClass,
				// For cost, show full cost only on first slice to avoid duplication
				totalAmount: sliceIndex === 0 ? flight.totalAmount : null,
				currency: flight.currency,
				travelId: flight.travelId,
				createdAt: flight.createdAt,
				updatedAt: flight.updatedAt,
				segments: slice.segments,
				participants: flight.participants, // All participants for all slices
				originalFlight: {
					id: flight.id,
					totalSlices: flight.slices.length,
				},
			});
		}
	}

	// Sort slice flights by departure date and time (earliest first)
	sliceFlights.sort((a, b) => {
		const dateA = new Date(
			`${a.departureDate.toISOString().split("T")[0]}T${a.departureTime}`,
		);
		const dateB = new Date(
			`${b.departureDate.toISOString().split("T")[0]}T${b.departureTime}`,
		);
		return dateA.getTime() - dateB.getTime();
	});

	// Group slice flights by origin airport
	const grouped = sliceFlights.reduce((acc, sliceFlight) => {
		const originAirport = sliceFlight.originAirport;
		const existing = acc.find((g) => g.originAirport === originAirport);

		if (existing) {
			existing.sliceFlights.push(sliceFlight);
		} else {
			acc.push({
				originAirport,
				sliceFlights: [sliceFlight],
			});
		}

		return acc;
	}, [] as SliceFlightGroup[]);

	return AppResult.success(grouped);
}

/**
 * Get flights in hierarchical structure for improved UX
 */
export async function getHierarchicalFlightsByTravelService(
	flightDAO: FlightDAO,
	travelId: string,
): Promise<AppResult<HierarchicalFlightGroup[]>> {
	const flights = await flightDAO.getFlightsByTravel(travelId);

	// Detect flight chains for visual linking
	const chainInfoMap = detectFlightChains(flights);

	// Transform flights into hierarchical structure with computed properties
	const flightsWithSlices: FlightWithSlices[] = flights.map((flight) => {
		const totalSegments = flight.slices.reduce(
			(total, slice) => total + slice.segments.length,
			0,
		);

		const totalDuration =
			flight.slices.reduce(
				(total, slice) => total + (slice.durationMinutes || 0),
				0,
			) || null;

		return {
			...flight,
			isMultiSlice: flight.slices.length > 1,
			totalDuration,
			totalSegments,
			chainInfo: chainInfoMap.get(flight.id) || null,
		};
	});

	// Sort flights by departure date and time (earliest first)
	flightsWithSlices.sort((a, b) => {
		const dateA = new Date(
			`${a.departureDate.toISOString().split("T")[0]}T${a.departureTime}`,
		);
		const dateB = new Date(
			`${b.departureDate.toISOString().split("T")[0]}T${b.departureTime}`,
		);
		return dateA.getTime() - dateB.getTime();
	});

	// Group flights by origin airport
	const grouped = flightsWithSlices.reduce((acc, flight) => {
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
	}, [] as HierarchicalFlightGroup[]);

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
 * Detect flight chains (round trips, multi-city) and generate chain information
 */
function detectFlightChains(
	flights: FlightWithParticipants[],
): Map<string, FlightChainInfo> {
	const chainInfoMap = new Map<string, FlightChainInfo>();
	const processedFlights = new Set<string>();

	for (const flight of flights) {
		if (processedFlights.has(flight.id)) continue;

		const originAirport = flight.originAirport;
		const destinationAirport = flight.destinationAirport;

		// Find potential related flights
		const relatedFlights = flights.filter(
			(f) =>
				f.id !== flight.id &&
				!processedFlights.has(f.id) &&
				// Check for round trip or connecting flights

				// Round trip: A->B and B->A
				((f.originAirport === destinationAirport &&
					f.destinationAirport === originAirport) ||
					// Multi-city: A->B and B->C
					f.originAirport === destinationAirport ||
					// Multi-city: C->A and A->B (return to origin)
					f.destinationAirport === originAirport),
		);

		if (relatedFlights.length > 0) {
			// Create chain
			const chainFlights = [flight, ...relatedFlights];

			// Sort by departure date for proper chain order
			chainFlights.sort((a, b) => {
				const dateA = new Date(
					`${a.departureDate.toISOString().split("T")[0]}T${a.departureTime}`,
				);
				const dateB = new Date(
					`${b.departureDate.toISOString().split("T")[0]}T${b.departureTime}`,
				);
				return dateA.getTime() - dateB.getTime();
			});

			// Determine chain type
			const isRoundTrip =
				chainFlights.length === 2 &&
				chainFlights[0].originAirport === chainFlights[1].destinationAirport &&
				chainFlights[0].destinationAirport === chainFlights[1].originAirport;

			const chainType = isRoundTrip
				? "round_trip"
				: chainFlights.length > 2
					? "multi_city"
					: "one_way";

			// Generate unique chain ID
			const chainId = `chain_${chainFlights
				.map((f) => f.id)
				.sort()
				.join("_")}`;
			const relatedFlightIds = chainFlights.map((f) => f.id);

			// Create chain info for each flight
			chainFlights.forEach((chainFlight, index) => {
				chainInfoMap.set(chainFlight.id, {
					chainId,
					chainPosition: index + 1,
					totalInChain: chainFlights.length,
					chainType,
					relatedFlightIds,
				});
				processedFlights.add(chainFlight.id);
			});
		} else {
			// Single flight - still create chain info for consistency
			chainInfoMap.set(flight.id, {
				chainId: `single_${flight.id}`,
				chainPosition: 1,
				totalInChain: 1,
				chainType: "one_way",
				relatedFlightIds: [flight.id],
			});
			processedFlights.add(flight.id);
		}
	}

	return chainInfoMap;
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
