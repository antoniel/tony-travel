import { Travel } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import {
	ALWAYS_USER_TEST,
	createAppCallAuthenticated,
	getFakeDb,
	testStub,
} from "@/tests/utils";
import { beforeEach, describe, expect, it } from "vitest";

describe("flight", () => {
	let db: DB;
	beforeEach(async () => {
		db = await getFakeDb();
	});
	it("createFlight", async () => {
		const appCall = createAppCallAuthenticated(db);
		const travelStub = testStub.travel();
		const [travel] = await db
			.insert(Travel)
			.values(travelStub)
			.returning({ id: Travel.id });

		await appCall(router.flightRoutes.createFlight, {
			flight: {
				totalAmount: 1200,
				currency: "BRL",
				slices: [
					{
						originAirport: "SSA",
						destinationAirport: "GRU",
						durationMinutes: 150,
						segments: [
							{
								originAirport: "SSA",
								destinationAirport: "GRU",
								departureDate: new Date("2025-02-01"),
								departureTime: "08:00",
								arrivalDate: new Date("2025-02-01"),
								arrivalTime: "10:30",
								marketingFlightNumber: "3456",
								operatingCarrierCode: "LA",
								aircraftName: "Airbus A320",
								aircraftType: "A320",
								distanceMeters: 1460000,
								durationMinutes: 150,
								baggageAllowance: null,
							},
						],
					},
				],
			},
			travelId: travel.id,
			participantIds: [ALWAYS_USER_TEST.id],
		});

		const flightsByTravel = await appCall(
			router.flightRoutes.getFlightsByTravel,
			{
				travelId: travel.id,
			},
		);
		await expect(flightsByTravel.length).toEqual(1);
		const [group] = flightsByTravel;
		expect(group.originAirport).toBe("SSA");
		expect(group.flights[0].slices[0].segments[0].destinationAirport).toBe(
			"GRU",
		);
	});

	it("updateFlight - should update total amount and flight details", async () => {
		const appCall = createAppCallAuthenticated(db);
		const travelStub = testStub.travel();
		const [travel] = await db
			.insert(Travel)
			.values(travelStub)
			.returning({ id: Travel.id });

		// Create initial flight
		const createResult = await appCall(router.flightRoutes.createFlight, {
			flight: {
				totalAmount: 1200,
				currency: "USD",
				slices: [
					{
						originAirport: "GRU",
						destinationAirport: "LIM",
						durationMinutes: 305,
						cabinClass: "economy",
						segments: [
							{
								originAirport: "GRU",
								destinationAirport: "LIM",
								departureDate: new Date("2026-01-13T00:00:00.000Z"),
								departureTime: "09:10",
								arrivalDate: new Date("2026-01-13T00:00:00.000Z"),
								arrivalTime: "14:15",
								marketingFlightNumber: "H25563",
								operatingCarrierCode: "H2",
								distanceMeters: null,
								durationMinutes: 305,
							},
						],
					},
				],
			},
			travelId: travel.id,
			participantIds: [ALWAYS_USER_TEST.id],
		});

		// Update flight with new total amount and return segment
		await appCall(router.flightRoutes.updateFlight, {
			id: createResult.id,
			flight: {
				totalAmount: 1800, // Updated amount from curl
				currency: "BRL", // Updated currency from curl
				slices: [
					{
						originAirport: "GRU",
						destinationAirport: "LIM",
						durationMinutes: 305,
						cabinClass: "economy",
						segments: [
							{
								originAirport: "GRU",
								destinationAirport: "LIM",
								departureDate: new Date("2026-01-13T00:00:00.000Z"),
								departureTime: "09:10",
								arrivalDate: new Date("2026-01-13T00:00:00.000Z"),
								arrivalTime: "14:15",
								marketingFlightNumber: "H25563",
								operatingCarrierCode: "H2",
								distanceMeters: null,
								durationMinutes: 305,
							},
						],
					},
					// Add return flight slice from curl
					{
						originAirport: "LIM",
						destinationAirport: "GRU",
						durationMinutes: 320,
						cabinClass: "economy",
						segments: [
							{
								originAirport: "LIM",
								destinationAirport: "GRU",
								departureDate: new Date("2026-01-26T00:00:00.000Z"),
								departureTime: "02:30",
								arrivalDate: new Date("2026-01-26T00:00:00.000Z"),
								arrivalTime: "07:50",
								marketingFlightNumber: "H25562",
								operatingCarrierCode: "H2",
								distanceMeters: null,
								durationMinutes: 320,
							},
						],
					},
				],
			},
		});

		// Verify the updated flight details
		const updatedFlights = await appCall(
			router.flightRoutes.getFlightsByTravel,
			{
				travelId: travel.id,
			},
		);

		expect(updatedFlights.length).toEqual(1);
		const [updatedGroup] = updatedFlights;

		// Verify total amount was updated
		expect(updatedGroup.flights[0].totalAmount).toBe(1800);
		expect(updatedGroup.flights[0].currency).toBe("BRL");

		// Verify both slices exist (outbound and return)
		expect(updatedGroup.flights[0].slices).toHaveLength(2);

		// Verify outbound slice
		const outboundSlice = updatedGroup.flights[0].slices[0];
		expect(outboundSlice.originAirport).toBe("GRU");
		expect(outboundSlice.destinationAirport).toBe("LIM");
		expect(outboundSlice.segments[0].marketingFlightNumber).toBe("H25563");

		// Verify return slice
		const returnSlice = updatedGroup.flights[0].slices[1];
		expect(returnSlice.originAirport).toBe("LIM");
		expect(returnSlice.destinationAirport).toBe("GRU");
		expect(returnSlice.segments[0].marketingFlightNumber).toBe("H25562");
	});
});
