import { db } from './index';
import { travels, accommodations, events } from './schema';
import { colombiaTravel, peruTravel } from '@/orpc/modules/travel/travel.data';
import type { Travel, AppEvent } from '@/lib/types';

// Helper function to flatten event dependencies
function flattenEvents(eventList: AppEvent[]): AppEvent[] {
  const flattened: AppEvent[] = [];
  
  for (const event of eventList) {
    flattened.push(event);
    if (event.dependencies) {
      flattened.push(...flattenEvents(event.dependencies));
    }
  }
  
  return flattened;
}

// Helper function to create event dependencies mapping
function createEventDependencies(eventList: AppEvent[]): Map<string, string[]> {
  const dependencies = new Map<string, string[]>();
  
  for (const event of eventList) {
    if (event.dependencies) {
      dependencies.set(event.id, event.dependencies.map(dep => dep.id));
    }
  }
  
  return dependencies;
}

async function seedTravel(travel: Travel) {
  console.log(`🌱 Seeding travel: ${travel.name}`);
  
  // Insert travel
  await db.insert(travels).values({
    id: travel.id,
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
        travelId: travel.id,
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

  // Flatten all events (including dependencies)
  const allEvents = flattenEvents(travel.events);
  const uniqueEvents = Array.from(
    new Map(allEvents.map(event => [event.id, event])).values()
  );

  // Create dependency mapping
  const eventDependencies = createEventDependencies(travel.events);

  // Insert events (without parent references first)
  await db.insert(events).values(
    uniqueEvents.map(event => ({
      id: event.id,
      travelId: travel.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      estimatedCost: event.estimatedCost,
      type: event.type,
      location: event.location,
      parentEventId: null, // Will be updated later
    }))
  );

  // Update parent event references for dependencies
  for (const [parentId, dependencyIds] of eventDependencies) {
    for (const depId of dependencyIds) {
      await db.update(events)
        .set({ parentEventId: parentId })
        .where(eq(events.id, depId));
    }
  }

  console.log(`✅ Successfully seeded travel: ${travel.name}`);
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await db.delete(events);
    await db.delete(accommodations);
    await db.delete(travels);

    // Seed travel data
    await seedTravel(colombiaTravel);
    await seedTravel(peruTravel);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Import eq function from drizzle-orm
import { eq } from 'drizzle-orm';

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}