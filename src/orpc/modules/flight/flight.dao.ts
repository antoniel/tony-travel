import {
	Flight,
	FlightParticipant,
	FlightSegment,
	FlightSlice,
	type InsertFlight,
} from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { and, asc, eq } from "drizzle-orm";
import type { FlightSliceInput } from "./flight.model";

export class FlightDAO {
	constructor(private readonly db: DB) {}

	async createFlight(
		flightData: InsertFlight,
		slices: FlightSliceInput[],
	): Promise<string> {
		return this.db.transaction(async (tx) => {
			const [flight] = await tx
				.insert(Flight)
				.values(flightData)
				.returning({ id: Flight.id });

			await this.replaceFlightStructure(tx as unknown as DB, flight.id, slices);

			return flight.id;
		});
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
				slices: {
					with: {
						segments: {
							orderBy: (fields, { asc: orderAsc }) => [
								orderAsc(fields.segmentIndex),
							],
						},
					},
					orderBy: (fields, { asc: orderAsc }) => [orderAsc(fields.sliceIndex)],
				},
			},
			orderBy: [asc(Flight.departureDate)],
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
				slices: {
					with: {
						segments: {
							orderBy: (fields, { asc: orderAsc }) => [
								orderAsc(fields.segmentIndex),
							],
						},
					},
					orderBy: (fields, { asc: orderAsc }) => [orderAsc(fields.sliceIndex)],
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

	async updateFlight(
		flightId: string,
		flightData: Partial<InsertFlight>,
		slices?: FlightSliceInput[],
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx.update(Flight).set(flightData).where(eq(Flight.id, flightId));

			if (slices && slices.length > 0) {
				await this.replaceFlightStructure(
					tx as unknown as DB,
					flightId,
					slices,
				);
			}
		});
	}

	async deleteFlight(flightId: string): Promise<void> {
		// Delete all participants first (cascade should handle this, but being explicit)
		await this.db
			.delete(FlightParticipant)
			.where(eq(FlightParticipant.flightId, flightId));

		await this.db.delete(Flight).where(eq(Flight.id, flightId));
	}

	private async replaceFlightStructure(
		tx: DB,
		flightId: string,
		slices: FlightSliceInput[],
	): Promise<void> {
		await tx.delete(FlightSlice).where(eq(FlightSlice.flightId, flightId));

		for (const [sliceIndex, slice] of slices.entries()) {
			const [createdSlice] = await tx
				.insert(FlightSlice)
				.values({
					flightId,
					sliceIndex,
					originAirport: slice.originAirport,
					destinationAirport: slice.destinationAirport,
					durationMinutes: slice.durationMinutes ?? null,
					cabinClass: slice.cabinClass ?? null,
					cabinClassMarketingName: slice.cabinClassMarketingName ?? null,
				})
				.returning({ id: FlightSlice.id });

			for (const [segmentIndex, segment] of slice.segments.entries()) {
				await tx.insert(FlightSegment).values({
					sliceId: createdSlice.id,
					segmentIndex,
					originAirport: segment.originAirport,
					destinationAirport: segment.destinationAirport,
					departureDate: segment.departureDate,
					departureTime: segment.departureTime,
					arrivalDate: segment.arrivalDate,
					arrivalTime: segment.arrivalTime,
					marketingFlightNumber: segment.marketingFlightNumber ?? null,
					operatingCarrierCode: segment.operatingCarrierCode ?? null,
					aircraftName: segment.aircraftName ?? null,
					aircraftType: segment.aircraftType ?? null,
					distanceMeters: segment.distanceMeters ?? null,
					durationMinutes: segment.durationMinutes ?? null,
					baggageAllowance: segment.baggageAllowance ?? null,
				});
			}
		}
	}
}

export const createFlightDAO = (db: DB) => new FlightDAO(db);
