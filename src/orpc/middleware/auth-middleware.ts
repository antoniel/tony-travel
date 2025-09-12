import { betterAuthApp } from "@/lib/auth";
import { ALWAYS_USER_TEST } from "@/tests/utils";
import { ORPCError, os } from "@orpc/server";
import type { Session, User } from "better-auth/types";
import type { AppOrpcContext } from "../procedure";

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
	.$context<AppOrpcContext>()
	.middleware(async ({ context, next }) => {
		if (!context.reqHeaders) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		const authResult = await betterAuthApp.api.getSession({
			headers: context.reqHeaders,
		});

		if (
			process.env.NODE_ENV === "test" &&
			context.reqHeaders.get("Authorization") === "Bearer test-token"
		) {
			return next({
				context: {
					user: ALWAYS_USER_TEST,
					session: {
						id: "test-session",
						userId: ALWAYS_USER_TEST.id,
						expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				} as AuthContext,
			});
		}

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
	.$context<AppOrpcContext>()
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
