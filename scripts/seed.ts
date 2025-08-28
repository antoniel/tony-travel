import { db } from "@/lib/db";
import { Accommodation, AppEvent, Travel } from "@/lib/db/schema";
import { colombiaTravel, colombiaTravelAccommodations, colombiaTravelEvents, peruTravel, peruTravelAccommodations, peruTravelEvents } from "@/orpc/modules/travel/travel.data";

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
		const [colombiaTravelResult] = await db.insert(Travel).values({
			name: colombiaTravel.name,
			destination: colombiaTravel.destination,
			startDate: colombiaTravel.startDate,
			endDate: colombiaTravel.endDate,
			locationInfo: colombiaTravel.locationInfo,
			visaInfo: colombiaTravel.visaInfo,
		}).returning({ id: Travel.id });

		const colombiaTravelId = colombiaTravelResult.id;

		// Insert accommodations for Colombia
		for (const accommodation of colombiaTravelAccommodations) {
			await db.insert(Accommodation).values({
				...accommodation,
				travelId: colombiaTravelId,
			});
		}

		// Insert events for Colombia (with dependencies)
		const insertEvents = async (events: typeof colombiaTravelEvents, travelId: string, parentEventId?: string) => {
			for (const event of events) {
				await db.insert(AppEvent).values({
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					estimatedCost: event.estimatedCost,
					type: event.type,
					location: event.location,
					travelId,
					parentEventId,
				}).returning({ id: AppEvent.id });
			}
		};

		await insertEvents(colombiaTravelEvents, colombiaTravelId);

		// Seed Peru travel
		console.log("Seeding Peru travel...");
		const [peruTravelResult] = await db.insert(Travel).values({
			name: peruTravel.name,
			destination: peruTravel.destination,
			startDate: peruTravel.startDate,
			endDate: peruTravel.endDate,
			locationInfo: peruTravel.locationInfo,
			visaInfo: peruTravel.visaInfo,
		}).returning({ id: Travel.id });

		const peruTravelId = peruTravelResult.id;

		// Insert accommodations for Peru
		for (const accommodation of peruTravelAccommodations) {
			await db.insert(Accommodation).values({
				...accommodation,
				// ID is auto-generated via $defaultFn
				travelId: peruTravelId,
			});
		}

		// Insert events for Peru
		await insertEvents(peruTravelEvents, peruTravelId);

		console.log("Database seed completed successfully!");
	} catch (error) {
		console.error("Error seeding database:", error);
		process.exit(1);
	}
}

seed();