import * as z from "zod";

export type accommodationErrors = typeof accommodationErrors;
export const accommodationErrors = {
	ACCOMMODATION_NOT_FOUND: {
		message: "Acomodação não encontrada",
		data: z.object({
			accommodationId: z.string(),
		}),
	},
	ACCOMMODATION_DATES_INVALID: {
		message: "As datas da acomodação são inválidas",
		data: z.object({
			startDate: z.string(),
			endDate: z.string(),
			travelStartDate: z.string(),
			travelEndDate: z.string(),
		}),
	},
	ACCOMMODATION_DATES_OUTSIDE_TRAVEL: {
		message: "As datas da acomodação estão fora do período da viagem",
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
		message: "As datas da acomodação conflitam com outra reserva",
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
		message: "A capacidade da acomodação seria excedida",
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
		message: "A acomodação não está disponível para as datas solicitadas",
		data: z.object({
			accommodationId: z.string(),
			requestedStartDate: z.string(),
			requestedEndDate: z.string(),
			availabilityReason: z.string(),
		}),
	},
	ACCOMMODATION_BOOKING_CONFLICT: {
		message: "A reserva da acomodação conflita com outras reservas",
		data: z.object({
			accommodationId: z.string(),
			conflictingReservationId: z.string(),
			conflictDetails: z.string(),
		}),
	},
	MINIMUM_STAY_REQUIRED: {
		message: "A acomodação exige uma estadia mínima",
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
		message: "O custo da acomodação é inválido",
		data: z.object({
			accommodationId: z.string(),
			cost: z.number(),
			reason: z.string(),
		}),
	},
	INSUFFICIENT_BUDGET_FOR_ACCOMMODATION: {
		message: "Orçamento insuficiente para reservar a acomodação",
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
		message: "A acomodação não pode ser alterada",
		data: z.object({
			accommodationId: z.string(),
			reason: z.string(),
			status: z.string().optional(),
		}),
	},
	ACCOMMODATION_CHECK_IN_PASSED: {
		message: "Não é possível alterar a acomodação após a data de check-in",
		data: z.object({
			accommodationId: z.string(),
			checkInDate: z.string(),
		}),
	},
	CANCELLATION_POLICY_VIOLATION: {
		message: "A solicitação de cancelamento viola a política da acomodação",
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
