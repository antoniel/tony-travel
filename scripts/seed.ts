import { db } from "@/lib/db";
import { Travel, Accommodation, AppEvent } from "@/lib/db/schema";
import { colombiaTravel, peruTravel } from "@/orpc/modules/travel/travel.data";

async function seed() {
	console.log("Starting database seed...");

	try {
		// Clear existing data
		console.log("Clearing existing data...");
		await db.delete(AppEvent);
		await db.delete(Accommodation);
		await db.delete(Travel);

		// Seed Colombia travel
		console.log("Seeding Colombia travel...");
		await db.insert(Travel).values({
			id: colombiaTravel.id,
			name: colombiaTravel.name,
			destination: colombiaTravel.destination,
			startDate: colombiaTravel.startDate,
			endDate: colombiaTravel.endDate,
			locationInfo: colombiaTravel.locationInfo,
			visaInfo: colombiaTravel.visaInfo,
		});

		// Insert accommodations for Colombia
		for (const accommodation of colombiaTravel.accommodation) {
			await db.insert(Accommodation).values({
				...accommodation,
				travelId: colombiaTravel.id,
			});
		}

		// Insert events for Colombia (with dependencies)
		const insertEvents = async (events: typeof colombiaTravel.events, travelId: string, parentEventId?: string) => {
			for (const event of events) {
				await db.insert(AppEvent).values({
					id: event.id,
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					estimatedCost: event.estimatedCost,
					type: event.type,
					location: event.location,
					travelId,
					parentEventId,
				});
				
				// Insert dependencies recursively
				if (event.dependencies && event.dependencies.length > 0) {
					await insertEvents(event.dependencies, travelId, event.id);
				}
			}
		};

		await insertEvents(colombiaTravel.events, colombiaTravel.id);

		// Seed Peru travel
		console.log("Seeding Peru travel...");
		await db.insert(Travel).values({
			id: peruTravel.id,
			name: peruTravel.name,
			destination: peruTravel.destination,
			startDate: peruTravel.startDate,
			endDate: peruTravel.endDate,
			locationInfo: peruTravel.locationInfo,
			visaInfo: peruTravel.visaInfo,
		});

		// Insert accommodations for Peru
		for (const accommodation of peruTravel.accommodation) {
			await db.insert(Accommodation).values({
				...accommodation,
				travelId: peruTravel.id,
			});
		}

		// Insert events for Peru
		await insertEvents(peruTravel.events, peruTravel.id);

		console.log("Database seed completed successfully!");
	} catch (error) {
		console.error("Error seeding database:", error);
		process.exit(1);
	}
}

seed();