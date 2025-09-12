import { createClient } from "@libsql/client";
import type { AnySchema, InferSchemaInput } from "@orpc/contract";
import {
	type ErrorMap,
	type Lazyable,
	type Meta,
	type Procedure,
	call,
} from "@orpc/server";
import { zocker } from "zocker";

import type { DB } from "@/lib/db/types";
import type { AppOrpcContext } from "@/orpc/procedure";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "../lib/db/schema";

export const ALWAYS_USER_TEST: schema.User = {
	id: "test-user",
	image: null,
	updatedAt: new Date(),
	email: "test-user@test.com",
	emailVerified: true,
	name: "Test User",
	createdAt: new Date(),
};
export const getFakeDb = async () => {
	const client = createClient({
		url: ":memory:",
	});
	const db = drizzle(client, {
		schema: schema,
	});
	const migrationsFolder = path.join(process.cwd(), "drizzle");
	await migrate(db, {
		migrationsFolder,
		migrationsTable: "__drizzle_migrations",
	});
	await db.insert(schema.User).values(ALWAYS_USER_TEST);
	return db;
};

export const createAppCall =
	(db: DB) =>
	<
		TInputSchema extends AnySchema,
		TOutputSchema extends AnySchema,
		TErrorMap extends ErrorMap,
		TMeta extends Meta,
	>(
		procedure: Lazyable<
			Procedure<
				AppOrpcContext,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				any,
				TInputSchema,
				TOutputSchema,
				TErrorMap,
				TMeta
			>
		>,
		input: InferSchemaInput<TInputSchema>,
	) => {
		return call<AppOrpcContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>(
			procedure,
			input,
			{
				context: {
					db: db as DB,
				},
			},
		);
	};

export const createAppCallAuthenticated =
	(db: DB) =>
	<
		TInputSchema extends AnySchema,
		TOutputSchema extends AnySchema,
		TErrorMap extends ErrorMap,
		TMeta extends Meta,
	>(
		procedure: Lazyable<
			Procedure<
				AppOrpcContext,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				any,
				TInputSchema,
				TOutputSchema,
				TErrorMap,
				TMeta
			>
		>,
		input: InferSchemaInput<TInputSchema>,
	) => {
		return call<AppOrpcContext, TInputSchema, TOutputSchema, TErrorMap, TMeta>(
			procedure,
			input,
			{
				context: {
					db: db as DB,
					reqHeaders: AUTH_TEST_HEADERS,
				},
			},
		);
	};

export const AUTH_TEST_HEADERS = new Headers();
AUTH_TEST_HEADERS.set("Authorization", "Bearer test-token");

const flight = zocker(schema.FlightSchema);
const flightParticipant = zocker(schema.FlightParticipantSchema);
const user = zocker(schema.UserSchema);
const travel = (): schema.Travel => {
	return {
		...zocker(schema.TravelSchema).generate(),
		userId: ALWAYS_USER_TEST.id,
		locationInfo: {
			destination: "Test Destination",
			country: "Test Country",
			climate: "Test Climate",
			currency: "Test Currency",
			language: "Test Language",
			bestTimeToVisit: "Test Best Time to Visit",
			timeZone: "Test Time Zone",
			emergencyNumbers: {
				police: "Test Police",
				medical: "Test Medical",
				embassy: "Test Embassy",
			},
		},
		visaInfo: {
			required: true,
			stayDuration: "Test Stay Duration",
			documents: ["Test Document"],
			vaccinations: ["Test Vaccination"],
			entryRequirements: ["Test Entry Requirement"],
		},
	};
};

const appEvent = zocker(schema.AppEventSchema);
export const testStub = {
	flight,
	flightParticipant,
	user,
	travel,
	appEvent,
};
