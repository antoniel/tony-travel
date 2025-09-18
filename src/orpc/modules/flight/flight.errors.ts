import type { ErrorType } from "@/orpc/appResult";
import * as z from "zod";

export type flightErrors = typeof flightErrors;
export const flightErrors = {
	/**
	 * Flight not found errors
	 */
	FLIGHT_NOT_FOUND: {
		message: "Voo não encontrado",
		data: z.object({
			flightId: z.string(),
		}),
	},
	TRAVEL_NOT_FOUND: {
		message: "Viagem não encontrada",
		data: z.object({
			travelId: z.string(),
		}),
	},

	/**
	 * Flight duplicate and conflict handling
	 */
	DUPLICATE_FLIGHT_FOUND: {
		message: "Já existe um voo semelhante para esta viagem",
		data: z.object({
			existingFlightId: z.string(),
			originAirport: z.string(),
			destinationAirport: z.string(),
			cost: z.number().optional(),
			suggestion: z.string(),
		}),
	},
	FLIGHT_CONFLICT: {
		message: "O voo conflita com uma reserva existente",
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
		message: "As datas do voo são inválidas",
		data: z.object({
			departureDate: z.string().optional(),
			arrivalDate: z.string().optional(),
			reason: z.string(),
		}),
	},
	FLIGHT_ROUTE_INVALID: {
		message: "A rota do voo é inválida",
		data: z.object({
			originAirport: z.string(),
			destinationAirport: z.string(),
			reason: z.string(),
		}),
	},
	FLIGHT_COST_INVALID: {
		message: "O custo do voo é inválido",
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
		message: "Participante não encontrado",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
		}),
	},
	PARTICIPANT_ALREADY_EXISTS: {
		message: "Esse participante já está neste voo",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
			participantId: z.string(),
		}),
	},
	PARTICIPANT_CANNOT_BE_ADDED: {
		message: "Não foi possível adicionar o participante ao voo",
		data: z.object({
			userId: z.string(),
			flightId: z.string(),
			reason: z.string(),
		}),
	},
	PARTICIPANT_CANNOT_BE_REMOVED: {
		message: "Não foi possível remover o participante do voo",
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
		message: "A capacidade do voo seria excedida",
		data: z.object({
			flightId: z.string(),
			maxCapacity: z.number().optional(),
			currentParticipants: z.number(),
			additionalParticipants: z.number(),
		}),
	},
	FLIGHT_NOT_AVAILABLE: {
		message: "O voo não está disponível para reserva",
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
		message: "O voo não pode ser alterado",
		data: z.object({
			flightId: z.string(),
			reason: z.string(),
			status: z.string().optional(),
		}),
	},
	FLIGHT_DEPARTURE_PASSED: {
		message: "Não é possível alterar o voo após o horário de partida",
		data: z.object({
			flightId: z.string(),
			departureDate: z.string(),
		}),
	},
	CANCELLATION_NOT_ALLOWED: {
		message: "O cancelamento do voo não é permitido",
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
		message: "É necessário um número mínimo de participantes para o voo",
		data: z.object({
			flightId: z.string(),
			minimumParticipants: z.number(),
			currentParticipants: z.number(),
		}),
	},
	TRAVEL_BUDGET_EXCEEDED: {
		message: "O custo do voo excederia o orçamento da viagem",
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
