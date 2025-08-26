import { serverEnv } from "@/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: serverEnv.DATABASE_URL || "file:./local.db",
	authToken: serverEnv.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
