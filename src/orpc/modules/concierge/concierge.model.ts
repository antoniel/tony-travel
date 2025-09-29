import * as z from "zod";

// Input schema for a concierge chat/completion request
export const ConciergeChatInputSchema = z.object({
	// Provider model identifier, e.g. "openai/gpt-4o", "deepseek/deepseek-r1"
	model: z.string().min(1, "Model is required"),
	// Minimal message format for server-side completion (role + text)
	messages: z.array(
		z.object({
			role: z.enum(["user", "assistant", "system"]).default("user"),
			text: z.string().min(1, "Message text is required"),
		}),
	),
	// Optional boolean to switch to a web-search-enabled model (e.g., Perplexity Sonar)
	webSearch: z.boolean().optional().default(false),
});

export type ConciergeChatInput = z.infer<typeof ConciergeChatInputSchema>;

// Output schema for a concierge completion
export const ConciergeChatResponseSchema = z.object({
	text: z.string(),
	// Optional reasoning text returned by some models (e.g., DeepSeek R1)
	reasoning: z.string().nullable().optional(),
	// Optional sources returned by web-search-enabled models
	sources: z
		.array(
			z.object({
				url: z.string(),
				title: z.string().optional(),
			}),
		)
		.optional()
		.default([]),
});

export type ConciergeChatResponse = z.infer<typeof ConciergeChatResponseSchema>;

export const PendingIssueTypeSchema = z.enum(["flight", "accommodation", "event"]);

export const PendingIssueSeveritySchema = z.enum(["critical", "advisory"]);

export const PendingIssueActionSchema = z.object({
	type: z.enum(["navigate"]),
	label: z.string().min(1),
	path: z.string().min(1),
	params: z
		.record(z.string(), z.string())
		.default({})
		.optional(),
});

export const PendingIssueSchema = z.object({
	id: z.string().min(1),
	type: PendingIssueTypeSchema,
	severity: PendingIssueSeveritySchema,
	title: z.string().min(1),
	description: z.string().min(1),
	affectedTravelers: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
			}),
		)
		.default([]),
	missingCount: z.number().int().min(0).default(0),
	action: PendingIssueActionSchema.optional(),
	gapRanges: z
		.array(
			z.object({
				start: z.string(),
				end: z.string(),
			}),
		)
		.default([]),
});

export const PendingIssuesSummarySchema = z.object({
	issues: z.array(PendingIssueSchema),
	criticalCount: z.number().int().min(0),
	advisoryCount: z.number().int().min(0),
	hasCritical: z.boolean(),
	hasIssues: z.boolean(),
});

export type PendingIssue = z.infer<typeof PendingIssueSchema>;
export type PendingIssuesSummary = z.infer<typeof PendingIssuesSummarySchema>;
