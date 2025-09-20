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
});
