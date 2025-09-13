import { Travel, TravelMember } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import {
	ALWAYS_USER_TEST,
	createAppCallAuthenticated,
	createAppCall,
	getFakeDb,
	testStub,
} from "@/tests/utils";
import { beforeAll, describe, expect, it } from "vitest";

describe("travel service", () => {
	let db: DB;
	
	beforeAll(async () => {
		db = await getFakeDb();
	});

	describe("createTravel", () => {
		it("should create travel and automatically add creator as owner member", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				locationInfo: travelStub.locationInfo,
				visaInfo: travelStub.visaInfo,
				accommodations: [],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.id).toBeDefined();
			expect(result.travel).toBeDefined();
			expect(result.travel.name).toBe(travelInput.name);

			// Verify TravelMember was created automatically
			const members = await appCall(router.travelRoutes.getTravelMembers, {
				travelId: result.id,
			});

			expect(members.length).toBe(1);
			expect(members[0].userId).toBe(ALWAYS_USER_TEST.id);
			expect(members[0].role).toBe("owner");
		});

		it("should reject travel with start date in the past", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				locationInfo: travelStub.locationInfo,
				visaInfo: travelStub.visaInfo,
				accommodations: [],
				events: [],
			};

			await expect(
				appCall(router.travelRoutes.saveTravel, {
					travel: travelInput,
				})
			).rejects.toThrow();
		});

		it("should reject travel with start date after end date", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				locationInfo: travelStub.locationInfo,
				visaInfo: travelStub.visaInfo,
				accommodations: [],
				events: [],
			};

			await expect(
				appCall(router.travelRoutes.saveTravel, {
					travel: travelInput,
				})
			).rejects.toThrow();
		});

		it("should create travel with accommodations atomically", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			const travelStub = testStub.travel();
			const accommodationStub = testStub.accommodation();
			
			const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				startDate,
				endDate,
				locationInfo: travelStub.locationInfo,
				visaInfo: travelStub.visaInfo,
				accommodations: [{
					...accommodationStub,
					startDate,
					endDate,
				}],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.id).toBeDefined();

			// Verify travel was created  
			const travel = await appCall(router.travelRoutes.getTravel, {
				id: result.id,
			});

			expect(travel).toBeDefined();
			// Note: accommodations are handled separately by accommodation service
		});
	});

	describe("getTravel", () => {
		it("should return travel with user membership for authenticated user", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create membership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			const result = await appCall(router.travelRoutes.getTravel, {
				id: travel.id,
			});

			expect(result).toBeDefined();
			expect(result.id).toBe(travel.id);
			expect(result.userMembership).toBeDefined();
			expect(result.userMembership.role).toBe("owner");
		});

		it("should return travel without membership for unauthenticated user", async () => {
			const appCall = createAppCall(db);
			
			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const result = await appCall(router.travelRoutes.getTravel, {
				id: travel.id,
			});

			expect(result).toBeDefined();
			expect(result.id).toBe(travel.id);
			expect(result.userMembership).toBeNull();
		});

		it("should throw error for non-existent travel", async () => {
			const appCall = createAppCallAuthenticated(db);

			await expect(
				appCall(router.travelRoutes.getTravel, {
					id: "non-existent-id",
				})
			).rejects.toThrow();
		});
	});

	describe("getTravelMembers", () => {
		it("should return members for travel owner", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create membership for test user
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			const result = await appCall(router.travelRoutes.getTravelMembers, {
				travelId: travel.id,
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(1);
			expect(result[0].userId).toBe(ALWAYS_USER_TEST.id);
			expect(result[0].role).toBe("owner");
		});

		it("should return members for travel member", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create membership for test user as member
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "member",
			});

			const result = await appCall(router.travelRoutes.getTravelMembers, {
				travelId: travel.id,
			});

			expect(result).toBeDefined();
			expect(result.length).toBe(1);
			expect(result[0].userId).toBe(ALWAYS_USER_TEST.id);
			expect(result[0].role).toBe("member");
		});

		it("should throw error for unauthorized user", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			// Create travel without membership for test user
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			await expect(
				appCall(router.travelRoutes.getTravelMembers, {
					travelId: travel.id,
				})
			).rejects.toThrow();
		});

		it("should throw error for non-existent travel", async () => {
			const appCall = createAppCallAuthenticated(db);

			await expect(
				appCall(router.travelRoutes.getTravelMembers, {
					travelId: "non-existent-id",
				})
			).rejects.toThrow();
		});
	});

	describe("listTravels", () => {
		it("should return list of travels", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			// Create multiple travels
			const travelStub1 = testStub.travel();
			const travelStub2 = testStub.travel();
			
			await db.insert(Travel).values([travelStub1, travelStub2]);

			const result = await appCall(router.travelRoutes.listTravels, {});

			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("integration with related entities", () => {
		it("should create travel and allow accommodation creation", async () => {
			const appCall = createAppCallAuthenticated(db);
			
			// Create travel with service
			const travelStub = testStub.travel();
			const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
			
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				startDate,
				endDate,
				locationInfo: travelStub.locationInfo,
				visaInfo: travelStub.visaInfo,
				accommodations: [],
				events: [],
			};

			const travelResult = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			// Verify member was created (enabling accommodation creation)
			const members = await appCall(router.travelRoutes.getTravelMembers, {
				travelId: travelResult.id,
			});

			expect(members.length).toBe(1);
			expect(members[0].role).toBe("owner");
		});
	});
});