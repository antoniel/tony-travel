import { AppResult } from "@/orpc/appResult";
import { generateText } from "ai";
import { conciergeErrors } from "./concierge.errors";
import type {
	ConciergeChatInput,
	ConciergeChatResponse,
} from "./concierge.model";

/**
 * Generate a non-streaming concierge response using the AI SDK.
 *
 * Notes:
 * - Uses `generateText` for a single completion derived from the provided messages.
 * - For streaming UI, prefer a server route using `streamText()` and `toUIMessageStreamResponse()`.
 */
export async function generateConciergeResponseService(
	input: ConciergeChatInput,
): Promise<AppResult<ConciergeChatResponse, typeof conciergeErrors>> {
	try {
		const useWebSearch = input.webSearch === true;
		const model = useWebSearch ? "perplexity/sonar" : input.model;


		// Collapse the conversation into a single prompt for a basic completion
		const prompt = input.messages
			.map((m) => `${m.role.toUpperCase()}: ${m.text}`)
			.join("\n");

		const result = await generateText({
			model,
			prompt,
			system:
				"You are a helpful assistant that can answer questions and help with tasks",
		});

		return AppResult.success({
			text: result.text,
			// The generateText API may not always expose reasoning/sources; keep optional
			reasoning: undefined,
			sources: [],
		});
	} catch (error) {
		return AppResult.failure(
			conciergeErrors,
			"COMPLETION_FAILED",
			"Failed to generate concierge response",
			{ reason: error instanceof Error ? error.message : undefined },
		);
	}
}
