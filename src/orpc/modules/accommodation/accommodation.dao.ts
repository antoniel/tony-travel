import { Accommodation, type InsertAccommodation } from "@/lib/db/schema"
import type { DB } from "@/lib/db/types"
import { eq } from "drizzle-orm"

export class AccommodationDAO {
	constructor(private readonly db: DB) {}

	async createAccommodation(data: InsertAccommodation): Promise<string> {
		const [result] = await this.db
			.insert(Accommodation)
			.values(data)
			.returning({ id: Accommodation.id })
		return result.id
	}

	async getAccommodationById(id: string) {
		const accommodation = await this.db.query.Accommodation.findFirst({
			where: eq(Accommodation.id, id),
		})
		return accommodation || null
	}

	async getAccommodationsByTravel(travelId: string) {
		const accommodations = await this.db.query.Accommodation.findMany({
			where: eq(Accommodation.travelId, travelId),
			orderBy: [Accommodation.startDate],
		})
		return accommodations
	}

	async updateAccommodation(id: string, data: Partial<InsertAccommodation>): Promise<void> {
		await this.db
			.update(Accommodation)
			.set(data)
			.where(eq(Accommodation.id, id))
	}

	async deleteAccommodation(id: string): Promise<void> {
		await this.db
			.delete(Accommodation)
			.where(eq(Accommodation.id, id))
	}
}

export const createAccommodationDAO = (db: DB) => new AccommodationDAO(db)