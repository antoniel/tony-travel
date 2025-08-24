import Calendar from "@/components/Calendar";
import TravelInfoSidebar from "@/components/TravelInfoSidebar";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/trip/$tripId")({
	component: TripCalendarPage,
});

function TripCalendarPage() {
	const { tripId } = Route.useParams();

	const travelQuery = useQuery(
		orpc.getTravel.queryOptions({ input: { id: tripId } }),
	);
	const travel = travelQuery.data;

	const [events, setEvents] = useState<AppEvent[]>([]);

	useEffect(() => {
		const eventsWithDependencies = travel?.events.reduce<AppEvent[]>(
			(acc, event) => {
				const mainEvent = { ...event };
				const dependencies: AppEvent[] = event.dependencies || [];
				return acc.concat([mainEvent, ...dependencies]);
			},
			[],
		);
		setEvents(eventsWithDependencies ?? []);
	}, [travel?.events]);

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
				<TravelInfoSidebar travel={travel ?? undefined} />

				{/* Main Content */}
				<div className="flex-1 py-6">
					<div className=" mx-auto px-4 h-full">
						<div className="mb-4">
							<h1 className="text-3xl font-bold text-foreground mb-2">
								{travel?.name}
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
