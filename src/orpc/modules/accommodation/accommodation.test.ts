import { Accommodation, Travel } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import router from "@/orpc/router";
import {
	createAppCall,
	createAppCallAuthenticated,
	getFakeDb,
	testStub,
} from "@/tests/utils";
import { beforeAll, describe, expect, it } from "vitest";

describe("accommodation routes", () => {
	let db: DB;
	beforeAll(async () => {
		db = await getFakeDb();
	});

	describe("createAccommodation", () => {
		it("throws validation error for invalid dates", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const invalidAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-05"),
				endDate: new Date("2024-01-01"), // End before start
			});

			await expect(
				appCall(router.accommodationRoutes.createAccommodation, {
					accommodation: invalidAccommodation,
					travelId: travel.id,
				}),
			).rejects.toThrow(
				"Data de check-in deve ser anterior à data de check-out",
			);
		});

		it("throws validation error when accommodation dates are outside travel dates", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-10"),
			});
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Accommodation that ends after travel ends
			const invalidAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-08"),
				endDate: new Date("2024-01-15"), // After travel ends
			});

			await expect(
				appCall(router.accommodationRoutes.createAccommodation, {
					accommodation: invalidAccommodation,
					travelId: travel.id,
				}),
			).rejects.toThrow("Check-out não pode ser posterior ao fim da viagem");
		});

		it("creates accommodation successfully when dates are valid", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-10"),
			});
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const validAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-02"),
				endDate: new Date("2024-01-05"),
			});

			const result = await appCall(
				router.accommodationRoutes.createAccommodation,
				{
					accommodation: validAccommodation,
					travelId: travel.id,
				},
			);

			expect(result.id).toBeTruthy();
			expect(result.conflictingAccommodation).toBeNull();
			expect(result.validationError).toBeNull();
		});

		it("detects overlapping accommodations", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-20"),
			});
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create first accommodation
			const firstAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-02"),
				endDate: new Date("2024-01-05"),
			});
			await db.insert(Accommodation).values({
				...firstAccommodation,
				travelId: travel.id,
			});

			// Try to create overlapping accommodation
			const overlappingAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-04"),
				endDate: new Date("2024-01-08"),
			});

			const result = await appCall(
				router.accommodationRoutes.createAccommodation,
				{
					accommodation: overlappingAccommodation,
					travelId: travel.id,
				},
			);

			expect(result.id).toBe("");
			expect(result.conflictingAccommodation).toBeTruthy();
			expect(result.validationError).toBe(
				"Existe conflito com uma acomodação existente",
			);
		});
	});

	describe("getAccommodationsByTravel", () => {
		it("returns empty array for travel with no accommodations", async () => {
			const appCall = createAppCall(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const accommodations = await appCall(
				router.accommodationRoutes.getAccommodationsByTravel,
				{ travelId: travel.id },
			);

			expect(accommodations).toHaveLength(0);
		});

		it("returns all accommodations for a travel", async () => {
			const appCall = createAppCall(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create multiple accommodations
			const accommodations = [
				testStub.accommodation({
					name: "Hotel A",
					startDate: new Date("2024-01-01"),
					endDate: new Date("2024-01-03"),
				}),
				testStub.accommodation({
					name: "Hotel B",
					startDate: new Date("2024-01-04"),
					endDate: new Date("2024-01-06"),
				}),
			];

			for (const accommodation of accommodations) {
				await db.insert(Accommodation).values({
					...accommodation,
					travelId: travel.id,
				});
			}

			const result = await appCall(
				router.accommodationRoutes.getAccommodationsByTravel,
				{ travelId: travel.id },
			);

			expect(result).toHaveLength(2);
			expect(result.map((a) => a.name)).toContain("Hotel A");
			expect(result.map((a) => a.name)).toContain("Hotel B");
		});
	});

	describe("getAccommodation", () => {
		it("returns accommodation by id", async () => {
			const appCall = createAppCall(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const accommodation = testStub.accommodation();
			const [inserted] = await db
				.insert(Accommodation)
				.values({
					...accommodation,
					travelId: travel.id,
				})
				.returning({ id: Accommodation.id });

			const result = await appCall(
				router.accommodationRoutes.getAccommodation,
				{
					id: inserted.id,
				},
			);

			expect(result).toBeTruthy();
			expect(result?.name).toBe(accommodation.name);
			expect(result?.type).toBe(accommodation.type);
		});

		it("returns null for non-existent accommodation", async () => {
			const appCall = createAppCall(db);

			const result = await appCall(
				router.accommodationRoutes.getAccommodation,
				{
					id: "non-existent-id",
				},
			);

			expect(result).toBeNull();
		});
	});

	describe("updateAccommodation", () => {
		it("updates accommodation successfully", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const accommodation = testStub.accommodation();
			const [inserted] = await db
				.insert(Accommodation)
				.values({
					...accommodation,
					travelId: travel.id,
				})
				.returning({ id: Accommodation.id });

			const result = await appCall(
				router.accommodationRoutes.updateAccommodation,
				{
					id: inserted.id,
					accommodation: {
						name: "Updated Hotel",
						rating: 5.0,
					},
				},
			);

			expect(result.success).toBe(true);
			expect(result.conflictingAccommodation).toBeNull();
			expect(result.validationError).toBeNull();

			// Verify accommodation was updated
			const updated = await appCall(
				router.accommodationRoutes.getAccommodation,
				{
					id: inserted.id,
				},
			);
			expect(updated?.name).toBe("Updated Hotel");
			expect(updated?.rating).toBe(5.0);
		});

		it("returns error for non-existent accommodation", async () => {
			const appCall = createAppCallAuthenticated(db);

			const result = await appCall(
				router.accommodationRoutes.updateAccommodation,
				{
					id: "non-existent-id",
					accommodation: {
						name: "Updated Hotel",
					},
				},
			);

			expect(result.success).toBe(false);
			expect(result.conflictingAccommodation).toBeNull();
			expect(result.validationError).toBe("Acomodação não encontrada");
		});

		it("detects overlapping dates when updating", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Create two accommodations
			const firstAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-05"),
			});
			const secondAccommodation = testStub.accommodation({
				startDate: new Date("2024-01-06"),
				endDate: new Date("2024-01-10"),
			});

			const [first] = await db
				.insert(Accommodation)
				.values({
					...firstAccommodation,
					travelId: travel.id,
				})
				.returning({ id: Accommodation.id });

			await db.insert(Accommodation).values({
				...secondAccommodation,
				travelId: travel.id,
			});

			// Try to update first accommodation to overlap with second
			const result = await appCall(
				router.accommodationRoutes.updateAccommodation,
				{
					id: first.id,
					accommodation: {
						startDate: new Date("2024-01-08"),
						endDate: new Date("2024-01-12"),
					},
				},
			);

			expect(result.success).toBe(false);
			expect(result.conflictingAccommodation).toBeTruthy();
			expect(result.validationError).toBe(
				"Existe conflito com uma acomodação existente",
			);
		});
	});

	describe("deleteAccommodation", () => {
		it("deletes accommodation successfully", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const accommodation = testStub.accommodation();
			const [inserted] = await db
				.insert(Accommodation)
				.values({
					...accommodation,
					travelId: travel.id,
				})
				.returning({ id: Accommodation.id });

			const result = await appCall(
				router.accommodationRoutes.deleteAccommodation,
				{
					id: inserted.id,
				},
			);

			expect(result.success).toBe(true);

			// Verify accommodation was deleted
			const deleted = await appCall(
				router.accommodationRoutes.getAccommodation,
				{
					id: inserted.id,
				},
			);
			expect(deleted).toBeNull();
		});

		it("handles deleting non-existent accommodation gracefully", async () => {
			const appCall = createAppCallAuthenticated(db);

			const result = await appCall(
				router.accommodationRoutes.deleteAccommodation,
				{
					id: "non-existent-id",
				},
			);

			expect(result.success).toBe(true);
		});
	});

	describe("getSuggestedAccommodationDates", () => {
		it("returns suggested dates for travel", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			const result = await appCall(
				router.accommodationRoutes.getSuggestedAccommodationDates,
				{ travelId: travel.id },
			);

			// Note: The current implementation has TODOs and returns current date
			// This test validates the current behavior
			expect(result).toBeTruthy();
			expect(result?.startDate).toBeInstanceOf(Date);
			expect(result?.endDate).toBeInstanceOf(Date);
		});

		it("handles travel with existing accommodations", async () => {
			const appCall = createAppCallAuthenticated(db);
			const travelStub = testStub.travel();
			const [travel] = await db
				.insert(Travel)
				.values(travelStub)
				.returning({ id: Travel.id });

			// Add existing accommodation
			const accommodation = testStub.accommodation({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-05"),
			});
			await db.insert(Accommodation).values({
				...accommodation,
				travelId: travel.id,
			});

			const result = await appCall(
				router.accommodationRoutes.getSuggestedAccommodationDates,
				{ travelId: travel.id },
			);

			expect(result).toBeTruthy();
			expect(result?.startDate).toBeInstanceOf(Date);
			expect(result?.endDate).toBeInstanceOf(Date);
		});
	});
});
