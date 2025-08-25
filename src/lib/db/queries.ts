import { db } from './index';
import { travels, accommodations, events } from './schema';
import { eq } from 'drizzle-orm';
import type { Travel, Accommodation, AppEvent, LocationInfo, VisaInfo } from '@/lib/types';

// Helper function to build event dependencies
function buildEventDependencies(allEvents: any[], parentEventId: string): AppEvent[] {
  return allEvents
    .filter(event => event.parentEventId === parentEventId)
    .map(event => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      estimatedCost: event.estimatedCost,
      type: event.type as "travel" | "food" | "activity",
      location: event.location,
      dependencies: buildEventDependencies(allEvents, event.id),
    }));
}

// Helper function to convert database events to AppEvent format
function convertToAppEvents(dbEvents: any[]): AppEvent[] {
  // Filter main events (those without a parent)
  const mainEvents = dbEvents.filter(event => !event.parentEventId);
  
  return mainEvents.map(event => ({
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    estimatedCost: event.estimatedCost,
    type: event.type as "travel" | "food" | "activity",
    location: event.location,
    dependencies: buildEventDependencies(dbEvents, event.id),
  }));
}

// Get all travels
export async function getAllTravels(): Promise<Travel[]> {
  const dbTravels = await db.query.travels.findMany({
    with: {
      accommodations: true,
      events: {
        orderBy: (events, { asc }) => [asc(events.startDate)],
      },
    },
  });

  return dbTravels.map(travel => ({
    id: travel.id,
    name: travel.name,
    destination: travel.destination,
    startDate: travel.startDate,
    endDate: travel.endDate,
    accommodation: travel.accommodations.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type as Accommodation['type'],
      startDate: acc.startDate,
      endDate: acc.endDate,
      address: acc.address || undefined,
      rating: acc.rating || undefined,
      price: acc.price || undefined,
      currency: acc.currency || undefined,
    })),
    events: convertToAppEvents(travel.events),
    locationInfo: travel.locationInfo as LocationInfo,
    visaInfo: travel.visaInfo as VisaInfo,
  }));
}

// Get travel by ID
export async function getTravelById(id: string): Promise<Travel | null> {
  const travel = await db.query.travels.findFirst({
    where: eq(travels.id, id),
    with: {
      accommodations: true,
      events: {
        orderBy: (events, { asc }) => [asc(events.startDate)],
      },
    },
  });

  if (!travel) {
    return null;
  }

  return {
    id: travel.id,
    name: travel.name,
    destination: travel.destination,
    startDate: travel.startDate,
    endDate: travel.endDate,
    accommodation: travel.accommodations.map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.type as Accommodation['type'],
      startDate: acc.startDate,
      endDate: acc.endDate,
      address: acc.address || undefined,
      rating: acc.rating || undefined,
      price: acc.price || undefined,
      currency: acc.currency || undefined,
    })),
    events: convertToAppEvents(travel.events),
    locationInfo: travel.locationInfo as LocationInfo,
    visaInfo: travel.visaInfo as VisaInfo,
  };
}

// Get events for a specific travel
export async function getEventsByTravelId(travelId: string): Promise<AppEvent[]> {
  const dbEvents = await db.query.events.findMany({
    where: eq(events.travelId, travelId),
    orderBy: (events, { asc }) => [asc(events.startDate)],
  });

  return convertToAppEvents(dbEvents);
}

// Get accommodations for a specific travel
export async function getAccommodationsByTravelId(travelId: string): Promise<Accommodation[]> {
  const dbAccommodations = await db.query.accommodations.findMany({
    where: eq(accommodations.travelId, travelId),
    orderBy: (accommodations, { asc }) => [asc(accommodations.startDate)],
  });

  return dbAccommodations.map(acc => ({
    id: acc.id,
    name: acc.name,
    type: acc.type as Accommodation['type'],
    startDate: acc.startDate,
    endDate: acc.endDate,
    address: acc.address || undefined,
    rating: acc.rating || undefined,
    price: acc.price || undefined,
    currency: acc.currency || undefined,
  }));
}