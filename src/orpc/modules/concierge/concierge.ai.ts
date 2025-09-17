import { serverEnv } from "@/serverEnv";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamToEventIterator } from "@orpc/server";
import { type UIMessage, convertToModelMessages, streamText, tool } from "ai";
import {
	type TripContext,
	generateConciergeSystemPrompt,
} from "./CONCIERGE_SYSTEM_PROMPT";
import { CreateEventToolSchema, ListEventsToolSchema } from "./concierge.tools";

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
) {
	const CONCIERGE_SYSTEM_PROMPT = generateConciergeSystemPrompt(
		conciergeTools,
		tripContext,
	);
	const result = streamText({
		model: openrouter("google/gemini-2.0-flash-lite-001"),
		system: CONCIERGE_SYSTEM_PROMPT,
		messages: convertToModelMessages(input.messages),
		tools: conciergeTools,
	});

	return streamToEventIterator(result.toUIMessageStream());
}

const conciergeTools = {
	createEvent: tool({
		description:
			"Criar um evento para a viagem do usuário (atividade, refeição ou transporte)",
		inputSchema: CreateEventToolSchema,
		// Não incluir execute - o frontend vai gerenciar a execução
	}),
	listEvents: tool({
		description:
			"Listar todos os eventos da viagem com diferentes níveis de detalhe e filtros opcionais",
		inputSchema: ListEventsToolSchema,
		// Não incluir execute - o frontend vai gerenciar a execução
	}),
} as const;
