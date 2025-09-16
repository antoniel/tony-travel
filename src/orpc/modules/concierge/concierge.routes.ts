import { AppResult } from "@/orpc/appResult";
import { optionalAuthProcedure } from "@/orpc/procedure";
import { serverEnv } from "@/serverEnv";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { ORPCError } from "@orpc/client";
import { type as orpcType, streamToEventIterator } from "@orpc/server";
import { type UIMessage, convertToModelMessages, streamText } from "ai";
import { conciergeErrors } from "./concierge.errors";
import {
	ConciergeChatInputSchema,
	ConciergeChatResponseSchema,
} from "./concierge.model";
import { generateConciergeResponseService } from "./concierge.service";

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
			model: string;
			webSearch?: boolean;
		}>(),
	)
	.handler(({ input }) => {
		const result = streamText({
			// model: openrouter("moonshotai/kimi-k2-0905"),
			model: openrouter("z-ai/glm-4.5-air:free"),
			system:
				"You are a helpful assistant that can answer questions and help with tasks",
			messages: convertToModelMessages(input.messages),
		});

		return streamToEventIterator(result.toUIMessageStream());
	});
