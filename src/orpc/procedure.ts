import type { DB } from "@/lib/db/types";
import { os } from "@orpc/server";
import type { RequestHeadersPluginContext } from "@orpc/server/plugins";
import { optionalAuth, requireAuth } from "./middleware/auth-middleware";
import { logger } from "./middleware/logger";

export interface ORPCContext extends RequestHeadersPluginContext {
	db: DB;
}
export const baseProcedure = os.$context<ORPCContext>().use(logger);
export const authProcedure = baseProcedure.use(requireAuth);
export const optionalAuthProcedure = baseProcedure.use(optionalAuth);
