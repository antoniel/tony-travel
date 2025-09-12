import type { DB } from "@/lib/db/types";
import {
	Flight,
	FlightParticipant,
	type InsertFlight,
	type InsertFlightParticipant,
	User,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export class FlightDAO {
	constructor(private readonly db: DB) {}
	async createFlight(flightData: InsertFlight): Promise<string> {
		const [flight] = await this.db
			.insert(Flight)
			.values(flightData)
			.returning({ id: Flight.id });

		return flight.id;
	}

	async findDuplicateFlight(
		travelId: string,
		originAirport: string,
		destinationAirport: string,
		cost?: number,
	): Promise<string | null> {
		const whereConditions = [
			eq(Flight.travelId, travelId),
			eq(Flight.originAirport, originAirport),
			eq(Flight.destinationAirport, destinationAirport),
		];

		if (cost !== undefined && cost !== null) {
			whereConditions.push(eq(Flight.cost, cost));
		}

		const flight = await this.db.query.Flight.findFirst({
			where: and(...whereConditions),
		});

		return flight?.id || null;
	}

	async getFlightsByTravel(travelId: string) {
		const flights = await this.db.query.Flight.findMany({
			where: eq(Flight.travelId, travelId),
			with: {
				participants: {
					with: {
						user: true,
					},
				},
			},
			orderBy: [Flight.originAirport, Flight.departureDate],
		});

		return flights;
	}

	async getFlightById(flightId: string) {
		const flight = await this.db.query.Flight.findFirst({
			where: eq(Flight.id, flightId),
			with: {
				participants: {
					with: {
						user: true,
					},
				},
			},
		});

		return flight;
	}

	async addFlightParticipant(
		flightId: string,
		userId: string,
	): Promise<string> {
		// Check if participant already exists
		const existing = await this.db.query.FlightParticipant.findFirst({
			where: and(
				eq(FlightParticipant.flightId, flightId),
				eq(FlightParticipant.userId, userId),
			),
		});

		if (existing) {
			return existing.id;
		}

		const [participant] = await this.db
			.insert(FlightParticipant)
			.values({ flightId, userId })
			.returning({ id: FlightParticipant.id });

		return participant.id;
	}

	async removeFlightParticipant(
		flightId: string,
		userId: string,
	): Promise<void> {
		await this.db
			.delete(FlightParticipant)
			.where(
				and(
					eq(FlightParticipant.flightId, flightId),
					eq(FlightParticipant.userId, userId),
				),
			);
	}

	async updateFlight(flightId: string, flightData: Partial<InsertFlight>): Promise<void> {
		await this.db
			.update(Flight)
			.set(flightData)
			.where(eq(Flight.id, flightId));
	}

	async deleteFlight(flightId: string): Promise<void> {
		// Delete all participants first (cascade should handle this, but being explicit)
		await this.db
			.delete(FlightParticipant)
			.where(eq(FlightParticipant.flightId, flightId));
		
		// Delete the flight
		await this.db.delete(Flight).where(eq(Flight.id, flightId));
	}

	async getUsersByTravel(travelId: string) {
		// This would need to be implemented based on how travel membership is handled
		// For now, returning empty array - this should be updated when travel membership is implemented
		return [];
	}
}

export const createFlightDAO = (db: DB) => new FlightDAO(db);
