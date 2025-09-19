import {
	InsertAccommodationSchema,
	InsertAppEventSchema,
	TravelSchema,
	TravelMemberSchema,
	type TravelDestinationAirportOption,
} from "@/lib/db/schema";
import * as z from "zod";

export const LocationOptionSchema: z.ZodType<TravelDestinationAirportOption> = z
	.object({
		value: z.string(),
		label: z.string(),
	});
export type LocationOption = z.infer<typeof LocationOptionSchema>;

export const InsertFullTravel = z.object({
	name: z.string(),
	description: z.string().optional(),
	destination: z.string(),
	destinationAirports: z
		.array(LocationOptionSchema)
		.min(1, "Selecione pelo menos um aeroporto de destino"),
	startDate: z.date(),
	endDate: z.date(),
	budget: z.number().optional(),
	peopleEstimate: z.number().int().positive().optional(),
	accommodations: z.array(InsertAccommodationSchema),
	events: z.array(InsertAppEventSchema),
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

// Featured travel output: base Travel + computed fields used for ranking/UI
export const FeaturedTravelSchema = TravelSchema.extend({
	eventsCount: z.number().int().nonnegative(),
	accommodationsCount: z.number().int().nonnegative(),
	flightsCount: z.number().int().nonnegative(),
	userMembership: TravelMemberSchema.nullable().optional(),
});
export type FeaturedTravel = z.infer<typeof FeaturedTravelSchema>;
