import { Travel, TravelMember } from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { ORPCError, os } from "@orpc/server";
import type { RequestHeadersPluginContext } from "@orpc/server/plugins";
import { and, eq } from "drizzle-orm";
import { optionalAuth, requireAuth } from "./middleware/auth-middleware";
import { logger } from "./middleware/logger";

export interface AppOrpcContext extends RequestHeadersPluginContext {
	db: DB;
}

interface TravelMembershipContext {
	travelMembership: {
		id: string;
		travelId: string;
		userId: string;
		role: "owner" | "member";
		joinedAt: Date;
	};
}

const requireTravelMember = (role?: "owner" | "member") =>
	os.$context<AppOrpcContext>().middleware(async ({ context, next }, input) => {
		const inputObj = input as { travelId?: string; id?: string };
		const travelId = inputObj?.travelId || inputObj?.id;

		if (!travelId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "ID da viagem é obrigatório",
			});
		}

		const contextWithUser = context as AppOrpcContext & {
			user?: { id: string };
		};
		const user = contextWithUser.user;
		if (!user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Autenticação necessária",
			});
		}

		const travel = await context.db.query.Travel.findFirst({
			where: eq(Travel.id, travelId),
		});
		if (!travel) {
			throw new ORPCError("NOT_FOUND", {
				message: "Viagem não encontrada",
			});
		}

		if (travel.userId === user.id) {
			return next({
				context: {
					...context,
					travelMembership: {
						id: travel.id,
						travelId,
						userId: user.id,
						role: "owner",
						joinedAt: travel.createdAt,
					},
				} as AppOrpcContext & TravelMembershipContext,
			});
		}

		const membership = await context.db.query.TravelMember.findFirst({
			where: and(
				eq(TravelMember.travelId, travelId),
				eq(TravelMember.userId, user.id),
			),
		});

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Você precisa ser membro desta viagem",
			});
		}

		if (role === "owner" && membership.role !== "owner") {
			throw new ORPCError("FORBIDDEN", {
				message: "Apenas o proprietário da viagem pode executar essa ação",
			});
		}

		return next({
			context: {
				...context,
				travelMembership: membership,
			} as AppOrpcContext & TravelMembershipContext,
		});
	});

export const baseProcedure = os.$context<AppOrpcContext>().use(logger);
export const authProcedure = baseProcedure.use(requireAuth);
export const optionalAuthProcedure = baseProcedure.use(optionalAuth);
export const travelMemberProcedure = authProcedure.use(requireTravelMember());
export const travelOwnerProcedure = authProcedure.use(
	requireTravelMember("owner"),
);
