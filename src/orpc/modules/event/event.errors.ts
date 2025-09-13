import type { ErrorType } from "@/orpc/appResult";
import { z } from "zod";

export const eventErrors = {
	EVENT_NOT_FOUND: {
		message: "Event not found",
		data: z.object({
			eventId: z.string(),
		}),
	},
	TRAVEL_NOT_FOUND: {
		message: "Travel not found",
		data: z
			.object({
				travelId: z.string(),
			})
			.optional(),
	},
	IMAGE_FETCH_FAILED: {
		message: "Image fetch failed",
		data: z
			.object({
				title: z.string(),
				location: z.string().optional(),
			})
			.optional(),
	},
	IMAGE_UPDATE_FAILED: {
		message: "Image update failed",
		data: z
			.object({
				eventId: z.string(),
			})
			.optional(),
	},
	INVALID_EVENT_DATA: {
		message: "Invalid event data",
		data: z.object({}),
	},
} satisfies ErrorType;
