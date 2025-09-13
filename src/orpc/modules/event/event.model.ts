import { AppEventSchema, InsertAppEventSchema } from "@/lib/db/schema";
import * as z from "zod";

export { AppEventSchema, InsertAppEventSchema };

export const ImageMetadataSchema = z.object({
	source: z.enum(["pixabay", "manual"]),
	tags: z.array(z.string()),
	photographer: z.string().optional(),
	fetchedAt: z.date(),
	pixabayId: z.number().optional(),
});

export const ImageSizesSchema = z.object({
	thumbnail: z.object({
		url: z.string(),
		width: z.number(),
		height: z.number(),
	}),
	medium: z.object({
		url: z.string(),
		width: z.number(),
		height: z.number(),
	}),
	large: z.object({
		url: z.string(),
		width: z.number(),
		height: z.number(),
	}),
});

export const FetchActivityImageInputSchema = z.object({
	eventId: z.string(),
	title: z.string().min(1),
	location: z.string().optional(),
});

export const FetchActivityImageOutputSchema = z.object({
	success: z.boolean(),
	imageUrl: z.string().nullable(),
	metadata: ImageMetadataSchema.nullable(),
	imageSizes: ImageSizesSchema.optional(),
	error: z.string().optional(),
});

export const UpdateEventImageInputSchema = z.object({
	eventId: z.string(),
	imageUrl: z.string(),
	metadata: ImageMetadataSchema,
});

export const UpdateEventImageOutputSchema = z.object({
	success: z.boolean(),
});

export const CreateEventInputSchema = InsertAppEventSchema.extend({
	travelId: z.string(),
});

export const CreateEventOutputSchema = z.object({
	id: z.string(),
});

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;
export type ImageSizes = z.infer<typeof ImageSizesSchema>;
export type FetchActivityImageInput = z.infer<
	typeof FetchActivityImageInputSchema
>;
export type FetchActivityImageOutput = z.infer<
	typeof FetchActivityImageOutputSchema
>;
export type UpdateEventImageInput = z.infer<typeof UpdateEventImageInputSchema>;
export type UpdateEventImageOutput = z.infer<
	typeof UpdateEventImageOutputSchema
>;
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type CreateEventOutput = z.infer<typeof CreateEventOutputSchema>;
