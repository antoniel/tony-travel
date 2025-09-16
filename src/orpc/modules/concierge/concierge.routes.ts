import { AppResult } from "@/orpc/appResult";
import { optionalAuthProcedure } from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import {
	ConciergeChatInputSchema,
	ConciergeChatResponseSchema,
} from "./concierge.model";
import { conciergeErrors } from "./concierge.errors";
import { generateConciergeResponseService } from "./concierge.service";

// Non-streaming concierge completion endpoint.
// For streaming UI, prefer a dedicated server route using `streamText`.
export const generateConciergeResponse = optionalAuthProcedure
	.errors(conciergeErrors)
	.input(ConciergeChatInputSchema)
	.output(ConciergeChatResponseSchema)
	.handler(async ({ input }) => {
		const result = await generateConciergeResponseService(input);
		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}
		return result.data;
	});

