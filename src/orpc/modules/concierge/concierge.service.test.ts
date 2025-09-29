import { describe, expect, it } from "vitest";

import {
	Accommodation,
	AppEvent,
	Flight,
	FlightParticipant,
	Travel,
	TravelMember,
	User,
} from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import { getFakeDb, testStub } from "@/tests/utils";

import { createFlightDAO } from "../flight/flight.dao";
import { createTravelDAO } from "../travel/travel.dao";
import { getPendingIssuesService } from "./concierge.service";

describe("getPendingIssuesService", () => {
	it("identifies missing flights, uncovered accommodations and empty itinerary", async () => {
		const db = await getFakeDb();
		const travelDAO = createTravelDAO(db);
		const flightDAO = createFlightDAO(db);

		const owner = testStub.user({
			id: "usr_pending_owner",
			email: "owner-pending@test.com",
			name: "Alice",
		});
		const memberOne = testStub.user({
			id: "usr_pending_member_one",
			email: "member-one@test.com",
			name: "Bruno",
		});
		const memberTwo = testStub.user({
			id: "usr_pending_member_two",
			email: "member-two@test.com",
			name: "Carla",
		});

		await db.insert(User).values([owner, memberOne, memberTwo]);

		const travel = testStub.travel({
			id: "trv_pending_checks",
			userId: owner.id,
			startDate: new Date("2025-01-10T00:00:00Z"),
			endDate: new Date("2025-01-14T00:00:00Z"),
			name: "Viagem com pendências",
		});
		await db.insert(Travel).values(travel);

		await db.insert(TravelMember).values([
			testStub.travelMember({
				id: "trm_pending_owner",
				travelId: travel.id,
				userId: owner.id,
				role: "owner",
			}),
			testStub.travelMember({
				id: "trm_pending_member_one",
				travelId: travel.id,
				userId: memberOne.id,
				role: "member",
			}),
			testStub.travelMember({
				id: "trm_pending_member_two",
				travelId: travel.id,
				userId: memberTwo.id,
				role: "member",
			}),
		]);

		const flight = testStub.flight({
			id: "flt_owner_trip",
			travelId: travel.id,
			originAirport: "GRU",
			destinationAirport: "JFK",
			departureDate: new Date("2025-01-10T00:00:00Z"),
			departureTime: "09:00",
			arrivalDate: new Date("2025-01-10T00:00:00Z"),
			arrivalTime: "17:00",
			metadata: {
				flightId: "",
				sliceId: "",
				isConsolidated: false,
				isPreTripFlight: false,
				originalSegments: [],
			},
		});
		await db.insert(Flight).values({ ...flight, metadata: {} });

		await db.insert(FlightParticipant).values(
			testStub.flightParticipant({
				id: "flp_owner_participant",
				flightId: flight.id,
				userId: owner.id,
			}),
		);

		const stay = testStub.accommodation({
			id: "acm_partial_cover",
			travelId: travel.id,
			name: "Hotel Central",
			startDate: new Date("2025-01-10T00:00:00Z"),
			endDate: new Date("2025-01-12T00:00:00Z"),
			price: 500,
		});
		await db.insert(Accommodation).values(stay);

		const result = await getPendingIssuesService(
			travelDAO,
			flightDAO,
			travel.id,
		);
		expect(AppResult.isSuccess(result)).toBe(true);
		if (!AppResult.isSuccess(result)) {
			return;
		}

		const { issues, hasCritical, criticalCount, advisoryCount } = result.data;
		expect(issues).toHaveLength(3);
		expect(hasCritical).toBe(true);
		expect(criticalCount).toBe(2);
		expect(advisoryCount).toBe(1);

		const flightIssue = issues.find((issue) => issue.type === "flight");
		expect(flightIssue?.missingCount).toBe(2);
		expect(
			flightIssue?.affectedTravelers.map((traveler) => traveler.id).sort(),
		).toEqual([memberOne.id, memberTwo.id].sort());

		const accommodationsIssue = issues.find(
			(issue) => issue.type === "accommodation",
		);
		expect(accommodationsIssue?.missingCount).toBe(2);
		expect(accommodationsIssue?.gapRanges).toEqual([
			{ start: "2025-01-12", end: "2025-01-13" },
		]);
		expect(accommodationsIssue?.description).toContain("12");

		const eventsIssue = issues.find((issue) => issue.type === "event");
		expect(eventsIssue).toBeDefined();
		expect(eventsIssue?.severity).toBe("advisory");
	});

	it("returns empty issues when travel data is complete", async () => {
		const db = await getFakeDb();
		const travelDAO = createTravelDAO(db);
		const flightDAO = createFlightDAO(db);

		const owner = testStub.user({
			id: "usr_complete_owner",
			email: "owner-complete@test.com",
			name: "Daniel",
		});
		const member = testStub.user({
			id: "usr_complete_member",
			email: "member-complete@test.com",
			name: "Eva",
		});

		await db.insert(User).values([owner, member]);

		const travel = testStub.travel({
			id: "trv_complete_checks",
			userId: owner.id,
			startDate: new Date("2025-02-01T00:00:00Z"),
			endDate: new Date("2025-02-05T00:00:00Z"),
			name: "Viagem completa",
		});
		await db.insert(Travel).values(travel);

		await db.insert(TravelMember).values([
			testStub.travelMember({
				id: "trm_complete_owner",
				travelId: travel.id,
				userId: owner.id,
				role: "owner",
			}),
			testStub.travelMember({
				id: "trm_complete_member",
				travelId: travel.id,
				userId: member.id,
				role: "member",
			}),
		]);

		const flight = testStub.flight({
			id: "flt_complete_shared",
			travelId: travel.id,
			originAirport: "GRU",
			destinationAirport: "MIA",
			departureDate: new Date("2025-02-01T00:00:00Z"),
			departureTime: "10:00",
			arrivalDate: new Date("2025-02-01T00:00:00Z"),
			arrivalTime: "16:00",
		});
		await db.insert(Flight).values({ ...flight, metadata: {} });

		await db.insert(FlightParticipant).values([
			testStub.flightParticipant({
				id: "flp_complete_owner",
				flightId: flight.id,
				userId: owner.id,
			}),
			testStub.flightParticipant({
				id: "flp_complete_member",
				flightId: flight.id,
				userId: member.id,
			}),
		]);

		const fullStay = testStub.accommodation({
			id: "acm_complete_stay",
			travelId: travel.id,
			startDate: new Date("2025-02-01T00:00:00Z"),
			endDate: new Date("2025-02-05T00:00:00Z"),
			name: "Resort Vista Mar",
			price: 3200,
		});
		await db.insert(Accommodation).values(fullStay);

		const event = testStub.appEvent({
			id: "evt_city_tour",
			travelId: travel.id,
			title: "City Tour",
			startDate: new Date("2025-02-02T10:00:00Z"),
			endDate: new Date("2025-02-02T14:00:00Z"),
			cost: 200,
			parentEventId: null,
		});
		await db.insert(AppEvent).values(event);

		const result = await getPendingIssuesService(
			travelDAO,
			flightDAO,
			travel.id,
		);
		expect(AppResult.isSuccess(result)).toBe(true);
		if (!AppResult.isSuccess(result)) {
			return;
		}

		const summary = result.data;
		expect(summary.hasIssues).toBe(false);
		expect(summary.issues).toHaveLength(0);
		expect(summary.criticalCount).toBe(0);
		expect(summary.advisoryCount).toBe(0);
	});

	it("fails with TRAVEL_NOT_FOUND when travel does not exist", async () => {
		const db = await getFakeDb();
		const travelDAO = createTravelDAO(db);
		const flightDAO = createFlightDAO(db);

		const result = await getPendingIssuesService(
			travelDAO,
			flightDAO,
			"trv_missing",
		);

		expect(AppResult.isFailure(result)).toBe(true);
		if (!AppResult.isFailure(result)) {
			return;
		}

		expect(result.error.type).toBe("TRAVEL_NOT_FOUND");
	});
});
