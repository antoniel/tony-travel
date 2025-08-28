import { db } from "@/lib/db";
import {
	Accommodation,
	AppEvent,
	type InsertAppEvent,
	Travel,
} from "@/lib/db/schema";
import type { ImageMetadata, TravelWithRelations } from "@/lib/types";
import { eq } from "drizzle-orm";
import type * as z from "zod";
import type { InsertFullTravel } from "./travel.model";

type TravelInput = z.infer<typeof InsertFullTravel>;

export class TravelDAO {
	async createTravel(travelData: TravelInput): Promise<string> {
		// Insert travel record (ID is auto-generated via $defaultFn)
		const [travel] = await db
			.insert(Travel)
			.values({
				name: travelData.name,
				destination: travelData.destination,
				startDate: travelData.startDate,
				endDate: travelData.endDate,
				locationInfo: travelData.locationInfo,
				visaInfo: travelData.visaInfo,
			})
			.returning({ id: Travel.id });

		const travelId = travel.id;

		// Insert accommodations
		if (travelData.accommodations.length > 0) {
			await Promise.all(
				travelData.accommodations.map((accommodation) =>
					db.insert(Accommodation).values({
						...accommodation,
						// ID is auto-generated via $defaultFn
						travelId,
					}),
				),
			);
		}

		// Insert events with dependencies
		await this.insertEventsRecursively(travelData.events, travelId);

		return travelId;
	}

	async getTravelById(id: string): Promise<TravelWithRelations | null> {
		const travel = await db.query.Travel.findFirst({
			where: eq(Travel.id, id),
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
			},
		});

		if (!travel) {
			return null;
		}

		return travel;
	}

	async getAllTravels(): Promise<TravelWithRelations[]> {
		const travels = await db.query.Travel.findMany({
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
			},
		});

		return travels;
	}

	async createEvent(eventData: InsertAppEvent): Promise<string> {
		const [event] = await db
			.insert(AppEvent)
			.values(eventData)
			.returning({ id: AppEvent.id });

		return event.id;
	}

	async updateEventImage(
		eventId: string,
		imageUrl: string,
		imageMetadata: ImageMetadata,
	): Promise<void> {
		await db
			.update(AppEvent)
			.set({
				imageUrl,
				imageMetadata,
			})
			.where(eq(AppEvent.id, eventId));
	}

	private async insertEventsRecursively(
		events: TravelInput["events"],
		travelId: string,
		parentEventId?: string,
	): Promise<void> {
		for (const event of events) {
			// Insert event (ID is auto-generated via $defaultFn)
			const [insertedEvent] = await db
				.insert(AppEvent)
				.values({
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					estimatedCost: event.estimatedCost,
					type: event.type,
					location: event.location,
					travelId,
					parentEventId,
				})
				.returning({ id: AppEvent.id });

			// Insert dependencies recursively
			if (event.dependencies && event.dependencies.length > 0) {
				await this.insertEventsRecursively(
					event.dependencies,
					travelId,
					insertedEvent.id,
				);
			}
		}
	}
}

// Export singleton instance
export const travelDAO = new TravelDAO();
