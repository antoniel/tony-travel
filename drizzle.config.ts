import { defineConfig } from "drizzle-kit";
import { serverEnv } from "./src/env";

export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: serverEnv.DATABASE_URL || "file:./local.db",
    authToken: serverEnv.DATABASE_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
});