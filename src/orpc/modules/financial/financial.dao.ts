import { asc, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db/types";
import {
	Accommodation,
	AppEvent,
	Flight,
	Travel,
	TravelMember,
} from "@/lib/db/schema";
import type {
	TravelFinancialData,
	UpdateTravelBudgetInput,
} from "./financial.model";

export class FinancialDao {
	constructor(private readonly db: DB) {}

	async updateTravelBudget(input: UpdateTravelBudgetInput): Promise<void> {
		await this.db
			.update(Travel)
			.set({ budget: input.budget })
			.where(eq(Travel.id, input.travelId));
	}

	async getTravelFinancialData(
		travelId: string,
	): Promise<TravelFinancialData | null> {
		// Get travel budget
		const [travel] = await this.db
			.select({ id: Travel.id, budget: Travel.budget })
			.from(Travel)
			.where(eq(Travel.id, travelId));

		if (!travel) {
			return null;
		}

		const [{ value: participantsCount }] = await this.db
			.select({ value: sql<number>`cast(count(*) as integer)` })
			.from(TravelMember)
			.where(eq(TravelMember.travelId, travelId));

		// Get accommodations
		const accommodations = await this.db
			.select({
				id: Accommodation.id,
				name: Accommodation.name,
				price: Accommodation.price,
			})
			.from(Accommodation)
			.where(eq(Accommodation.travelId, travelId));

		// Get flights
		const flights = await this.db.query.Flight.findMany({
			where: eq(Flight.travelId, travelId),
			with: {
				participants: {
					columns: {
						id: true,
					},
				},
				slices: {
					orderBy: (fields, { asc: orderAsc }) => [orderAsc(fields.sliceIndex)],
					with: {
						segments: {
							orderBy: (fields, { asc: orderAsc }) => [
								orderAsc(fields.segmentIndex),
							],
						},
					},
				},
			},
			orderBy: [asc(Flight.createdAt)],
		});

		// Get events
		const events = await this.db
			.select({
				id: AppEvent.id,
				title: AppEvent.title,
				cost: AppEvent.cost,
				estimatedCost: AppEvent.estimatedCost,
				parentEventId: AppEvent.parentEventId,
			})
			.from(AppEvent)
			.where(eq(AppEvent.travelId, travelId));

		return {
			id: travel.id,
			budget: travel.budget,
			participantsCount: participantsCount ?? 0,
			accommodations: accommodations.map((acc) => ({
				id: acc.id,
				name: acc.name,
				price: acc.price ?? 0,
			})),
			flights: flights.map((flight) => {
				const firstSegment = flight.slices[0]?.segments[0];
				const lastSlice = flight.slices[flight.slices.length - 1];
				const lastSegment =
					lastSlice?.segments[lastSlice.segments.length - 1] ?? firstSegment;
				const origin = firstSegment?.originAirport ?? flight.originAirport;
				const destination =
					lastSegment?.destinationAirport ?? flight.destinationAirport;
				return {
					id: flight.id,
					airline: `${origin} → ${destination}`,
					cost: flight.totalAmount ?? flight.cost ?? 0,
					participantCount: flight.participants.length,
				};
			}),
			events: events.map((event) => ({
				id: event.id,
				name: event.title,
				cost: event.cost ?? 0,
				estimatedCost: event.estimatedCost ?? 0,
				parentEventId: event.parentEventId,
			})),
		};
	}
}
