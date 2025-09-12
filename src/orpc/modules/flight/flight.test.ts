import { Travel } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import {
	ALWAYS_USER_TEST,
	createAppCallAuthenticated,
	getFakeDb,
	testStub,
} from "@/tests/utils";
import { beforeAll, describe, expect, it } from "vitest";

describe("flight", () => {
	let db: DB;
	beforeAll(async () => {
		db = await getFakeDb();
	});
	it("createFlight", async () => {
		const appCall = createAppCallAuthenticated(db);
		const travelStub = testStub.travel();
		const [travel] = await db
			.insert(Travel)
			.values(travelStub)
			.returning({ id: Travel.id });

		const flightStub = testStub.flight.generate();

		await appCall(router.flightRoutes.createFlight, {
			flight: flightStub,
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
	});
});
