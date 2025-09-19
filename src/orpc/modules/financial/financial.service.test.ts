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
import { FinancialDao } from "./financial.dao";
import { getFinancialSummaryService } from "./financial.service";
import { createTravelDAO } from "../travel/travel.dao";
import { getFakeDb, testStub } from "@/tests/utils";
import { AppResult } from "@/orpc/appResult";

const OWNER_ID = "usr_owner";
const MEMBER_ID = "usr_member";
const TRAVEL_ID = "trv_financial_test";

async function seedBaseTravel(db: Awaited<ReturnType<typeof getFakeDb>>) {
	const owner = testStub.user({ id: OWNER_ID, email: "owner@test.com" });
	const member = testStub.user({ id: MEMBER_ID, email: "member@test.com" });

	await db.insert(User).values([owner, member]);

	const travel = testStub.travel({
		id: TRAVEL_ID,
		userId: OWNER_ID,
		budget: 12_000,
		name: "Viajando o Peru",
		destination: "Lima",
	});

	await db.insert(Travel).values(travel);

	await db.insert(TravelMember).values([
		{
			id: "trm_owner",
			travelId: TRAVEL_ID,
			userId: OWNER_ID,
			role: "owner",
			joinedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: "trm_member",
			travelId: TRAVEL_ID,
			userId: MEMBER_ID,
			role: "member",
			joinedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	]);
}

describe("getFinancialSummaryService", () => {
	it("scales shared costs by participant count", async () => {
		const db = await getFakeDb();
		await seedBaseTravel(db);

		await db.insert(Flight).values(
			testStub.flight({
				id: "flt_salvador_lima",
				travelId: TRAVEL_ID,
				originAirport: "SSA",
				destinationAirport: "LIM",
				departureDate: new Date("2025-01-01"),
				departureTime: "08:00",
				arrivalDate: new Date("2025-01-01"),
				arrivalTime: "13:00",
				cost: 4_000,
			}),
		);

		await db.insert(FlightParticipant).values([
			testStub.flightParticipant({
				id: "flp_owner",
				flightId: "flt_salvador_lima",
				userId: OWNER_ID,
			}),
			testStub.flightParticipant({
				id: "flp_member",
				flightId: "flt_salvador_lima",
				userId: MEMBER_ID,
			}),
		]);

		const financialDao = new FinancialDao(db);
		const travelDao = createTravelDAO(db);

		const result = await getFinancialSummaryService(
			financialDao,
			travelDao,
			TRAVEL_ID,
			OWNER_ID,
		);

		expect(AppResult.isSuccess(result)).toBe(true);
		if (!AppResult.isSuccess(result)) {
			return;
		}

		const summary = result.data;

		expect(summary.participantsCount).toBe(2);
		expect(summary.group.totalExpenses).toBe(8_000);
		expect(summary.perPerson.totalExpenses).toBe(4_000);

		const flightsCategory = summary.categories.find(
			(category) => category.category === "passagens",
		);
		expect(flightsCategory?.total).toBe(8_000);
	});

	it("includes accommodations and attractions using the same shared scaling", async () => {
		const db = await getFakeDb();
		await seedBaseTravel(db);

		await db.insert(Accommodation).values(
			testStub.accommodation({
				id: "acm_hotel",
				travelId: TRAVEL_ID,
				name: "Hotel Central",
				price: 2_500,
			}),
		);

		await db.insert(AppEvent).values([
			testStub.appEvent({
				id: "evt_passeio",
				travelId: TRAVEL_ID,
				title: "Tour em Cusco",
				cost: 500,
				parentEventId: null,
			}),
		]);

		const financialDao = new FinancialDao(db);
		const travelDao = createTravelDAO(db);

		const result = await getFinancialSummaryService(
			financialDao,
			travelDao,
			TRAVEL_ID,
			OWNER_ID,
		);

		expect(AppResult.isSuccess(result)).toBe(true);
		if (!AppResult.isSuccess(result)) {
			return;
		}

		const summary = result.data;

		// Per person: hotel(2_500 total / 2) + passeio(500) = 1_750
		// Group: hotel(2_500 total) + passeio(500*2) = 3_500
		expect(summary.perPerson.totalExpenses).toBe(1_750);
		expect(summary.group.totalExpenses).toBe(3_500);

		const accommodations = summary.categories.find(
			(category) => category.category === "acomodacoes",
		);
		expect(accommodations?.total).toBe(2_500);

		const attractions = summary.categories.find(
			(category) => category.category === "atracoes",
		);
		expect(attractions?.total).toBe(1_000); // 500 per person * 2
	});
});
