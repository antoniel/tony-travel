import { type Flight, FlightSchema, type InsertFlight, InsertFlightSchema, UserSchema } from "@/lib/db/schema"
import * as z from "zod"

export type { Flight, InsertFlight }

// Extended flight with participants
export interface FlightWithParticipants extends Flight {
  participants: {
    id: string
    user: {
      id: string
      name: string
      email: string
      image?: string | null
    }
  }[]
}

// Create flight with participants input
export const CreateFlightWithParticipantsSchema = z.object({
  flight: InsertFlightSchema,
  participantIds: z.array(z.string()).optional().default([]),
})

export type CreateFlightWithParticipants = z.infer<typeof CreateFlightWithParticipantsSchema>

// Duplicate flight check result
export const DuplicateFlightResultSchema = z.object({
  isDuplicate: z.boolean(),
  existingFlightId: z.string().nullable(),
  message: z.string().optional(),
})

export type DuplicateFlightResult = z.infer<typeof DuplicateFlightResultSchema>

export const FlightGroupSchema = z.object({
  originAirport: z.string(),
  flights: z.array(
    FlightSchema.extend({
      participants: z.array(
        z.object({
          id: z.string(),
          user: UserSchema.omit({ email: true }),
        })
      ),
    })
  ),
})

export type FlightGroup = z.infer<typeof FlightGroupSchema>
