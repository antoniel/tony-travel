import type { DB } from "@/lib/db/types";
import { AppEvent, type InsertAppEvent } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ImageMetadata } from "./event.model";

export class EventDAO {
	constructor(private readonly db: DB) {}

	/**
	 * Create a new event
	 */
	async createEvent(eventData: InsertAppEvent): Promise<string> {
		const [event] = await this.db
			.insert(AppEvent)
			.values(eventData)
			.returning({ id: AppEvent.id });

		return event.id;
	}

	/**
	 * Get event by ID
	 */
	async getEventById(eventId: string) {
		const event = await this.db.query.AppEvent.findFirst({
			where: eq(AppEvent.id, eventId),
			with: {
				travel: true,
				dependencies: true,
			},
		});

		return event || null;
	}

	/**
	 * Get all events for a travel
	 */
	async getEventsByTravelId(travelId: string) {
		const events = await this.db.query.AppEvent.findMany({
			where: eq(AppEvent.travelId, travelId),
			with: {
				dependencies: true,
			},
			orderBy: (events, { asc }) => [asc(events.startDate)],
		});

		return events;
	}

	/**
	 * Update event image and metadata
	 */
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

	/**
	 * Update event details
	 */
	async updateEvent(eventId: string, updateData: Partial<InsertAppEvent>) {
		const [updatedEvent] = await this.db
			.update(AppEvent)
			.set(updateData)
			.where(eq(AppEvent.id, eventId))
			.returning();

		return updatedEvent;
	}

	/**
	 * Delete event by ID
	 */
	async deleteEvent(eventId: string): Promise<boolean> {
		const result = await this.db
			.delete(AppEvent)
			.where(eq(AppEvent.id, eventId));

		return result.rowsAffected > 0;
	}

	/**
	 * Bulk insert events for a travel (used during travel creation)
	 */
	async insertEventsForTravel(
		events: Omit<InsertAppEvent, "id">[],
		travelId: string,
		parentEventId?: string,
	): Promise<string[]> {
		const eventsWithTravel = events.map((event) => ({
			...event,
			travelId,
			parentEventId,
		}));

		const insertedEvents = await this.db
			.insert(AppEvent)
			.values(eventsWithTravel)
			.returning({ id: AppEvent.id });

		return insertedEvents.map((event) => event.id);
	}
}

export const createEventDAO = (db: DB) => new EventDAO(db);