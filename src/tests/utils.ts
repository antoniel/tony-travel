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
import fs from "node:fs";
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
	// Use a file-backed SQLite DB to avoid libsql multi-connection issues with :memory:
	const tmpDir = path.join(process.cwd(), ".test-dbs");
	fs.mkdirSync(tmpDir, { recursive: true });
	const dbFile = path.join(
		tmpDir,
		`test-db-${Math.random().toString(36).slice(2)}.sqlite`,
	);
	const client = createClient({
		url: `file:${dbFile}`,
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

	export const testStub = {
	accommodation: (accommodation?: Partial<schema.Accommodation>) => {
		const zAccomodation = zocker(schema.AccommodationSchema);
		return { ...zAccomodation.generate(), ...accommodation };
	},
	travel: (travel?: Partial<schema.Travel>) => {
		// Generate a base travel and ensure optional FK fields are safe
		const zTravel = (): schema.Travel => {
			const generated = zocker(schema.TravelSchema).generate();
			return {
				...generated,
				userId: ALWAYS_USER_TEST.id,
				// Ensure optional FKs don't violate constraints in inserts
				deletedAt: null,
				deletedBy: null,
				destinationAirports: generated.destinationAirports ?? [],
			};
		};
		return { ...zTravel(), ...travel };
	},
	flight: (flight?: Partial<schema.Flight>) => {
		const zFlight = zocker(schema.FlightSchema);
		return { ...zFlight.generate(), ...flight };
	},
	flightParticipant: (
		flightParticipant?: Partial<schema.FlightParticipant>,
	) => {
		const zFlightParticipant = zocker(schema.FlightParticipantSchema);
		return { ...zFlightParticipant.generate(), ...flightParticipant };
	},
	user: (user?: Partial<schema.User>) => {
		const zUser = zocker(schema.UserSchema);
		return { ...zUser.generate(), ...user };
	},
	appEvent: (appEvent?: Partial<schema.AppEvent>) => {
		const zAppEvent = zocker(schema.AppEventSchema);
		return { ...zAppEvent.generate(), ...appEvent };
	},
	travelMember: (travelMember?: Partial<schema.TravelMember>) => {
		const zTravelMember = zocker(schema.TravelMemberSchema);
		return { ...zTravelMember.generate(), ...travelMember };
	},
};
