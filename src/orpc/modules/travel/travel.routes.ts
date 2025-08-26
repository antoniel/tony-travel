import { startPlanTravel } from "@/lib/prompts";
import { pixabayService } from "@/lib/services/pixabay";
import { os } from "@orpc/server";
import * as z from "zod";
import { travelDAO } from "./travel.dao";
import { TravelSchema } from "./travel.model";

export const generatePrompt = os
	.input(
		z.object({
			tripDates: z.object({ start: z.string(), end: z.string() }),
			budget: z.object({ perPerson: z.number(), currency: z.string() }),
			destination: z.string(),
			groupSize: z.number().int().min(1),
			departureCities: z.array(z.string()).min(1),
		}),
	)
	.output(z.string())
	.handler(({ input }) => {
		return startPlanTravel(input);
	});

export const saveTravel = os
	.input(z.object({ travel: TravelSchema }))
	.output(z.object({ id: z.string() }))
	.handler(async ({ input }) => {
		const id = await travelDAO.createTravel(input.travel);
		return { id };
	});

export const getTravel = os
	.input(z.object({ id: z.string() }))
	.output(TravelSchema.extend({ id: z.string() }))
	.handler(async ({ input }) => {
		const travel = await travelDAO.getTravelById(input.id);

		if (!travel) {
			throw new Error("Travel not found");
		}

		return travel;
	});

export const listTravels = os
	.input(z.object({}).optional())
	.output(z.array(TravelSchema.extend({ id: z.string() })))
	.handler(async () => {
		return await travelDAO.getAllTravels();
	});

export const fetchActivityImage = os
	.input(
		z.object({
			eventId: z.string(),
			title: z.string().min(1),
			location: z.string().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			imageUrl: z.string().nullable(),
			metadata: z
				.object({
					source: z.enum(["pixabay", "manual"]),
					tags: z.array(z.string()),
					photographer: z.string().optional(),
					fetchedAt: z.date(),
					pixabayId: z.number().optional(),
				})
				.nullable(),
			imageSizes: z
				.object({
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
				})
				.optional(),
			error: z.string().optional(),
		}),
	)
	.handler(async ({ input }) => {
		try {
			const image = await pixabayService.searchActivityImage(
				input.title,
				input.location,
			);

			if (!image) {
				return {
					success: false,
					error: "No suitable image found",
					imageUrl: null,
					metadata: null,
				};
			}

			const metadata = pixabayService.createImageMetadata(image);
			if (input.eventId) {
				await travelDAO.updateEventImage(
					input.eventId,
					image.webformatURL,
					metadata,
				);
			}

			return {
				success: true,
				imageUrl: image.webformatURL,
				metadata,
				imageSizes: pixabayService.getImageSizes(image),
			};
		} catch (error) {
			console.error("Error fetching activity image:", error);
			return {
				success: false,
				error: "Failed to fetch image",
				imageUrl: null,
				metadata: null,
			};
		}
	});

export const updateEventImage = os
	.input(
		z.object({
			eventId: z.string(),
			imageUrl: z.string(),
			metadata: z.object({
				source: z.enum(["pixabay", "manual"]),
				tags: z.array(z.string()),
				photographer: z.string().optional(),
				fetchedAt: z.date(),
				pixabayId: z.number().optional(),
			}),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input }) => {
		try {
			await travelDAO.updateEventImage(
				input.eventId,
				input.imageUrl,
				input.metadata,
			);
			return { success: true };
		} catch (error) {
			console.error("Error updating event image:", error);
			return { success: false };
		}
	});
