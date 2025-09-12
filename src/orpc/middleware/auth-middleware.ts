import { betterAuthApp } from "@/lib/auth";
import { ORPCError, os } from "@orpc/server";
import type { Session, User } from "better-auth/types";
import type { ORPCContext } from "../procedure";

// Context types
interface AuthContext {
	user: User;
	session: Session;
}

interface OptionalAuthContext {
	user?: User | null;
	session?: Session | null;
}

export const requireAuth = os
	.$context<ORPCContext>()
	.middleware(async ({ context, next }) => {
		if (!context.reqHeaders) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		const authResult = await betterAuthApp.api.getSession({
			headers: context.reqHeaders,
		});

		if (!authResult?.user || !authResult?.session) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		return next({
			context: {
				user: authResult.user,
				session: authResult.session,
			} as AuthContext,
		});
	});

export const optionalAuth = os
	.$context<ORPCContext>()
	.middleware(async ({ context, next }) => {
		if (!context.reqHeaders) {
			return next({
				context: {
					user: null,
					session: null,
				} as OptionalAuthContext,
			});
		}
		const authResult = await betterAuthApp.api.getSession({
			headers: context.reqHeaders,
		});

		return next({
			context: {
				user: authResult?.user || null,
				session: authResult?.session || null,
			} as OptionalAuthContext,
		});
	});
