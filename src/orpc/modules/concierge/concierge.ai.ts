import type { DB } from "@/lib/db/types";
import { AppResult } from "@/orpc/appResult";
import { serverEnv } from "@/serverEnv";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamToEventIterator } from "@orpc/server";
import {
	type UIMessage,
	convertToModelMessages,
	stepCountIs,
	streamText,
	tool,
} from "ai";
import { createEventDAO } from "../event/event.dao";
import { getEventsByTravelService } from "../event/event.service";
import { createTravelDAO } from "../travel/travel.dao";
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
	const travelId = tripContext.travelId;

	return {
		createEvent: tool({
			description:
				"Criar um evento para a viagem do usuário (atividade, refeição ou transporte)",
			inputSchema: CreateEventToolSchema,
		}),
		listEvents: tool({
			description:
				"Listar todos os eventos da viagem com diferentes níveis de detalhe e filtros opcionais",
			inputSchema: ListEventsToolSchema,
			execute: async (input) => {
				const eventDAO = createEventDAO(db);
				const travelDAO = createTravelDAO(db);

				const result = await getEventsByTravelService(
					eventDAO,
					travelDAO,
					travelId,
				);

				if (AppResult.isFailure(result)) {
					return {
						success: false,
						error: result.error.message,
						events: [],
					};
				}

				const events = result.data;

				// Apply filters if specified
				let filteredEvents = events;

				if (input.filterByType) {
					filteredEvents = events.filter(
						(event) => event.type === input.filterByType,
					);
				}

				if (input.dateRange) {
					const startDate = new Date(input.dateRange.startDate);
					const endDate = new Date(input.dateRange.endDate);
					filteredEvents = filteredEvents.filter((event) => {
						const eventStart = new Date(event.startDate);
						return eventStart >= startDate && eventStart <= endDate;
					});
				}

				// Format based on granularity
				const formattedEvents = filteredEvents.map((event) => {
					if (input.granularity === "detailed") {
						return {
							id: event.id,
							title: event.title,
							startDate: event.startDate.toISOString(),
							endDate: event.endDate.toISOString(),
							type: event.type,
							location: event.location,
							description: event.description,
							estimatedCost: event.estimatedCost,
							cost: event.cost,
							link: event.link,
						};
					}
					return {
						id: event.id,
						title: event.title,
						startDate: event.startDate.toISOString(),
						type: event.type,
					};
				});

				return {
					success: true,
					events: formattedEvents,
					count: formattedEvents.length,
					message: `Encontrados ${formattedEvents.length} eventos para esta viagem`,
				};
			},
		}),
	} as const;
}
