import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import { ALWAYS_USER_TEST, AUTH_TEST_HEADERS, getFakeDb } from "@/tests/utils";
import { call } from "@orpc/server";
import { beforeAll, describe, expect, it } from "vitest";

describe("flight", () => {
	let db: DB;
	beforeAll(async () => {
		db = await getFakeDb();
	});
	it("addFlightParticipant", async () => {
		await expect(
			call(
				router.flightRoutes.addFlightParticipant,
				{ flightId: "1", userId: ALWAYS_USER_TEST.id },
				{ context: { db: db, reqHeaders: AUTH_TEST_HEADERS } },
			),
		).resolves.toEqual([
			{ id: "1", name: "Earth" },
			{ id: "2", name: "Mars" },
		]);
	});
});
