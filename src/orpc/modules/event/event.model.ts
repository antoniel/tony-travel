import { AppEventSchema, InsertAppEventSchema } from "@/lib/db/schema";
import * as z from "zod";

export { AppEventSchema, InsertAppEventSchema };

export const CreateEventInputSchema = InsertAppEventSchema.extend({
	travelId: z.string(),
});

export const CreateEventOutputSchema = z.object({
	success: z.boolean(),
	eventId: z.string().nullable(),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type CreateEventOutput = z.infer<typeof CreateEventOutputSchema>;

// Update event (partial) requires travelId for membership check and event id
export const UpdateEventInputSchema = z.object({
	travelId: z.string(),
	id: z.string(),
	event: InsertAppEventSchema.partial().omit({
		id: true,
		createdAt: true,
		updatedAt: true,
		travelId: true,
	}),
});

export const UpdateEventOutputSchema = z.object({ success: z.boolean() });

export type UpdateEventInput = z.infer<typeof UpdateEventInputSchema>;
export type UpdateEventOutput = z.infer<typeof UpdateEventOutputSchema>;

export const DeleteEventInputSchema = z.object({
	travelId: z.string(),
	id: z.string(),
});

export const DeleteEventOutputSchema = z.object({ success: z.boolean() });

export type DeleteEventInput = z.infer<typeof DeleteEventInputSchema>;
export type DeleteEventOutput = z.infer<typeof DeleteEventOutputSchema>;
