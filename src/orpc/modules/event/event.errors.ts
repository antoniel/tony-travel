import type { ErrorType } from "@/orpc/appResult";
import { z } from "zod";

export const eventErrors = {
	EVENT_NOT_FOUND: {
		message: "Evento não encontrado",
		data: z.object({
			eventId: z.string(),
		}),
	},
	TRAVEL_NOT_FOUND: {
		message: "Viagem não encontrada",
		data: z
			.object({
				travelId: z.string(),
			})
			.optional(),
	},
	EVENT_DATES_INVALID: {
		message: "As datas do evento são inválidas",
		data: z.object({
			startDate: z.string(),
			endDate: z.string(),
			travelStartDate: z.string(),
			travelEndDate: z.string(),
		}),
	},
	IMAGE_FETCH_FAILED: {
		message: "Não foi possível carregar a imagem",
		data: z
			.object({
				title: z.string(),
				location: z.string().optional(),
			})
			.optional(),
	},
	IMAGE_UPDATE_FAILED: {
		message: "Não foi possível atualizar a imagem",
		data: z
			.object({
				eventId: z.string(),
			})
			.optional(),
	},
	INVALID_EVENT_DATA: {
		message: "Dados do evento inválidos",
		data: z.object({}),
	},
} satisfies ErrorType;
