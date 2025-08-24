import { startPlanTravel } from "@/lib/prompts";
import { os } from "@orpc/server";
import * as z from "zod";
import { colombiaTravel, peruTravel } from "./travel.data";
import { TravelSchema } from "./travel.model";

type TravelStored = z.infer<typeof TravelSchema> & { id: string };

// In-memory store (replace with DB later)
const travelStore = new Map<string, TravelStored>();
travelStore.set(colombiaTravel.id, colombiaTravel);
travelStore.set(peruTravel.id, peruTravel);

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
		const record: TravelStored = { id, ...input.travel };
		travelStore.set(id, record);
		return { id };
	});

export const getTravel = os
	.input(z.object({ id: z.string() }))
	.output(TravelSchema.extend({ id: z.string() }))
	.handler(async ({ input }) => {
		const found = travelStore.get(input.id);
		if (!found) {
			throw new Error("Travel not found");
		}
		return found;
	});

export const listTravels = os
	.input(z.object({}).optional())
	.output(z.array(TravelSchema.extend({ id: z.string() })))
	.handler(async () => {
		return Array.from(travelStore.values());
	});
