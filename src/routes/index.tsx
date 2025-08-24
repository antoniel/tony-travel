import Calendar from "@/components/Calendar";
import TravelInfoSidebar from "@/components/TravelInfoSidebar";
import { colombiaEvents } from "@/data/colombia";
import { peruTravel } from "@/data/peru-travel";
import type { AppEvent } from "@/lib/types";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
	component: CalendarPage,
});

function CalendarPage() {
	const [events, setEvents] = useState<AppEvent[]>(colombiaEvents);

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
				<TravelInfoSidebar travel={peruTravel} />

				{/* Main Content */}
				<div className="flex-1 py-6">
					<div className="max-w-6xl mx-auto px-4 h-full">
						<div className="mb-4">
							<h1 className="text-3xl font-bold text-foreground mb-2">
								Trip Calendar
							</h1>
							<p className="text-muted-foreground">
								Plan and manage your travel itinerary
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
