import { z } from "zod";

/**
 * Schema para a tool de criação de eventos do concierge
 */
export const CreateEventToolSchema = z.object({
	title: z.string().describe("Título do evento (ex: 'Jantar no restaurante', 'Visita ao museu')"),
	startDate: z.string().describe("Data e hora de início no formato ISO 8601 (ex: '2024-03-15T19:00:00')"),
	endDate: z.string().describe("Data e hora de fim no formato ISO 8601 (ex: '2024-03-15T21:00:00')"),
	type: z.enum(["travel", "food", "activity"]).describe("Tipo do evento: travel (transporte), food (alimentação), activity (atividade)"),
	location: z.string().optional().describe("Local do evento (ex: 'Restaurante ABC', 'Museu XYZ', 'Hotel')"),
	estimatedCost: z.number().optional().describe("Custo estimado em reais (ex: 150.50)"),
});

export type CreateEventToolInput = z.infer<typeof CreateEventToolSchema>;

/**
 * Schema para todas as tools disponíveis do concierge
 */
export const ConciergeToolsSchema = z.object({
	createEvent: CreateEventToolSchema,
});

export type ConciergeToolsInput = z.infer<typeof ConciergeToolsSchema>;