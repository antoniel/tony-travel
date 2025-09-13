import { db } from "@/lib/db";
import { Travel, TravelMember } from "@/lib/db/schema";

async function migrateTravelOwnership() {
	console.log("Starting travel ownership migration...");

	try {
		// Get all existing travels
		const travels = await db.select().from(Travel);
		console.log(`Found ${travels.length} travels to migrate`);

		let migrated = 0;
		for (const travel of travels) {
			// Check if membership already exists
			const existingMember = await db.query.TravelMember.findFirst({
				where: (members, { eq, and }) =>
					and(
						eq(members.travelId, travel.id),
						eq(members.userId, travel.userId),
					),
			});

			if (!existingMember) {
				// Create TravelMember record with owner role
				await db.insert(TravelMember).values({
					travelId: travel.id,
					userId: travel.userId,
					role: "owner",
					joinedAt: travel.createdAt, // Use travel creation date as join date
				});
				migrated++;
				console.log(`Migrated travel ${travel.id} (${travel.name})`);
			} else {
				console.log(`Skipped travel ${travel.id} - membership already exists`);
			}
		}

		console.log(`Migration completed! Migrated ${migrated} travels.`);
	} catch (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}

// Export for use as a script
if (require.main === module) {
	migrateTravelOwnership()
		.then(() => {
			console.log("Migration script completed successfully");
			process.exit(0);
		})
		.catch((error) => {
			console.error("Migration script failed:", error);
			process.exit(1);
		});
}

export { migrateTravelOwnership };