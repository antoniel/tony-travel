import { InsertAccommodationSchema, InsertAppEventSchema } from "@/lib/db/schema"
import * as z from "zod"

export const InsertFullTravel = z.object({
  name: z.string(),
  description: z.string().optional(),
  destination: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  accommodations: z.array(InsertAccommodationSchema),
  events: z.array(InsertAppEventSchema),
})
export type InsertFullTravel = z.infer<typeof InsertFullTravel>

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
})
export type Airport = z.infer<typeof AirportSchema>
