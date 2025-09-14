import {
	Accommodation,
	type InsertTravelMemberSchema,
	Travel,
	TravelMember,
	type UpdateTravelSchema,
} from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import type { TravelWithRelations } from "@/lib/types";
import { and, eq, isNull } from "drizzle-orm";
import type * as z from "zod";
import type { InsertFullTravel } from "./travel.model";

type TravelInput = z.infer<typeof InsertFullTravel>;

export class TravelDAO {
	constructor(private readonly db: DB) {}
	async createTravel(
		travelData: TravelInput & { userId: string },
	): Promise<string> {
		const [travel] = await this.db
			.insert(Travel)
			.values({
				name: travelData.name,
				description: travelData.description,
				destination: travelData.destination,
				startDate: travelData.startDate,
				endDate: travelData.endDate,
				locationInfo: travelData.locationInfo,
				visaInfo: travelData.visaInfo,
				userId: travelData.userId,
			})
			.returning({ id: Travel.id });

		const travelId = travel.id;

		if (travelData.accommodations.length > 0) {
			await this.db
				.insert(Accommodation)
				.values(travelData.accommodations.map((a) => ({ ...a, travelId })));
		}

		// Note: Events are now handled by the Event module

		return travelId;
	}

	// Transaction-based method for creating travel
	async createTravelWithTransaction(
		tx: Parameters<Parameters<DB["transaction"]>[0]>[0],
		travelData: TravelInput & { userId: string },
	): Promise<string> {
		const [travel] = await tx
			.insert(Travel)
			.values({
				name: travelData.name,
				description: travelData.description,
				destination: travelData.destination,
				startDate: travelData.startDate,
				endDate: travelData.endDate,
				locationInfo: travelData.locationInfo,
				visaInfo: travelData.visaInfo,
				userId: travelData.userId,
			})
			.returning({ id: Travel.id });

		const travelId = travel.id;

		if (travelData.accommodations.length > 0) {
			await tx
				.insert(Accommodation)
				.values(travelData.accommodations.map((a) => ({ ...a, travelId })));
		}

		return travelId;
	}

	async getTravelById(id: string): Promise<TravelWithRelations | null> {
		const travel = await this.db.query.Travel.findFirst({
			where: and(eq(Travel.id, id), isNull(Travel.deletedAt)),
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
				members: {
					with: {
						user: true,
					},
				},
			},
		});

		if (!travel) {
			return null;
		}

		return travel;
	}

	// Transaction-based method for getting travel
	async getTravelByIdWithTransaction(
		tx: Parameters<Parameters<DB["transaction"]>[0]>[0],
		id: string,
	): Promise<TravelWithRelations | null> {
		const travel = await tx.query.Travel.findFirst({
			where: and(eq(Travel.id, id), isNull(Travel.deletedAt)),
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
				members: {
					with: {
						user: true,
					},
				},
			},
		});

		return travel || null;
	}

	async getAllTravels(): Promise<TravelWithRelations[]> {
		const travels = await this.db.query.Travel.findMany({
			where: isNull(Travel.deletedAt),
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
				members: {
					with: {
						user: true,
					},
				},
			},
		});

		return travels;
	}

	// TravelMember operations
	async createTravelMember(
		memberData: z.infer<typeof InsertTravelMemberSchema>,
	): Promise<string> {
		const [member] = await this.db
			.insert(TravelMember)
			.values(memberData)
			.returning({ id: TravelMember.id });
		return member.id;
	}

	// Transaction-based method for creating travel member
	async createTravelMemberWithTransaction(
		tx: Parameters<Parameters<DB["transaction"]>[0]>[0],
		memberData: z.infer<typeof InsertTravelMemberSchema>,
	): Promise<string> {
		const [member] = await tx
			.insert(TravelMember)
			.values(memberData)
			.returning({ id: TravelMember.id });
		return member.id;
	}

	async getTravelMember(
		travelId: string,
		userId: string,
	): Promise<typeof TravelMember.$inferSelect | null> {
		const member = await this.db.query.TravelMember.findFirst({
			where: and(
				eq(TravelMember.travelId, travelId),
				eq(TravelMember.userId, userId),
			),
			with: {
				user: true,
			},
		});
		return member || null;
	}

	async getTravelMembers(
		travelId: string,
	): Promise<(typeof TravelMember.$inferSelect)[]> {
		const members = await this.db.query.TravelMember.findMany({
			where: eq(TravelMember.travelId, travelId),
			with: {
				user: true,
			},
		});
		return members;
	}

	async deleteTravelMember(travelId: string, userId: string): Promise<void> {
		await this.db
			.delete(TravelMember)
			.where(
				and(
					eq(TravelMember.travelId, travelId),
					eq(TravelMember.userId, userId),
				),
			);
	}

	async updateTravelMemberRole(
		travelId: string,
		userId: string,
		newRole: "owner" | "member",
	): Promise<void> {
		await this.db
			.update(TravelMember)
			.set({ role: newRole })
			.where(
				and(
					eq(TravelMember.travelId, travelId),
					eq(TravelMember.userId, userId),
				),
			);
	}

	// New methods for travel settings functionality
	async updateTravel(
		id: string,
		updateData: z.infer<typeof UpdateTravelSchema>,
	): Promise<typeof Travel.$inferSelect | null> {
		const [updatedTravel] = await this.db
			.update(Travel)
			.set(updateData)
			.where(and(eq(Travel.id, id), isNull(Travel.deletedAt)))
			.returning();

		return updatedTravel || null;
	}

	async softDeleteTravel(
		id: string,
		deletedBy: string,
	): Promise<typeof Travel.$inferSelect | null> {
		const [deletedTravel] = await this.db
			.update(Travel)
			.set({
				deletedAt: new Date(),
				deletedBy,
			})
			.where(and(eq(Travel.id, id), isNull(Travel.deletedAt)))
			.returning();

		return deletedTravel || null;
	}

	// Helper method to get travel without soft delete filter (for internal use)
	async getTravelByIdIncludingDeleted(
		id: string,
	): Promise<typeof Travel.$inferSelect | null> {
		const travel = await this.db.query.Travel.findFirst({
			where: eq(Travel.id, id),
		});

		return travel || null;
	}
}

export const createTravelDAO = (db: DB) => new TravelDAO(db);
