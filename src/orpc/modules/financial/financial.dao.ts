import { eq } from "drizzle-orm";
import type { DB } from "@/lib/db/types";
import { Accommodation, AppEvent, Flight, Travel } from "@/lib/db/schema";
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
		const flights = await this.db
			.select({
				id: Flight.id,
				originAirport: Flight.originAirport,
				destinationAirport: Flight.destinationAirport,
				cost: Flight.cost,
			})
			.from(Flight)
			.where(eq(Flight.travelId, travelId));

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
			accommodations: accommodations.map((acc) => ({
				id: acc.id,
				name: acc.name,
				price: acc.price ?? 0,
			})),
			flights: flights.map((flight) => ({
				id: flight.id,
				airline: `${flight.originAirport} → ${flight.destinationAirport}`,
				cost: flight.cost ?? 0,
			})),
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
