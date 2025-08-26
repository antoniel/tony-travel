import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

export default defineConfig({
  dialect: "turso",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: env.DATABASE_URL || "file:./local.db",
    authToken: env.DATABASE_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
});