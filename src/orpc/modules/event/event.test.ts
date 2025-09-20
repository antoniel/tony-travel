import { AppEvent, Travel, TravelMember } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import {
	ALWAYS_USER_TEST,
	createAppCallAuthenticated,
	getFakeDb,
	testStub,
} from "@/tests/utils";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

describe("event routes - createEvent", () => {
	let db: DB;

	beforeEach(async () => {
		db = await getFakeDb();
	});

	const insertTravelWithMember = async (travelDates: {
		startDate: Date;
		endDate: Date;
	}) => {
		const travelStub = testStub.travel(travelDates);
		const [travel] = await db.insert(Travel).values(travelStub).returning({
			id: Travel.id,
		});

		await db.insert(TravelMember).values(
			testStub.travelMember({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			}),
		);

		return travel;
	};

	it("creates an event within the travel range", async () => {
		const travelStart = new Date("2030-01-10T00:00:00.000Z");
		const travelEnd = new Date("2030-01-20T00:00:00.000Z");
		const travel = await insertTravelWithMember({
			startDate: travelStart,
			endDate: travelEnd,
		});

		const appCall = createAppCallAuthenticated(db);
		const eventStart = new Date("2030-01-12T10:00:00.000Z");
		const eventEnd = new Date("2030-01-12T12:00:00.000Z");

		const result = await appCall(router.eventRoutes.createEvent, {
			title: "City tour",
			startDate: eventStart,
			endDate: eventEnd,
			travelId: travel.id,
			type: "activity",
			location: "Downtown",
		});

		expect(result.eventId).toBeDefined();

		const storedEvent = await db.query.AppEvent.findFirst({
			where: and(
				eq(AppEvent.travelId, travel.id),
				eq(AppEvent.id, result.eventId ?? ""),
			),
		});

		expect(storedEvent).not.toBeNull();
		expect(storedEvent?.startDate.toISOString()).toBe(eventStart.toISOString());
		expect(storedEvent?.endDate.toISOString()).toBe(eventEnd.toISOString());
	});

	it("allows events that end later on the last travel day when end date is normalized midnight", async () => {
		const travelStart = new Date("2031-03-18T00:00:00.000Z");
		const travelEnd = new Date("2031-03-20T00:00:00.000Z");
		const travel = await insertTravelWithMember({
			startDate: travelStart,
			endDate: travelEnd,
		});

		const appCall = createAppCallAuthenticated(db);
		const eventStart = new Date("2031-03-20T10:00:00.000Z");
		const eventEnd = new Date("2031-03-20T18:00:00.000Z");

		const result = await appCall(router.eventRoutes.createEvent, {
			title: "Passeio final",
			startDate: eventStart,
			endDate: eventEnd,
			travelId: travel.id,
			type: "activity",
		});

		expect(result.eventId).toBeDefined();
		const storedEvent = await db.query.AppEvent.findFirst({
			where: and(
				eq(AppEvent.travelId, travel.id),
				eq(AppEvent.id, result.eventId ?? ""),
			),
		});

		expect(storedEvent?.endDate.toISOString()).toBe(eventEnd.toISOString());
	});

	it("rejects event starting before the travel start date", async () => {
		const travelStart = new Date("2030-02-10T00:00:00.000Z");
		const travelEnd = new Date("2030-02-15T00:00:00.000Z");
		const travel = await insertTravelWithMember({
			startDate: travelStart,
			endDate: travelEnd,
		});

		const appCall = createAppCallAuthenticated(db);

		await expect(
			appCall(router.eventRoutes.createEvent, {
				title: "Breakfast",
				startDate: new Date("2030-02-09T08:00:00.000Z"),
				endDate: new Date("2030-02-09T09:00:00.000Z"),
				travelId: travel.id,
				type: "food",
			}),
		).rejects.toThrow();
	});

	it("rejects event ending after the travel end date", async () => {
		const travelStart = new Date("2030-03-01T00:00:00.000Z");
		const travelEnd = new Date("2030-03-05T00:00:00.000Z");
		const travel = await insertTravelWithMember({
			startDate: travelStart,
			endDate: travelEnd,
		});

		const appCall = createAppCallAuthenticated(db);

		await expect(
			appCall(router.eventRoutes.createEvent, {
				title: "Closing dinner",
				startDate: new Date("2030-03-05T20:00:00.000Z"),
				endDate: new Date("2030-03-06T21:00:00.000Z"),
				travelId: travel.id,
				type: "food",
			}),
		).rejects.toThrow();
	});

	it("allows event starting exactly at travel start date", async () => {
		const travelStart = new Date("2031-01-10T09:00:00.000Z");
		const travelEnd = new Date("2031-01-10T18:00:00.000Z");
		const travel = await insertTravelWithMember({
			startDate: travelStart,
			endDate: travelEnd,
		});

		const appCall = createAppCallAuthenticated(db);
		const eventStart = new Date(travelStart);
		const eventEnd = new Date("2031-01-10T10:00:00.000Z");

		const result = await appCall(router.eventRoutes.createEvent, {
			title: "Check-in",
			startDate: eventStart,
			endDate: eventEnd,
			travelId: travel.id,
			type: "activity",
		});

		expect(result.eventId).toBeDefined();
		const saved = await db.query.AppEvent.findFirst({
			where: and(
				eq(AppEvent.travelId, travel.id),
				eq(AppEvent.id, result.eventId ?? ""),
			),
		});
		expect(saved?.startDate.toISOString()).toBe(eventStart.toISOString());
		expect(saved?.endDate.toISOString()).toBe(eventEnd.toISOString());
	});

	it("allows event ending exactly at travel end date", async () => {
		const travelStart = new Date("2031-02-01T08:00:00.000Z");
		const travelEnd = new Date("2031-02-01T20:00:00.000Z");
		const travel = await insertTravelWithMember({
			startDate: travelStart,
			endDate: travelEnd,
		});

		const appCall = createAppCallAuthenticated(db);
		const eventStart = new Date("2031-02-01T19:00:00.000Z");
		const eventEnd = new Date(travelEnd);

		const result = await appCall(router.eventRoutes.createEvent, {
			title: "Wrap up",
			startDate: eventStart,
			endDate: eventEnd,
			travelId: travel.id,
			type: "activity",
		});

		expect(result.eventId).toBeDefined();
		const saved = await db.query.AppEvent.findFirst({
			where: and(
				eq(AppEvent.travelId, travel.id),
				eq(AppEvent.id, result.eventId ?? ""),
			),
		});
		expect(saved?.startDate.toISOString()).toBe(eventStart.toISOString());
		expect(saved?.endDate.toISOString()).toBe(eventEnd.toISOString());
	});
});
