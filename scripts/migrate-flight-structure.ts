#!/usr/bin/env bun
import { eq } from "drizzle-orm";

import { db } from "../src/lib/db/index";
import type { InsertFlight } from "../src/lib/db/schema";
import {
	Flight,
	FlightSegment,
	FlightSlice,
	newId,
} from "../src/lib/db/schema";

async function migrateLegacyFlights() {
	const flights = await db.query.Flight.findMany({
		with: {
			slices: {
				with: {
					segments: true,
				},
			},
		},
	});

	let migratedCount = 0;
	for (const flight of flights) {
		const hasSlices = flight.slices.length > 0;
		const updates: Partial<InsertFlight> = {};
		const now = new Date();

		if (flight.totalAmount == null && flight.cost != null) {
			updates.totalAmount = flight.cost;
		}

		if (!flight.currency) {
			updates.currency = "BRL";
		}

		await db.transaction(async (tx) => {
			let sliceId: string | null = null;

			if (!hasSlices) {
				sliceId = newId("flightSlice");
				await tx.insert(FlightSlice).values({
					id: sliceId,
					flightId: flight.id,
					sliceIndex: 0,
					originAirport: flight.originAirport,
					destinationAirport: flight.destinationAirport,
					durationMinutes: null,
					cabinClass: null,
					cabinClassMarketingName: null,
					createdAt: now,
					updatedAt: now,
				});

				await tx.insert(FlightSegment).values({
					id: newId("flightSegment"),
					sliceId,
					segmentIndex: 0,
					originAirport: flight.originAirport,
					destinationAirport: flight.destinationAirport,
					departureDate: flight.departureDate,
					departureTime: flight.departureTime,
					arrivalDate: flight.arrivalDate,
					arrivalTime: flight.arrivalTime,
					marketingFlightNumber: null,
					operatingCarrierCode: null,
					aircraftName: null,
					aircraftType: null,
					distanceMeters: null,
					durationMinutes: null,
					baggageAllowance: null,
					createdAt: now,
					updatedAt: now,
				});

				updates.legacyMigratedAt = now;
			}

			if (Object.keys(updates).length > 0) {
				await tx.update(Flight).set(updates).where(eq(Flight.id, flight.id));
			}
		});

		if (!hasSlices) {
			migratedCount += 1;
		}
	}

	// eslint-disable-next-line no-console
	console.log(`Migrated ${migratedCount} flight(s) to slices/segments structure.`);
}

await migrateLegacyFlights().then(
	() => {
		// eslint-disable-next-line no-console
		console.log("Flight migration complete.");
		process.exit(0);
	},
	(error) => {
		// eslint-disable-next-line no-console
		console.error("Flight migration failed", error);
		process.exit(1);
	},
);
