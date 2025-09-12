import { betterAuthApp } from "@/lib/auth";
import { ORPCError, os } from "@orpc/server";
import type { RequestHeadersPluginContext } from "@orpc/server/plugins";
import type { Session, User } from "better-auth/types";

// Context types
interface AuthContext {
	user: User;
	session: Session;
}

interface OptionalAuthContext {
	user?: User | null;
	session?: Session | null;
}

interface ORPCContext extends RequestHeadersPluginContext {}
export const withHeaders = os.$context<ORPCContext>();

// Middleware de autenticação obrigatória
export const requireAuth = withHeaders.middleware(async ({ context, next }) => {
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

export const optionalAuth = withHeaders.middleware(
	async ({ context, next }) => {
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
	},
);
