import type { FlightWithParticipants } from "@/orpc/modules/flight/flight.model";

export interface FlightSegmentEvent {
	id: string;
	type: "flight";
	title: string;
	startDate: Date;
	endDate: Date;
	originAirport: string;
	destinationAirport: string;
	flightNumber?: string;
	participants: Array<{ id: string; user: { name: string; id: string } }>;
	// Add flight-specific metadata
	metadata: {
		flightId: string;
		sliceId: string;
		isConsolidated: boolean;
		isPreTripFlight: boolean;
		originalSegments: Array<{
			originAirport: string;
			destinationAirport: string;
			departureDate: Date;
			arrivalDate: Date;
		}>;
	};
}

/**
 * Consolidates flight segments according to specification requirements:
 * - For multi-stop flights, show only origin to final destination
 * - For round-trip flights, create separate events for outbound and return
 * - Hide intermediate stops (e.g., Palmas→Brasília→Guarulhos becomes Palmas→Guarulhos)
 */
export function consolidateFlightSegments(
	flights: FlightWithParticipants[],
): FlightSegmentEvent[] {
	const flightEvents: FlightSegmentEvent[] = [];

	for (const flight of flights) {
		for (const slice of flight.slices) {
			// Skip slices with no segments or incomplete data
			if (!slice.segments || slice.segments.length === 0) {
				continue;
			}

			// Check if all segments have required timing data
			const hasCompleteTimingData = slice.segments.every(
				(segment) =>
					segment.departureDate &&
					segment.departureTime &&
					segment.arrivalDate &&
					segment.arrivalTime,
			);

			if (!hasCompleteTimingData) {
				continue; // Skip incomplete segments as per requirement FR-009
			}

			// Consolidate segments: use first segment's origin and last segment's destination
			const firstSegment = slice.segments[0];
			const lastSegment = slice.segments[slice.segments.length - 1];

			// Combine departure date and time
			const departureDateTime = combineDateAndTime(
				firstSegment.departureDate,
				firstSegment.departureTime,
			);

			// Combine arrival date and time
			const arrivalDateTime = combineDateAndTime(
				lastSegment.arrivalDate,
				lastSegment.arrivalTime,
			);

			// Create consolidated flight event
			const flightEvent: FlightSegmentEvent = {
				id: `flight-${flight.id}-slice-${slice.id}`,
				type: "flight",
				title: `${firstSegment.originAirport} → ${lastSegment.destinationAirport}`,
				startDate: departureDateTime,
				endDate: arrivalDateTime,
				originAirport: firstSegment.originAirport,
				destinationAirport: lastSegment.destinationAirport,
				flightNumber: firstSegment.marketingFlightNumber || undefined,
				participants: flight.participants,
				metadata: {
					flightId: flight.id,
					sliceId: slice.id,
					isConsolidated: slice.segments.length > 1,
					isPreTripFlight: false,
					originalSegments: slice.segments.map((segment) => ({
						originAirport: segment.originAirport,
						destinationAirport: segment.destinationAirport,
						departureDate: segment.departureDate,
						arrivalDate: segment.arrivalDate,
					})),
				},
			};

			flightEvents.push(flightEvent);
		}
	}

	// Sort by departure time
	return flightEvents.sort(
		(a, b) => a.startDate.getTime() - b.startDate.getTime(),
	);
}

/**
 * Combines a date and time string into a single Date object
 * Preserves the original date and time without timezone shifts
 */
function combineDateAndTime(date: Date, timeString: string): Date {
	const [hours, minutes] = parseTimeString(timeString);

	// Get UTC date components to avoid timezone shifts
	// Since flight dates come as UTC strings, we need to use UTC methods
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	const day = date.getUTCDate();

	// Create date using local time components to prevent timezone conversion
	// This ensures the flight appears on the correct calendar date
	const combined = new Date(year, month, day, hours, minutes, 0, 0);

	return combined;
}

/**
 * Parses time string in various formats (HH:MM, H:MM, etc.)
 */
function parseTimeString(timeString: string): [number, number] {
	// Handle various time formats
	const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);

	if (!timeMatch) {
		// Fallback to 00:00 if parsing fails
		return [0, 0];
	}

	const hours = Number.parseInt(timeMatch[1], 10);
	const minutes = Number.parseInt(timeMatch[2], 10);

	return [hours, minutes];
}

/**
 * Gets flight event color following design system tokens
 * Uses purple/blue colors as specified in requirements
 */
export function getFlightEventColor(): string {
	// Use design system color tokens for purple/blue flight events
	return "hsl(var(--chart-5))"; // Assuming chart-5 is purple/blue in the design system
}

/**
 * Checks if a flight spans across multiple days (cross-date flight)
 */
export function isCrossDateFlight(flightEvent: FlightSegmentEvent): boolean {
	const startDay = new Date(flightEvent.startDate);
	startDay.setHours(0, 0, 0, 0);

	const endDay = new Date(flightEvent.endDate);
	endDay.setHours(0, 0, 0, 0);

	return startDay.getTime() !== endDay.getTime();
}
