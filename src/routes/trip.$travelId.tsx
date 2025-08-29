import Calendar from "@/components/Calendar";
import TravelInfoSidebar from "@/components/TravelInfoSidebar";
import { TravelTimeline } from "@/components/TravelTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InsertAppEvent } from "@/lib/db/schema";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/trip/$travelId")({
	component: TripCalendarPage,
});

function TripCalendarPage() {
	const { travelId } = Route.useParams();

	const travelQuery = useQuery(
		orpc.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;

	const createEventMutation = useMutation(orpc.createEvent.mutationOptions());

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

	const handleAddEvent = (newEvent: InsertAppEvent) => {
		createEventMutation.mutate(newEvent);
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
						<Tabs defaultValue="timeline" className="w-full">
							<div className="flex justify-between items-center mb-6">
								<TabsList>
									<TabsTrigger value="timeline">
										<Clock className="w-4 h-4" />
										Timeline
									</TabsTrigger>
									<TabsTrigger value="calendar">
										<CalendarIcon className="w-4 h-4" />
										Calendário
									</TabsTrigger>
								</TabsList>
							</div>

							<TabsContent value="timeline">
								{travel && <TravelTimeline travel={travel} />}
							</TabsContent>
							<TabsContent value="calendar">
								<Calendar
									travelId={travel?.id ?? ""}
									events={events}
									accommodations={travel?.accommodations || []}
									onAddEvent={handleAddEvent}
									onUpdateEvent={handleUpdateEvent}
								/>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</div>
		</div>
	);
}
