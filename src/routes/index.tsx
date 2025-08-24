import Calendar, { type AppEvent } from "@/components/Calendar";
import { colombiaEvents } from "@/data/colombia";
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
		<div className="min-h-screen bg-background py-6">
			<div className="max-w-7xl mx-auto px-4">
				<div className="mb-4">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Trip Calendar
					</h1>
				</div>

				<Calendar
					events={events}
					onAddEvent={handleAddEvent}
					onUpdateEvent={handleUpdateEvent}
				/>
			</div>
		</div>
	);
}
