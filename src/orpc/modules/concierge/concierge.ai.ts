import type { DB } from "@/lib/db/types";
import { serverEnv } from "@/serverEnv";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamToEventIterator } from "@orpc/server";
import {
	type InferUITools,
	type UIMessage,
	convertToModelMessages,
	stepCountIs,
	streamText,
	tool,
} from "ai";
import {
	type TripContext,
	generateConciergeSystemPrompt,
} from "./CONCIERGE_SYSTEM_PROMPT";
import {
	GetAccomodationsTool,
	GetTravelParticipantsTool,
	ListEventsTool,
	RequestToCreateAccommodationTool,
	RequestToCreateEventTool,
	RequestToDeleteAccommodationTool,
	RequestToUpdateAccommodationTool,
} from "./concierge.tools";

/**
 * OpenRouter provider instance for AI interactions
 */
const openrouter = createOpenRouter({
	apiKey: serverEnv.OPENROUTER_API_KEY,
});

export interface ConciergeChatStreamInput {
	messages: UIMessage[];
}
export function createConciergeStream(
	input: ConciergeChatStreamInput,
	tripContext: TripContext,
	db: DB,
) {
	const tools = createConciergeTools(db, tripContext);
	const CONCIERGE_SYSTEM_PROMPT = generateConciergeSystemPrompt(
		tools,
		tripContext,
	);
	const result = streamText({
		model: openrouter("google/gemini-2.0-flash-lite-001"),
		system: CONCIERGE_SYSTEM_PROMPT,
		messages: convertToModelMessages(input.messages),
		tools,
		stopWhen: stepCountIs(10),
	});

	return streamToEventIterator(result.toUIMessageStream());
}

/**
 * Creates concierge tools with database access for execution
 */
function createConciergeTools(db: DB, tripContext: TripContext) {
	return {
		requestToCreateEvent: tool(new RequestToCreateEventTool(db, tripContext)),
		requestToCreateAccommodation: tool(
			new RequestToCreateAccommodationTool(db, tripContext),
		),
		requestToUpdateAccommodation: tool(
			new RequestToUpdateAccommodationTool(db, tripContext),
		),
		requestToDeleteAccommodation: tool(
			new RequestToDeleteAccommodationTool(db, tripContext),
		),
		listEvents: tool(new ListEventsTool(db, tripContext)),
		getTravelParticipants: tool(new GetTravelParticipantsTool(db, tripContext)),
		getAccomodations: tool(new GetAccomodationsTool(db, tripContext)),
	} as const;
}

export type MyConciergeTools = ReturnType<typeof createConciergeTools>;
/**
 * Type-safe UIMessage with properly typed tools for the concierge
 */
export type MyUIMessage = UIMessage<
	never,
	never,
	InferUITools<MyConciergeTools>
>;
