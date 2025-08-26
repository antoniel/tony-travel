import { db } from "@/lib/db";
import { Travel, Accommodation, AppEvent } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { TravelSchema } from "./travel.model";
import type * as z from "zod";

type TravelInput = z.infer<typeof TravelSchema>;
type TravelWithId = TravelInput & { id: string };

export class TravelDAO {
	async createTravel(travelData: TravelInput): Promise<string> {
		const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		
		// Insert travel record
		await db.insert(Travel).values({
			id,
			name: travelData.name,
			destination: travelData.destination,
			startDate: travelData.startDate,
			endDate: travelData.endDate,
			locationInfo: travelData.locationInfo,
			visaInfo: travelData.visaInfo,
		});

		// Insert accommodations
		if (travelData.accommodation.length > 0) {
			await Promise.all(
				travelData.accommodation.map(accommodation =>
					db.insert(Accommodation).values({
						...accommodation,
						travelId: id,
					})
				)
			);
		}

		// Insert events with dependencies
		await this.insertEventsRecursively(travelData.events, id);

		return id;
	}

	async getTravelById(id: string): Promise<TravelWithId | null> {
		const [travel] = await db
			.select()
			.from(Travel)
			.where(eq(Travel.id, id));
		
		if (!travel) {
			return null;
		}

		const [accommodations, events] = await Promise.all([
			this.getAccommodationsByTravelId(id),
			this.getEventsByTravelId(id)
		]);

		return {
			id: travel.id,
			name: travel.name,
			destination: travel.destination,
			startDate: travel.startDate,
			endDate: travel.endDate,
			accommodation: accommodations,
			events: this.transformEventsWithDependencies(events),
			locationInfo: travel.locationInfo,
			visaInfo: travel.visaInfo,
		};
	}

	async getAllTravels(): Promise<TravelWithId[]> {
		const travels = await db.select().from(Travel);

		const result = await Promise.all(
			travels.map(async (travel) => {
				const [accommodations, events] = await Promise.all([
					this.getAccommodationsByTravelId(travel.id),
					this.getEventsByTravelId(travel.id)
				]);

				return {
					id: travel.id,
					name: travel.name,
					destination: travel.destination,
					startDate: travel.startDate,
					endDate: travel.endDate,
					accommodation: accommodations,
					events: this.transformEventsFlat(events),
					locationInfo: travel.locationInfo,
					visaInfo: travel.visaInfo,
				};
			})
		);

		return result;
	}

	private async getAccommodationsByTravelId(travelId: string) {
		const accommodations = await db
			.select()
			.from(Accommodation)
			.where(eq(Accommodation.travelId, travelId));

		return accommodations.map((acc) => ({
			id: acc.id,
			name: acc.name,
			type: acc.type as "hotel" | "hostel" | "airbnb" | "resort" | "other",
			startDate: acc.startDate,
			endDate: acc.endDate,
			address: acc.address || undefined,
			rating: acc.rating || undefined,
			price: acc.price || undefined,
			currency: acc.currency || undefined,
		}));
	}

	private async getEventsByTravelId(travelId: string) {
		return await db
			.select()
			.from(AppEvent)
			.where(eq(AppEvent.travelId, travelId));
	}

	private async insertEventsRecursively(
		events: TravelInput["events"], 
		travelId: string, 
		parentEventId?: string
	): Promise<void> {
		for (const event of events) {
			await db.insert(AppEvent).values({
				id: event.id,
				title: event.title,
				startDate: event.startDate,
				endDate: event.endDate,
				estimatedCost: event.estimatedCost,
				type: event.type,
				location: event.location,
				travelId,
				parentEventId,
			});
			
			// Insert dependencies recursively
			if (event.dependencies && event.dependencies.length > 0) {
				await this.insertEventsRecursively(event.dependencies, travelId, event.id);
			}
		}
	}

	private transformEventsWithDependencies(dbEvents: Awaited<ReturnType<typeof this.getEventsByTravelId>>) {
		type TransformedEvent = {
			id: string;
			title: string;
			startDate: Date;
			endDate: Date;
			estimatedCost?: number;
			type: "travel" | "food" | "activity";
			location?: string;
			dependencies: TransformedEvent[];
		};

		const eventMap = new Map<string, TransformedEvent>();
		const rootEvents: TransformedEvent[] = [];

		// First pass: create all events
		for (const event of dbEvents) {
			const transformedEvent: TransformedEvent = {
				id: event.id,
				title: event.title,
				startDate: event.startDate,
				endDate: event.endDate,
				estimatedCost: event.estimatedCost || undefined,
				type: event.type as "travel" | "food" | "activity",
				location: event.location || undefined,
				dependencies: [],
			};
			eventMap.set(event.id, transformedEvent);
		}

		// Second pass: build dependencies tree
		for (const event of dbEvents) {
			const transformedEvent = eventMap.get(event.id);
			if (event.parentEventId) {
				const parentEvent = eventMap.get(event.parentEventId);
				if (parentEvent && transformedEvent) {
					parentEvent.dependencies.push(transformedEvent);
				}
			} else if (transformedEvent) {
				rootEvents.push(transformedEvent);
			}
		}

		return rootEvents;
	}

	private transformEventsFlat(dbEvents: Awaited<ReturnType<typeof this.getEventsByTravelId>>) {
		return dbEvents.map((event) => ({
			id: event.id,
			title: event.title,
			startDate: event.startDate,
			endDate: event.endDate,
			estimatedCost: event.estimatedCost || undefined,
			type: event.type as "travel" | "food" | "activity",
			location: event.location || undefined,
		}));
	}
}

// Export singleton instance
export const travelDAO = new TravelDAO();