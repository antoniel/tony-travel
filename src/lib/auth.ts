import { serverEnv } from "@/env";
import { db } from "@/lib/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Account, Session, User, Verification } from "./db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: {
			user: User,
			session: Session,
			account: Account,
			verification: Verification,
		},
	}),
	socialProviders: {
		google: {
			clientId: serverEnv.GOOGLE_CLIENT_ID || "",
			clientSecret: serverEnv.GOOGLE_CLIENT_SECRET || "",
		},
	},
	secret: serverEnv.BETTER_AUTH_SECRET || "fallback-secret-for-dev",
});
