import type { DB } from "@/lib/db/types";
import { createClient } from "@libsql/client";
import { call } from "@orpc/server";
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
	return db as unknown as DB;
};

export const appCall = call;

export const AUTH_TEST_HEADERS = new Headers();
AUTH_TEST_HEADERS.set("Authorization", "Bearer test-token");
