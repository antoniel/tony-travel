import {
	type InsertTravelInvitation,
	type InsertTravelMember,
	TravelInvitation,
	TravelMember,
} from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { and, eq } from "drizzle-orm";

export class InvitationDAO {
	constructor(private readonly db: DB) {}

	async createInvitation(invitation: InsertTravelInvitation): Promise<string> {
		const [created] = await this.db
			.insert(TravelInvitation)
			.values(invitation)
			.returning({ id: TravelInvitation.id });
		return created.id;
	}

	async deactivateInvitations(travelId: string): Promise<void> {
		await this.db
			.update(TravelInvitation)
			.set({ isActive: false })
			.where(eq(TravelInvitation.travelId, travelId));
	}

	async getInvitationByToken(token: string) {
		return await this.db.query.TravelInvitation.findFirst({
			where: and(
				eq(TravelInvitation.token, token),
				eq(TravelInvitation.isActive, true),
			),
			with: {
				travel: {
					columns: {
						id: true,
						name: true,
						destination: true,
						startDate: true,
						endDate: true,
					},
				},
			},
		});
	}

	async addTravelMember(member: InsertTravelMember): Promise<string> {
		const [created] = await this.db
			.insert(TravelMember)
			.values(member)
			.returning({ id: TravelMember.id });
		return created.id;
	}

	async getTravelMembers(travelId: string) {
		return await this.db.query.TravelMember.findMany({
			where: eq(TravelMember.travelId, travelId),
			with: {
				user: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
			orderBy: (members, { asc }) => [asc(members.joinedAt)],
		});
	}

	async removeTravelMember(travelId: string, userId: string): Promise<boolean> {
		const result = await this.db
			.delete(TravelMember)
			.where(
				and(
					eq(TravelMember.travelId, travelId),
					eq(TravelMember.userId, userId),
				),
			);
		return result.rowsAffected > 0;
	}

	async getTravelMember(travelId: string, userId: string) {
		return await this.db.query.TravelMember.findFirst({
			where: and(
				eq(TravelMember.travelId, travelId),
				eq(TravelMember.userId, userId),
			),
		});
	}

	async getActiveInvitation(travelId: string) {
		return await this.db.query.TravelInvitation.findFirst({
			where: and(
				eq(TravelInvitation.travelId, travelId),
				eq(TravelInvitation.isActive, true),
			),
		});
	}
}

export const createInvitationDAO = (db: DB) => new InvitationDAO(db);
