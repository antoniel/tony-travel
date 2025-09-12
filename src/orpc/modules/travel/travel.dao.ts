import type { DB } from "@/lib/db/types";
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
	constructor(private readonly db: DB) {}
	async createTravel(travelData: TravelInput & { userId: string }): Promise<string> {
		const [travel] = await this.db
			.insert(Travel)
			.values({
				name: travelData.name,
				destination: travelData.destination,
				startDate: travelData.startDate,
				endDate: travelData.endDate,
				locationInfo: travelData.locationInfo,
				visaInfo: travelData.visaInfo,
				userId: travelData.userId,
			})
			.returning({ id: Travel.id });

		const travelId = travel.id;

		if (travelData.accommodations.length > 0) {
			await this.db
				.insert(Accommodation)
				.values(travelData.accommodations.map((a) => ({ ...a, travelId })));
		}

		await this.insertEvents(travelData.events, travelId);

		return travelId;
	}

	async getTravelById(id: string): Promise<TravelWithRelations | null> {
		const travel = await this.db.query.Travel.findFirst({
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
		const travels = await this.db.query.Travel.findMany({
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
		const [event] = await this.db
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
		await this.db
			.update(AppEvent)
			.set({
				imageUrl,
				imageMetadata,
			})
			.where(eq(AppEvent.id, eventId));
	}

	private async insertEvents(
		events: TravelInput["events"],
		travelId: string,
		parentEventId?: string,
	): Promise<void> {
		for (const event of events) {
			await this.db
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
		}
	}
}

export const createTravelDAO = (db: DB) => new TravelDAO(db);
