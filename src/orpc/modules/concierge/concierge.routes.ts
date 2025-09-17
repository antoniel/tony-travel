import { AppResult } from "@/orpc/appResult";
import { optionalAuthProcedure } from "@/orpc/procedure";
import { serverEnv } from "@/serverEnv";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ORPCError } from "@orpc/client";
import { type as orpcType, streamToEventIterator } from "@orpc/server";
import { type UIMessage, convertToModelMessages, streamText, tool } from "ai";
import { conciergeErrors } from "./concierge.errors";
import {
	ConciergeChatInputSchema,
	ConciergeChatResponseSchema,
} from "./concierge.model";
import { generateConciergeResponseService } from "./concierge.service";
import { CreateEventToolSchema } from "./concierge.tools";

const openrouter = createOpenRouter({
	apiKey: serverEnv.OPENROUTER_API_KEY,
});
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

export const chat = optionalAuthProcedure
	.input(
		orpcType<{
			chatId: string;
			messages: UIMessage[];
			webSearch?: boolean;
		}>(),
	)
	.handler(({ input }) => {
		const result = streamText({
			// model: openrouter("moonshotai/kimi-k2-0905"),
			model: openrouter("z-ai/glm-4.5-air:free"),
			system: `Você é um assistente de viagens especializado em ajudar a organizar e planejar viagens. Você pode sugerir a criação de eventos como:
- Atividades turísticas (type: "activity")
- Refeições e experiências gastronômicas (type: "food") 
- Transporte e deslocamentos (type: "travel")

Quando o usuário solicitar ou quando você identificar uma oportunidade de criar um evento, use a ferramenta createEvent com os detalhes apropriados. Sempre inclua datas e horários específicos em formato ISO 8601.`,
			messages: convertToModelMessages(input.messages),
			tools: {
				createEvent: tool({
					description:
						"Criar um evento para a viagem do usuário (atividade, refeição ou transporte)",
					inputSchema: CreateEventToolSchema,
					// Não incluir execute - o frontend vai gerenciar a execução
				}),
			},
		});

		return streamToEventIterator(result.toUIMessageStream());
	});
