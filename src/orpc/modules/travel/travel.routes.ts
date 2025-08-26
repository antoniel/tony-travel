import { startPlanTravel } from "@/lib/prompts";
import { os } from "@orpc/server";
import * as z from "zod";
import { TravelSchema } from "./travel.model";
import { travelDAO } from "./travel.dao";

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
