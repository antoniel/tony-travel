import {
	InsertAccommodationSchema,
	InsertAppEventSchema,
} from "@/lib/db/schema";
import * as z from "zod";

const VisaInfoSchema = z.object({
	required: z.boolean(),
	stayDuration: z.string(),
	documents: z.array(z.string()),
	vaccinations: z.array(z.string()),
	entryRequirements: z.array(z.string()).optional(),
});
const LocationInfoSchema = z.object({
    destination: z.string(),
    country: z.string(),
    climate: z.string(),
    currency: z.string(),
    language: z.string(),
    timeZone: z.string(),
    bestTimeToVisit: z.string(),
    emergencyNumbers: z
        .object({
            police: z.string().optional(),
            medical: z.string().optional(),
            embassy: z.string().optional(),
        })
        .optional(),
    // Optional persisted selections to help prefill UI (e.g., flights form)
    departureAirports: z
        .array(
            z.object({
                code: z.string(),
                label: z.string(),
            }),
        )
        .optional(),
    selectedDestinations: z
        .array(
            z.object({
                value: z.string(),
                label: z.string(),
            }),
        )
        .optional(),
});

export const InsertFullTravel = z.object({
	name: z.string(),
	description: z.string().optional(),
	destination: z.string(),
	startDate: z.date(),
	endDate: z.date(),
	accommodations: z.array(InsertAccommodationSchema),
	events: z.array(InsertAppEventSchema),
	locationInfo: LocationInfoSchema,
	visaInfo: VisaInfoSchema,
});
export type InsertFullTravel = z.infer<typeof InsertFullTravel>;

export const AirportSchema = z.object({
	code: z.string(), // IATA code or grouped identifier
	name: z.string(),
	city: z.string(),
	state: z.string().nullable(),
	stateCode: z.string().nullable(),
	country: z.string(),
	countryCode: z.string(),
	type: z.enum(["airport", "city_group", "state_group", "country_group"]),
	airportCount: z.number().optional(), // For grouped options
	airportCodes: z.array(z.string()).optional(), // IATA codes for grouped options
});
export type Airport = z.infer<typeof AirportSchema>;
