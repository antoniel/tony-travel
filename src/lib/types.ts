import type { Accommodation as AccommodationDb, AppEvent as AppEventDb } from "@/lib/db/schema"
import type { InferResultType } from "./db/type-utils"

export type TravelWithRelations = InferResultType<
  "Travel",
  {
    accommodations: true
    events: {
      with: {
        dependencies: true
      }
    }
  }
>

export type Accommodation = AccommodationDb

export type AppEvent = AppEventDb

export interface ImageMetadata {
  source: "pixabay" | "manual"
  tags: string[]
  photographer?: string
  fetchedAt: Date
  pixabayId?: number
}
