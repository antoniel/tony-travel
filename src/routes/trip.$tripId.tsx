import Calendar from "@/components/Calendar";
import { TravelTimeline } from "@/components/TravelTimeline";
import TravelInfoSidebar from "@/components/TravelInfoSidebar";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

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
	const [viewMode, setViewMode] = useState<"calendar" | "timeline">("timeline");

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
			<div className="flex min-h-screen">
				{/* Travel Info Sidebar */}
				<div className="sticky top-0 h-screen overflow-y-auto">
					<TravelInfoSidebar travel={travel ?? undefined} />
				</div>

				{/* Main Content */}
				<div className="flex-1 py-6">
					<div className="mx-auto px-4">
						<div className="mb-6">
							<div className="flex items-center justify-end mb-4">
								<div className="flex items-center bg-card rounded-lg shadow-sm border border-border p-1">
									<button
										type="button"
										onClick={() => setViewMode("calendar")}
										className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
											viewMode === "calendar"
												? "bg-primary text-primary-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground hover:bg-muted"
										}`}
									>
										<CalendarIcon className="w-4 h-4" />
										Calendário
									</button>
									<button
										type="button"
										onClick={() => setViewMode("timeline")}
										className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
											viewMode === "timeline"
												? "bg-primary text-primary-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground hover:bg-muted"
										}`}
									>
										<Clock className="w-4 h-4" />
										Timeline
									</button>
								</div>
							</div>
						</div>

						{viewMode === "calendar" ? (
							<Calendar
								events={events}
								onAddEvent={handleAddEvent}
								onUpdateEvent={handleUpdateEvent}
							/>
						) : (
							travel && <TravelTimeline travel={travel} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
