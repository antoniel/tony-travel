import type { DB } from "@/lib/db/types";
import {
	Accommodation,
	Travel,
} from "@/lib/db/schema";
import type { TravelWithRelations } from "@/lib/types";
import { eq } from "drizzle-orm";
import type * as z from "zod";
import type { InsertFullTravel } from "./travel.model";

type TravelInput = z.infer<typeof InsertFullTravel>;

export class TravelDAO {
	constructor(private readonly db: DB) {}
	async createTravel(travelData: TravelInput & { userId: string }): Promise<string> {
		const [travel] = await this.db
			.insert(Travel)
			.values({
				name: travelData.name,
				destination: travelData.destination,
				startDate: travelData.startDate,
				endDate: travelData.endDate,
				locationInfo: travelData.locationInfo,
				visaInfo: travelData.visaInfo,
				userId: travelData.userId,
			})
			.returning({ id: Travel.id });

		const travelId = travel.id;

		if (travelData.accommodations.length > 0) {
			await this.db
				.insert(Accommodation)
				.values(travelData.accommodations.map((a) => ({ ...a, travelId })));
		}

		// Note: Events are now handled by the Event module

		return travelId;
	}

	async getTravelById(id: string): Promise<TravelWithRelations | null> {
		const travel = await this.db.query.Travel.findFirst({
			where: eq(Travel.id, id),
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
			},
		});

		if (!travel) {
			return null;
		}

		return travel;
	}

	async getAllTravels(): Promise<TravelWithRelations[]> {
		const travels = await this.db.query.Travel.findMany({
			with: {
				accommodations: true,
				events: {
					with: {
						dependencies: true,
					},
				},
			},
		});

		return travels;
	}



}

export const createTravelDAO = (db: DB) => new TravelDAO(db);
