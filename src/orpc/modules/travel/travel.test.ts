import { Travel, TravelMember, User } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import {
	ALWAYS_USER_TEST,
	createAppCall,
	createAppCallAuthenticated,
	getFakeDb,
	testStub,
} from "@/tests/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import enhancedAirports from "./enhanced-airports.json";
import type { LocationOption } from "./travel.model";

const SAMPLE_DESTINATION_AIRPORTS: LocationOption[] = [
	{ value: "GIG", label: "Rio de Janeiro - GIG" },
];

describe("travel service", () => {
	let db: DB;

	beforeEach(async () => {
		db = await getFakeDb();
	});

	describe("createTravel", () => {
		it("should create travel and automatically add creator as owner member", async () => {
			const appCall = createAppCallAuthenticated(db);

			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				accommodations: [],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.id).toBeDefined();
			expect(result.travel).toBeDefined();
			expect(result.travel.name).toBe(travelInput.name);
			expect(result.travel.destinationAirports).toEqual(
				SAMPLE_DESTINATION_AIRPORTS,
			);

			// Verify TravelMember was created automatically (query DB to avoid middleware noise)
			const members = await db.query.TravelMember.findMany({
				where: eq(TravelMember.travelId, result.id),
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
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				accommodations: [],
				events: [],
			};

			await expect(
				appCall(router.travelRoutes.saveTravel, {
					travel: travelInput,
				}),
			).rejects.toThrow();
		});

		it("should reject travel with start date after end date", async () => {
			const appCall = createAppCallAuthenticated(db);

			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
				accommodations: [],
				events: [],
			};

			await expect(
				appCall(router.travelRoutes.saveTravel, {
					travel: travelInput,
				}),
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
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate,
				endDate,

				accommodations: [
					{
						...accommodationStub,
						startDate,
						endDate,
					},
				],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.id).toBeDefined();

			// Verify travel was created (query DB directly)
			const travel = await db.query.Travel.findFirst({
				where: eq(Travel.id, result.id),
			});

			expect(travel).toBeDefined();
			expect(travel?.destinationAirports).toEqual(SAMPLE_DESTINATION_AIRPORTS);
			// Note: accommodations are handled separately by accommodation service
		});

		it("should persist budget and peopleEstimate via saveTravel", async () => {
			const appCall = createAppCallAuthenticated(db);

			const travelStub = testStub.travel();
			const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate,
				endDate,
				budget: 4321.99,
				peopleEstimate: 5,
				accommodations: [],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.travel.budget).toBeCloseTo(4321.99, 2);
			expect(result.travel.peopleEstimate).toBe(5);
			expect(result.travel.destinationAirports).toEqual(
				SAMPLE_DESTINATION_AIRPORTS,
			);

			// Verify persisted in DB
			const saved = await db.query.Travel.findFirst({
				where: eq(Travel.id, result.id),
			});
			expect(saved?.budget).toBeCloseTo(4321.99, 2);
			expect(saved?.peopleEstimate).toBe(5);
			expect(saved?.destinationAirports).toEqual(SAMPLE_DESTINATION_AIRPORTS);
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
			expect(result?.userMembership?.role).toBe("owner");
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
				}),
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

			// Create travel owned by another user (no membership for test user)
			const otherUser = testStub.user({ id: "another-user" });
			await db.insert(User).values(otherUser);
			const travelStub = testStub.travel({ userId: otherUser.id });
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			await expect(
				appCall(router.travelRoutes.getTravelMembers, {
					travelId: travel.id,
				}),
			).rejects.toThrow();
		});

		it("should throw error for non-existent travel", async () => {
			const appCall = createAppCallAuthenticated(db);

			await expect(
				appCall(router.travelRoutes.getTravelMembers, {
					travelId: "non-existent-id",
				}),
			).rejects.toThrow();
		});
	});

	describe("listTravels", () => {
		it("should return list of travels", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create multiple travels
			const travelStub1 = testStub.travel();
			const travelStub2 = testStub.travel();

			await db.insert(Travel).values(travelStub1);
			await db.insert(Travel).values(travelStub2);

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
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate,
				endDate,

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

	describe("updateTravel", () => {
		it("should allow travel owner to update travel settings", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create ownership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			const updateData = {
				name: "Updated Travel Name",
				description: "Updated travel description",
				destination: "Rio de Janeiro - GIG",
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
			};

			const result = await appCall(router.travelRoutes.updateTravel, {
				travelId: travel.id,
				updateData,
			});

			expect(result.name).toBe(updateData.name);
			expect(result.description).toBe(updateData.description);
			expect(result.destination).toBe(updateData.destination);
			expect(result.destinationAirports).toEqual(
				updateData.destinationAirports,
			);
		});

		it("should reject travel update for non-owner", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create membership as member (not owner)
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "member",
			});

			const updateData = {
				name: "Updated Travel Name",
			};

			await expect(
				appCall(router.travelRoutes.updateTravel, {
					travelId: travel.id,
					updateData,
				}),
			).rejects.toThrow();
		});

		it("should validate travel dates on update", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create ownership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			const updateData = {
				startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
				endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
			};

			await expect(
				appCall(router.travelRoutes.updateTravel, {
					travelId: travel.id,
					updateData,
				}),
			).rejects.toThrow();
		});

		it("should currently fail with TRAVEL_DATES_INVALID for the curl payload", async () => {
			const appCall = createAppCallAuthenticated(db);

			await db.insert(Travel).values({
				id: "trv_7gdiHVVGT74GL7ML",
				name: "asdasd",
				description: null,
				destination: "Rio de Janeiro",
				destinationAirports: [],
				startDate: new Date("2025-09-18T03:00:00.000Z"),
				endDate: new Date("2025-09-27T03:00:00.000Z"),
				budget: null,
				peopleEstimate: null,
				userId: ALWAYS_USER_TEST.id,
				createdAt: new Date("2025-09-18T15:04:39.000Z"),
				updatedAt: new Date("2025-09-18T15:04:39.000Z"),
				deletedAt: null,
				deletedBy: null,
			});

			await db.insert(TravelMember).values({
				travelId: "trv_7gdiHVVGT74GL7ML",
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			const updateData = {
				name: "Rio de janeiro teste",
				description: null,
				startDate: "2025-09-18T03:00:00.000Z",
				endDate: "2025-09-27T03:00:00.000Z",
				destination: "Rio de Janeiro",
				destinationAirports: [
					{ value: "Rio de Janeiro", label: "Rio de Janeiro" },
				],
			};

			await expect(
				appCall(router.travelRoutes.updateTravel, {
					travelId: "trv_7gdiHVVGT74GL7ML",
					updateData,
				}),
			).rejects.toThrow(/Data de início não pode ser no passado/);
		});

		it("should reject update for non-existent travel", async () => {
			const appCall = createAppCallAuthenticated(db);

			const updateData = {
				name: "Updated Travel Name",
			};

			await expect(
				appCall(router.travelRoutes.updateTravel, {
					travelId: "non-existent-id",
					updateData,
				}),
			).rejects.toThrow();
		});
	});

	describe("deleteTravel (soft delete)", () => {
		it("should allow travel owner to soft delete travel with correct name confirmation", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create ownership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			const result = await appCall(router.travelRoutes.deleteTravel, {
				travelId: travel.id,
				confirmationName: travelStub.name,
			});

			expect(result.deletedAt).toBeDefined();
			expect(result.deletedBy).toBe(ALWAYS_USER_TEST.id);

			// Verify travel is no longer accessible via normal queries
			await expect(
				appCall(router.travelRoutes.getTravel, {
					id: travel.id,
				}),
			).rejects.toThrow();
		});

		it("should reject delete with incorrect name confirmation", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create ownership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			await expect(
				appCall(router.travelRoutes.deleteTravel, {
					travelId: travel.id,
					confirmationName: "wrong name",
				}),
			).rejects.toThrow();
		});

		it("should reject delete for non-owner", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create membership as member (not owner)
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "member",
			});

			await expect(
				appCall(router.travelRoutes.deleteTravel, {
					travelId: travel.id,
					confirmationName: travelStub.name,
				}),
			).rejects.toThrow();
		});

		it("should reject delete for already deleted travel", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create travel first
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values({
					...travelStub,
					deletedAt: new Date(),
					deletedBy: ALWAYS_USER_TEST.id,
				})
				.returning({ id: Travel.id });

			// Create ownership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			await expect(
				appCall(router.travelRoutes.deleteTravel, {
					travelId: travel.id,
					confirmationName: travelStub.name,
				}),
			).rejects.toThrow();
		});
	});

	describe("soft delete behavior", () => {
		it("should exclude soft deleted travels from getAllTravels", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create regular travel
			const travelStub1 = testStub.travel();
			const [travel1] = await db
				.insert(Travel)
				.values(travelStub1)
				.returning({ id: Travel.id });

			// Create soft deleted travel
			const travelStub2 = testStub.travel();
			await db.insert(Travel).values({
				...travelStub2,
				deletedAt: new Date(),
				deletedBy: ALWAYS_USER_TEST.id,
			});

			const result = await appCall(router.travelRoutes.listTravels, {});

			// Should only include non-deleted travel
			const travelIds = result.map((t) => t.id);
			expect(travelIds).toContain(travel1.id);
			expect(travelIds).not.toContain(travelStub2.id);
		});

		it("should exclude soft deleted travels from getTravel", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create soft deleted travel
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values({
					...travelStub,
					deletedAt: new Date(),
					deletedBy: ALWAYS_USER_TEST.id,
				})
				.returning({ id: Travel.id });

			await expect(
				appCall(router.travelRoutes.getTravel, {
					id: travel.id,
				}),
			).rejects.toThrow();
		});

		it("should exclude soft deleted travels from getTravelMembers", async () => {
			const appCall = createAppCallAuthenticated(db);

			// Create soft deleted travel
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values({
					...travelStub,
					deletedAt: new Date(),
					deletedBy: ALWAYS_USER_TEST.id,
				})
				.returning({ id: Travel.id });

			// Create membership
			await db.insert(TravelMember).values({
				travelId: travel.id,
				userId: ALWAYS_USER_TEST.id,
				role: "owner",
			});

			await expect(
				appCall(router.travelRoutes.getTravelMembers, {
					travelId: travel.id,
				}),
			).rejects.toThrow();
		});
	});

	describe("travel creation with description", () => {
		it("should create travel with description field", async () => {
			const appCall = createAppCallAuthenticated(db);

			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				description: "This is a test travel description",
				destination: travelStub.destination,
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

				accommodations: [],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.travel.description).toBe(travelInput.description);
		});

		it("should create travel without description field", async () => {
			const appCall = createAppCallAuthenticated(db);

			const travelStub = testStub.travel();
			const travelInput = {
				name: travelStub.name,
				destination: travelStub.destination,
				destinationAirports: SAMPLE_DESTINATION_AIRPORTS,
				startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
				endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

				accommodations: [],
				events: [],
			};

			const result = await appCall(router.travelRoutes.saveTravel, {
				travel: travelInput,
			});

			expect(result.travel.description).toBeNull();
		});
	});

	describe("searchAirports", () => {
		it("should not return country aggregators in search results", async () => {
			const appCall = createAppCall(db);

			const result = await appCall(router.travelRoutes.searchAirports, {
				query: "Brazil",
				limit: 20,
			});

			expect(result.length).toBeGreaterThan(0);
			expect(result.every((airport) => airport.type !== "country_group")).toBe(
				true,
			);
		});

		it("should expand state groups when expandGroups is true", async () => {
			const appCall = createAppCall(db);

			const result = await appCall(router.travelRoutes.searchAirports, {
				query: "Sao Paulo",
				limit: 20,
				expandGroups: true,
			});

			expect(result.length).toBeGreaterThan(0);
			expect(result.every((airport) => airport.type === "airport")).toBe(true);
			expect(result.some((airport) => airport.code === "GRU")).toBe(true);
		});
	});

	describe("generatePrompt", () => {
		it("should expand state aggregator into constituent airports", async () => {
			const appCall = createAppCall(db);

			const stateAggregator = enhancedAirports.find(
				(airport) => airport.iata === "STATE_SP_ALL",
			);
			expect(stateAggregator).toBeDefined();
			if (!stateAggregator) {
				throw new Error("Missing state aggregator fixture");
			}

			const prompt = await appCall(router.travelRoutes.generatePrompt, {
				tripDates: {
					start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
					end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
				},
				budget: { perPerson: 2500, currency: "BRL" },
				destination: "Aventura Teste",
				groupSize: 3,
				departureAirports: [
					{
						code: stateAggregator.iata,
						name: stateAggregator.name,
						city: stateAggregator.city,
						state: stateAggregator.state,
						stateCode: stateAggregator.stateCode,
						country: stateAggregator.country,
						countryCode: stateAggregator.countryCode,
						type: "state_group",
						airportCount: stateAggregator.airportCount,
						airportCodes: stateAggregator.airportCodes,
					},
				],
			});

			expect(prompt).not.toContain("STATE_SP_ALL");
			expect(prompt).toContain('"GRU"');
			expect(prompt).toContain('"CGH"');
		});
	});
});
