import { serverEnv } from "@/serverEnv";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamToEventIterator } from "@orpc/server";
import { type UIMessage, convertToModelMessages, streamText, tool } from "ai";
import { CreateEventToolSchema } from "./concierge.tools";

/**
 * OpenRouter provider instance for AI interactions
 */
const openrouter = createOpenRouter({
	apiKey: serverEnv.OPENROUTER_API_KEY,
});

/**
 * System prompt for the concierge AI agent
 */
const CONCIERGE_SYSTEM_PROMPT = `\
Você é um assistente de viagens especializado em ajudar a organizar e planejar viagens. Você pode sugerir a criação de eventos como:
- Atividades turísticas (type: "activity")
- Refeições e experiências gastronômicas (type: "food") 
- Transporte e deslocamentos (type: "travel")

Quando o usuário solicitar ou quando você identificar uma oportunidade de criar um evento, use a ferramenta createEvent com os detalhes apropriados. Sempre inclua datas e horários específicos em formato ISO 8601.`;

export interface ConciergeChatStreamInput {
	messages: UIMessage[];
}
export function createConciergeStream(input: ConciergeChatStreamInput) {
	const result = streamText({
		// model: openrouter("moonshotai/kimi-k2-0905"),
		model: openrouter("z-ai/glm-4.5-air:free"),
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
} as const;
