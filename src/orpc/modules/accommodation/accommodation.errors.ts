import * as z from "zod";
export { OpenAPIV3_1 as OpenAPI } from "openapi-types";

export type accommodationErrors = typeof accommodationErrors;
export const accommodationErrors = {
	ACCOMMODATION_NOT_FOUND: {
		message: "Accommodation not found",
		data: z.object({
			accommodationId: z.string(),
		}),
	},
	ACCOMMODATION_DATES_INVALID: {
		message: "Accommodation dates are invalid",
		data: z.object({}),
	},
	ACCOMMODATION_DATES_OUTSIDE_TRAVEL: {
		message: "Accommodation dates are outside travel period",
		data: z.object({
			accommodationStartDate: z.string(),
			accommodationEndDate: z.string(),
			travelStartDate: z.string(),
			travelEndDate: z.string(),
		}),
	},

	/**
	 * Accommodation conflicts and overlaps
	 */
	ACCOMMODATION_OVERLAP_DETECTED: {
		message: "Accommodation dates overlap with existing booking",
		data: z.object({
			conflictingAccommodationId: z.string(),
			conflictingAccommodationName: z.string().optional(),
			overlapStartDate: z.string(),
			overlapEndDate: z.string(),
			suggestedAlternatives: z
				.array(
					z.object({
						startDate: z.string(),
						endDate: z.string(),
						reason: z.string(),
					}),
				)
				.optional(),
		}),
	},
	ACCOMMODATION_CAPACITY_EXCEEDED: {
		message: "Accommodation capacity would be exceeded",
		data: z.object({
			accommodationId: z.string(),
			maxCapacity: z.number(),
			currentOccupants: z.number(),
			additionalGuests: z.number(),
		}),
	},

	/**
	 * Accommodation booking and availability
	 */
	ACCOMMODATION_NOT_AVAILABLE: {
		message: "Accommodation is not available for the requested dates",
		data: z.object({
			accommodationId: z.string(),
			requestedStartDate: z.string(),
			requestedEndDate: z.string(),
			availabilityReason: z.string(),
		}),
	},
	ACCOMMODATION_BOOKING_CONFLICT: {
		message: "Accommodation booking conflicts with existing reservations",
		data: z.object({
			accommodationId: z.string(),
			conflictingReservationId: z.string(),
			conflictDetails: z.string(),
		}),
	},
	MINIMUM_STAY_REQUIRED: {
		message: "Accommodation requires minimum stay duration",
		data: z.object({
			accommodationId: z.string(),
			minimumNights: z.number(),
			requestedNights: z.number(),
		}),
	},

	/**
	 * Accommodation costs and budget
	 */
	ACCOMMODATION_COST_INVALID: {
		message: "Accommodation cost is invalid",
		data: z.object({
			accommodationId: z.string(),
			cost: z.number(),
			reason: z.string(),
		}),
	},
	INSUFFICIENT_BUDGET_FOR_ACCOMMODATION: {
		message: "Insufficient budget for accommodation booking",
		data: z.object({
			accommodationId: z.string(),
			requiredAmount: z.number(),
			availableBudget: z.number(),
		}),
	},

	/**
	 * Accommodation modifications
	 */
	ACCOMMODATION_CANNOT_BE_MODIFIED: {
		message: "Accommodation cannot be modified",
		data: z.object({
			accommodationId: z.string(),
			reason: z.string(),
			status: z.string().optional(),
		}),
	},
	ACCOMMODATION_CHECK_IN_PASSED: {
		message: "Cannot modify accommodation after check-in date",
		data: z.object({
			accommodationId: z.string(),
			checkInDate: z.string(),
		}),
	},
	CANCELLATION_POLICY_VIOLATION: {
		message: "Cancellation violates accommodation policy",
		data: z.object({
			accommodationId: z.string(),
			policyDetails: z.string(),
			penaltyAmount: z.number().optional(),
		}),
	},
} as const;

/**
 * Type helper to extract accommodation error types
 */
export type AccommodationErrorTypes = keyof typeof accommodationErrors;
