import Calendar from "@/components/Calendar";
import TravelInfoSidebar from "@/components/TravelInfoSidebar";
import { TravelTimeline } from "@/components/TravelTimeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, Download } from "lucide-react";
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
								<div className="flex items-center gap-2">
									{travel && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => {
												if (!travel) return;
												const itinerary = [
													`${travel.name}`,
													`${travel.destination} • ${travel.startDate.toLocaleDateString("pt-BR")} - ${travel.endDate.toLocaleDateString("pt-BR")}`,
													"",
													"ACOMODAÇÕES:",
													...travel.accommodation.map(
														(acc) =>
															`• ${acc.name} (${acc.startDate.toLocaleDateString("pt-BR")} - ${acc.endDate.toLocaleDateString("pt-BR")})`,
													),
													"",
													"EVENTOS:",
													...travel.events
														.slice(0, 10)
														.map(
															(event) =>
																`• ${event.startDate.toLocaleDateString("pt-BR")} ${event.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${event.title}`,
														),
													...(travel.events.length > 10
														? ["  ... e mais eventos"]
														: []),
												].join("\n");
												const blob = new Blob([itinerary], {
													type: "text/plain",
												});
												const url = URL.createObjectURL(blob);
												const a = document.createElement("a");
												a.href = url;
												a.download = `${travel.name.replace(/\s+/g, "_")}_itinerario.txt`;
												document.body.appendChild(a);
												a.click();
												document.body.removeChild(a);
												URL.revokeObjectURL(url);
											}}
											title="Exportar itinerário completo"
											className="h-8 w-8 p-0"
										>
											<Download className="h-4 w-4" />
										</Button>
									)}
								</div>
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
									events={events}
									accommodations={travel?.accommodation || []}
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
