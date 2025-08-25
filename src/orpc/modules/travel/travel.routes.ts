import { startPlanTravel } from "@/lib/prompts";
import { os } from "@orpc/server";
import * as z from "zod";
import { TravelSchema } from "./travel.model";
import { getAllTravels, getTravelById } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { travels, accommodations, events } from "@/lib/db/schema";
import type { Travel } from "@/lib/types";

type TravelStored = z.infer<typeof TravelSchema> & { id: string };

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
		const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const travel = input.travel;
		
		// Insert travel
		await db.insert(travels).values({
			id,
			name: travel.name,
			destination: travel.destination,
			startDate: travel.startDate,
			endDate: travel.endDate,
			locationInfo: travel.locationInfo,
			visaInfo: travel.visaInfo,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Insert accommodations
		if (travel.accommodation.length > 0) {
			await db.insert(accommodations).values(
				travel.accommodation.map(acc => ({
					id: acc.id,
					travelId: id,
					name: acc.name,
					type: acc.type,
					startDate: acc.startDate,
					endDate: acc.endDate,
					address: acc.address,
					rating: acc.rating,
					price: acc.price,
					currency: acc.currency,
				}))
			);
		}

		// Helper function to flatten and insert events
		const flattenEvents = async (eventList: typeof travel.events, parentId: string | null = null): Promise<void> => {
			for (const event of eventList) {
				// Insert the event
				await db.insert(events).values({
					id: event.id,
					travelId: id,
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					estimatedCost: event.estimatedCost,
					type: event.type,
					location: event.location,
					parentEventId: parentId,
				});

				// Insert dependencies
				if (event.dependencies) {
					await flattenEvents(event.dependencies, event.id);
				}
			}
		};

		await flattenEvents(travel.events);
		
		return { id };
	});

export const getTravel = os
	.input(z.object({ id: z.string() }))
	.output(TravelSchema.extend({ id: z.string() }))
	.handler(async ({ input }) => {
		const found = await getTravelById(input.id);
		if (!found) {
			throw new Error("Travel not found");
		}
		return found;
	});

export const listTravels = os
	.input(z.object({}).optional())
	.output(z.array(TravelSchema.extend({ id: z.string() })))
	.handler(async () => {
		const travels = await getAllTravels();
		return travels;
	});
