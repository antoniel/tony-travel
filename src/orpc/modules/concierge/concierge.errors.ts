import * as z from "zod";

export const conciergeErrors = {
	PROVIDER_UNAVAILABLE: {
		message: "AI provider not configured or unavailable",
		data: z.object({ provider: z.string().optional() }).optional(),
	},
	COMPLETION_FAILED: {
		message: "Failed to generate concierge response",
		data: z
			.object({
				reason: z.string().optional(),
			})
			.optional(),
	},
} as const;

export type ConciergeErrorCode = keyof typeof conciergeErrors;

