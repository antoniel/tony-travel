import {
	authProcedure,
	travelMemberProcedure,
	travelOwnerProcedure,
} from "@/orpc/procedure";
import z from "zod";
import {
	AcceptInviteResponseSchema,
	AcceptInviteSchema,
	CreateInviteLinkSchema,
	GetInviteInfoSchema,
	GetTravelMembersSchema,
	InviteInfoResponseSchema,
	InviteLinkResponseSchema,
	RemoveMemberSchema,
	TravelMemberWithUserSchema,
} from "./invitation.model";
import { createInvitationService } from "./invitation.service";

export const createInviteLink = travelOwnerProcedure
	.input(CreateInviteLinkSchema)
	.output(InviteLinkResponseSchema)
	.handler(async ({ input, context }) => {
		const invitationService = createInvitationService(context.db);
		return await invitationService.createInviteLink(input, context.user.id);
	});

export const getCurrentInviteLink = travelOwnerProcedure
	.input(GetTravelMembersSchema)
	.output(InviteLinkResponseSchema.nullable())
	.handler(async ({ input, context }) => {
		const invitationService = createInvitationService(context.db);
		return await invitationService.getCurrentInviteLink(input.travelId);
	});

export const acceptInvite = authProcedure
	.input(AcceptInviteSchema)
	.output(AcceptInviteResponseSchema)
	.handler(async ({ input, context }) => {
		const invitationService = createInvitationService(context.db);
		return await invitationService.acceptInvite(input.token, context.user.id);
	});

export const getTravelMembers = travelMemberProcedure
	.input(GetTravelMembersSchema)
	.output(TravelMemberWithUserSchema.array())
	.handler(async ({ input, context }) => {
		const invitationService = createInvitationService(context.db);
		const members = await invitationService.getTravelMembers(input.travelId);
		return members;
	});

export const removeMember = travelOwnerProcedure
	.input(RemoveMemberSchema)
	.output(z.object({ success: z.boolean(), message: z.string().optional() }))
	.handler(async ({ input, context }) => {
		const invitationService = createInvitationService(context.db);
		return await invitationService.removeMember(
			input.travelId,
			input.userId,
			context.travelMembership.role,
		);
	});

export const getInviteInfo = authProcedure
	.input(GetInviteInfoSchema)
	.output(InviteInfoResponseSchema)
	.handler(async ({ input, context }) => {
		const invitationService = createInvitationService(context.db);
		return await invitationService.getInviteInfo(input.token);
	});
