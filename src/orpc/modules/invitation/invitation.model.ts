import * as z from "zod";

export const CreateInviteLinkSchema = z.object({
	travelId: z.string(),
	expiresInDays: z.number().min(1).max(365).optional(),
});

export const AcceptInviteSchema = z.object({
	token: z.string(),
});

export const GetTravelMembersSchema = z.object({
	travelId: z.string(),
});

export const RemoveMemberSchema = z.object({
	travelId: z.string(),
	userId: z.string(),
});

export const GetInviteInfoSchema = z.object({
	token: z.string(),
});

export const InviteLinkResponseSchema = z.object({
	inviteUrl: z.string(),
	token: z.string(),
	expiresAt: z.date().nullable(),
});

export const AcceptInviteResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	travelId: z.string(),
	travelName: z.string().optional(),
});

export const TravelMemberWithUserSchema = z.object({
	id: z.string(),
	travelId: z.string(),
	userId: z.string(),
	role: z.enum(["owner", "member"]),
	joinedAt: z.date(),
	user: z.object({
		id: z.string(),
		name: z.string(),
		email: z.string(),
		image: z.string().nullable(),
	}),
});

export const InviteInfoResponseSchema = z.object({
	isValid: z.boolean(),
	travel: z
		.object({
			id: z.string(),
			name: z.string(),
			destination: z.string(),
			startDate: z.date(),
			endDate: z.date(),
		})
		.nullable(),
	isExpired: z.boolean(),
	message: z.string().optional(),
});

export type CreateInviteLink = z.infer<typeof CreateInviteLinkSchema>;
export type AcceptInvite = z.infer<typeof AcceptInviteSchema>;
export type GetTravelMembers = z.infer<typeof GetTravelMembersSchema>;
export type RemoveMember = z.infer<typeof RemoveMemberSchema>;
export type GetInviteInfo = z.infer<typeof GetInviteInfoSchema>;
export type InviteLinkResponse = z.infer<typeof InviteLinkResponseSchema>;
export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>;
export type TravelMemberWithUser = z.infer<typeof TravelMemberWithUserSchema>;
export type InviteInfoResponse = z.infer<typeof InviteInfoResponseSchema>;
