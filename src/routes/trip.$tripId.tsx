import Calendar from "@/components/Calendar";
import TravelInfoSidebar from "@/components/TravelInfoSidebar";
import { colombiaTravel } from "@/data/colombia-travel";
import { peruTravel } from "@/data/peru-travel";
import type { AppEvent, Travel } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/trip/$tripId")({
	component: TripCalendarPage,
});

function TripCalendarPage() {
	const { tripId } = Route.useParams();

	// Mock data - in the future this will be fetched from DB based on tripId
	const travel = useMemo(() => {
		// Mock travel data lookup
		const travels: Record<string, Travel> = {
			[peruTravel.id]: peruTravel,
			[colombiaTravel.id]: colombiaTravel,
		};

		return travels[tripId] || peruTravel; // Fallback to Peru if not found
	}, [tripId]);

	const [events, setEvents] = useState<AppEvent[]>(travel.events);

	const handleAddEvent = (newEvent: Omit<AppEvent, "id">) => {
		const eventWithId: AppEvent = {
			...newEvent,
			id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
		};
		setEvents((prevEvents) => [...prevEvents, eventWithId]);
	};

	const handleUpdateEvent = (
		eventId: string,
		updatedEvent: Partial<AppEvent>,
	) => {
		setEvents((prevEvents) =>
			prevEvents.map((event) =>
				event.id === eventId ? { ...event, ...updatedEvent } : event,
			),
		);
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="flex h-screen">
				{/* Travel Info Sidebar */}
				<TravelInfoSidebar travel={travel} />

				{/* Main Content */}
				<div className="flex-1 py-6">
					<div className="max-w-6xl mx-auto px-4 h-full">
						<div className="mb-4">
							<h1 className="text-3xl font-bold text-foreground mb-2">
								{travel.name}
							</h1>
							<p className="text-muted-foreground">
								Gerencie seu itinerário de viagem
							</p>
						</div>

						<Calendar
							events={events}
							onAddEvent={handleAddEvent}
							onUpdateEvent={handleUpdateEvent}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
