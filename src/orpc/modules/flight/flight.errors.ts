import type { ErrorType } from "@/orpc/appResult";
import * as z from "zod";

export type flightErrors = typeof flightErrors;
export const flightErrors = {
	/**
	 * Flight not found errors
	 */
	FLIGHT_NOT_FOUND: {
		message: "Flight not found",
		data: z.object({
			flightId: z.string(),
		}),
	},
	TRAVEL_NOT_FOUND: {
		message: "Travel not found",
		data: z.object({
			travelId: z.string(),
		}),
	},

	/**
	 * Flight duplicate and conflict handling
	 */
	DUPLICATE_FLIGHT_FOUND: {
		message: "A similar flight already exists for this travel",
		data: z.object({
			existingFlightId: z.string(),
			originAirport: z.string(),
			destinationAirport: z.string(),
			cost: z.number().optional(),
			suggestion: z.string(),
		}),
	},
	FLIGHT_CONFLICT: {
		message: "Flight conflicts with existing booking",
		data: z.object({
			flightId: z.string(),
			conflictingFlightId: z.string(),
			conflictDetails: z.string(),
		}),
	},

	/**
	 * Flight validation errors
	 */
	FLIGHT_DATES_INVALID: {
		message: "Flight dates are invalid",
		data: z.object({
			departureDate: z.string().optional(),
			arrivalDate: z.string().optional(),
			reason: z.string(),
		}),
	},
	FLIGHT_ROUTE_INVALID: {
		message: "Flight route is invalid",
		data: z.object({
			originAirport: z.string(),
			destinationAirport: z.string(),
			reason: z.string(),
		}),
	},
	FLIGHT_COST_INVALID: {
		message: "Flight cost is invalid",
		data: z.object({
			flightId: z.string().optional(),
			cost: z.number(),
			reason: z.string(),
		}),
	},

	/**
	 * Participant management errors
	 */
	PARTICIPANT_NOT_FOUND: {
		message: "Participant not found",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
		}),
	},
	PARTICIPANT_ALREADY_EXISTS: {
		message: "Participant already exists on this flight",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
			participantId: z.string(),
		}),
	},
	PARTICIPANT_CANNOT_BE_ADDED: {
		message: "Participant cannot be added to flight",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
			reason: z.string(),
		}),
	},
	PARTICIPANT_CANNOT_BE_REMOVED: {
		message: "Participant cannot be removed from flight",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
			reason: z.string(),
		}),
	},

	/**
	 * Flight capacity and booking errors
	 */
	FLIGHT_CAPACITY_EXCEEDED: {
		message: "Flight capacity would be exceeded",
		data: z.object({
			flightId: z.string(),
			maxCapacity: z.number().optional(),
			currentParticipants: z.number(),
			additionalParticipants: z.number(),
		}),
	},
	FLIGHT_NOT_AVAILABLE: {
		message: "Flight is not available for booking",
		data: z.object({
			flightId: z.string(),
			reason: z.string(),
			availableSeats: z.number().optional(),
		}),
	},

	/**
	 * Flight modification errors
	 */
	FLIGHT_CANNOT_BE_MODIFIED: {
		message: "Flight cannot be modified",
		data: z.object({
			flightId: z.string(),
			reason: z.string(),
			status: z.string().optional(),
		}),
	},
	FLIGHT_DEPARTURE_PASSED: {
		message: "Cannot modify flight after departure time",
		data: z.object({
			flightId: z.string(),
			departureDate: z.string(),
		}),
	},
	CANCELLATION_NOT_ALLOWED: {
		message: "Flight cancellation is not allowed",
		data: z.object({
			flightId: z.string(),
			reason: z.string(),
			penaltyAmount: z.number().optional(),
		}),
	},

	/**
	 * Business rule violations
	 */
	MINIMUM_PARTICIPANTS_REQUIRED: {
		message: "Minimum number of participants required for flight",
		data: z.object({
			flightId: z.string(),
			minimumParticipants: z.number(),
			currentParticipants: z.number(),
		}),
	},
	TRAVEL_BUDGET_EXCEEDED: {
		message: "Flight cost would exceed travel budget",
		data: z.object({
			flightId: z.string(),
			flightCost: z.number(),
			availableBudget: z.number(),
			travelId: z.string(),
		}),
	},
} satisfies ErrorType;

/**
 * Type helper to extract flight error types
 */
export type FlightErrorTypes = keyof typeof flightErrors;
