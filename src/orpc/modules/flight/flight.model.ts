import {
	type Flight,
	FlightSchema,
	FlightSegmentSchema,
	FlightSliceSchema,
	UserSchema,
} from "@/lib/db/schema";
import * as z from "zod";

export type { Flight };

export const FlightSegmentInputSchema = z.object({
	originAirport: z.string().min(1, "Aeroporto de origem é obrigatório"),
	destinationAirport: z.string().min(1, "Aeroporto de destino é obrigatório"),
	departureDate: z.coerce.date(),
	departureTime: z.string().min(1, "Horário de partida é obrigatório"),
	arrivalDate: z.coerce.date(),
	arrivalTime: z.string().min(1, "Horário de chegada é obrigatório"),
	marketingFlightNumber: z.string().optional(),
	operatingCarrierCode: z.string().optional(),
	aircraftName: z.string().optional(),
	aircraftType: z.string().optional(),
	distanceMeters: z.number().int().nonnegative().nullable().optional(),
	durationMinutes: z.number().int().nonnegative().nullable().optional(),
	baggageAllowance: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type FlightSegmentInput = z.infer<typeof FlightSegmentInputSchema>;

export const FlightSliceInputSchema = z.object({
	originAirport: z.string().min(1, "Aeroporto de origem é obrigatório"),
	destinationAirport: z.string().min(1, "Aeroporto de destino é obrigatório"),
	durationMinutes: z.number().int().nonnegative().nullable().optional(),
	cabinClass: z.string().optional(),
	cabinClassMarketingName: z.string().optional(),
	segments: z
		.array(FlightSegmentInputSchema)
		.min(1, "Informe ao menos um trecho"),
});

export type FlightSliceInput = z.infer<typeof FlightSliceInputSchema>;

export const FlightCostDetailsSchema = z.object({
	totalAmount: z.number().nonnegative().nullable().optional(),
	currency: z
		.string()
		.trim()
		.length(3, "Moeda deve conter 3 caracteres")
		.optional()
		.default("BRL"),
	baseAmount: z.number().nonnegative().nullable().optional(),
	taxAmount: z.number().nonnegative().nullable().optional(),
	provider: z.string().optional(),
	offerReference: z.string().optional(),
	dataSource: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const UpsertFlightPayloadSchema = FlightCostDetailsSchema.extend({
	slices: z
		.array(FlightSliceInputSchema)
		.min(1, "Informe ao menos um slice com trechos"),
});

export type UpsertFlightPayload = z.infer<typeof UpsertFlightPayloadSchema>;

export const CreateFlightWithParticipantsSchema = z.object({
	flight: UpsertFlightPayloadSchema,
	participantIds: z.array(z.string()).optional().default([]),
});

export type CreateFlightWithParticipants = z.infer<
	typeof CreateFlightWithParticipantsSchema
>;

export const UpdateFlightWithParticipantsSchema = z.object({
	id: z.string(),
	flight: UpsertFlightPayloadSchema,
});

export type UpdateFlightWithParticipants = z.infer<
	typeof UpdateFlightWithParticipantsSchema
>;

// Duplicate flight check result
export const DuplicateFlightResultSchema = z.object({
	isDuplicate: z.boolean(),
	existingFlightId: z.string().nullable(),
	message: z.string().optional(),
});

export type DuplicateFlightResult = z.infer<typeof DuplicateFlightResultSchema>;

const FlightSegmentDtoSchema = FlightSegmentSchema.omit({ sliceId: true });

export const FlightSliceDtoSchema = FlightSliceSchema.omit({
	flightId: true,
}).extend({
	segments: z.array(FlightSegmentDtoSchema),
});

export const FlightWithParticipantsSchema = FlightSchema.extend({
	slices: z.array(FlightSliceDtoSchema),
	participants: z.array(
		z.object({
			id: z.string(),
			user: UserSchema.omit({ email: true }),
		}),
	),
});

export type FlightWithParticipants = z.infer<
	typeof FlightWithParticipantsSchema
>;

export const FlightGroupSchema = z.object({
	originAirport: z.string(),
	flights: z.array(FlightWithParticipantsSchema),
});

export type FlightGroup = z.infer<typeof FlightGroupSchema>;
