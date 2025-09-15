import { AppEventSchema, InsertAppEventSchema } from "@/lib/db/schema";
import * as z from "zod";

export { AppEventSchema, InsertAppEventSchema };

export const CreateEventInputSchema = InsertAppEventSchema.extend({
	travelId: z.string(),
});

export const CreateEventOutputSchema = z.object({
	id: z.string(),
});
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type CreateEventOutput = z.infer<typeof CreateEventOutputSchema>;
