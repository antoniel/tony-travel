import type { DB } from "@/lib/db/types";
import { nanoid } from "nanoid";
import { createInvitationDAO } from "./invitation.dao";
import type {
	AcceptInviteResponse,
	CreateInviteLink,
	InviteInfoResponse,
	InviteLinkResponse,
	TravelMemberWithUser,
} from "./invitation.model";

export class InvitationService {
	private invitationDAO: ReturnType<typeof createInvitationDAO>;

	constructor(private readonly db: DB) {
		this.invitationDAO = createInvitationDAO(db);
	}

	generateInviteToken(): string {
		return nanoid(32);
	}

	async createInviteLink(
		input: CreateInviteLink,
		createdBy: string,
	): Promise<InviteLinkResponse> {
		await this.invitationDAO.deactivateInvitations(input.travelId);

		const token = this.generateInviteToken();
		const expiresAt = input.expiresInDays
			? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
			: null;

		await this.invitationDAO.createInvitation({
			travelId: input.travelId,
			createdBy,
			token,
			isActive: true,
			expiresAt,
		});

		const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
		const inviteUrl = `${baseUrl}/invite/${token}`;

		return {
			inviteUrl,
			token,
			expiresAt,
		};
	}

	async acceptInvite(token: string, userId: string): Promise<AcceptInviteResponse> {
		const invitation = await this.invitationDAO.getInvitationByToken(token);

		if (!invitation) {
			return {
				success: false,
				message: "Invalid or expired invite",
				travelId: "",
			};
		}

		if (invitation.expiresAt && new Date() > invitation.expiresAt) {
			return {
				success: false,
				message: "Invite has expired",
				travelId: invitation.travelId,
			};
		}

		const existingMember = await this.invitationDAO.getTravelMember(
			invitation.travelId,
			userId,
		);

		if (existingMember) {
			return {
				success: true,
				message: "Already a member",
				travelId: invitation.travelId,
				travelName: invitation.travel?.name,
			};
		}

		await this.invitationDAO.addTravelMember({
			travelId: invitation.travelId,
			userId,
			role: "member",
			joinedAt: new Date(),
		});

		return {
			success: true,
			travelId: invitation.travelId,
			travelName: invitation.travel?.name,
		};
	}

	async getTravelMembers(travelId: string): Promise<TravelMemberWithUser[]> {
		const members = await this.invitationDAO.getTravelMembers(travelId);
		return members.map((member) => ({
			id: member.id,
			travelId: member.travelId,
			userId: member.userId,
			role: member.role,
			joinedAt: member.joinedAt,
			user: member.user,
		}));
	}

	async removeMember(
		travelId: string,
		userId: string,
		requestorRole: string,
	): Promise<{ success: boolean; message?: string }> {
		const targetMember = await this.invitationDAO.getTravelMember(travelId, userId);

		if (!targetMember) {
			return { success: false, message: "Member not found" };
		}

		if (targetMember.role === "owner") {
			return { success: false, message: "Cannot remove travel owner" };
		}

		if (requestorRole !== "owner") {
			return { success: false, message: "Only owners can remove members" };
		}

		const removed = await this.invitationDAO.removeTravelMember(travelId, userId);
		return {
			success: removed,
			message: removed ? "Member removed successfully" : "Failed to remove member",
		};
	}

	async getInviteInfo(token: string): Promise<InviteInfoResponse> {
		const invitation = await this.invitationDAO.getInvitationByToken(token);

		if (!invitation) {
			return {
				isValid: false,
				travel: null,
				isExpired: false,
				message: "Invalid invite link",
			};
		}

		const isExpired = invitation.expiresAt
			? new Date() > invitation.expiresAt
			: false;

		if (isExpired) {
			return {
				isValid: false,
				travel: invitation.travel ? {
					id: invitation.travel.id,
					name: invitation.travel.name,
					destination: invitation.travel.destination,
					startDate: invitation.travel.startDate,
					endDate: invitation.travel.endDate,
				} : null,
				isExpired: true,
				message: "Invite link has expired",
			};
		}

		return {
			isValid: true,
			travel: invitation.travel ? {
				id: invitation.travel.id,
				name: invitation.travel.name,
				destination: invitation.travel.destination,
				startDate: invitation.travel.startDate,
				endDate: invitation.travel.endDate,
			} : null,
			isExpired: false,
		};
	}

	async getCurrentInviteLink(travelId: string): Promise<InviteLinkResponse | null> {
		const invitation = await this.invitationDAO.getActiveInvitation(travelId);
		
		if (!invitation) {
			return null;
		}

		const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
		const inviteUrl = `${baseUrl}/invite/${invitation.token}`;

		return {
			inviteUrl,
			token: invitation.token,
			expiresAt: invitation.expiresAt,
		};
	}
}

export const createInvitationService = (db: DB) => new InvitationService(db);