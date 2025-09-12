import { os } from "@orpc/server";
import { requireAuth } from "./middleware/auth-middleware";
import { logger } from "./middleware/logger";

export const baseProcedure = os.use(logger);
export const authProcedure = baseProcedure.use(requireAuth);
