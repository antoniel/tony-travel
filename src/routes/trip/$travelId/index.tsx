import Calendar from "@/components/Calendar";
import { TravelTimeline } from "@/components/TravelTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/trip/$travelId/")({
	component: ItineraryPage,
});

function ItineraryPage() {
	const { travelId } = Route.useParams();

	const travelQuery = useQuery(
		orpc.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;
	const isLoading = travelQuery.isLoading;

	const [events, setEvents] = useState<AppEvent[]>([]);

	useEffect(() => {
		if (travel?.events) {
			setEvents(travel.events);
		}
	}, [travel?.events]);

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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	if (!travel) {
		return (
			<div className="text-center py-12">
				<CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
				<h3 className="text-lg font-medium mb-2">Viagem não encontrada</h3>
				<p className="text-muted-foreground">
					A viagem que você está procurando não existe ou foi removida.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<Tabs defaultValue="timeline" className="w-full">
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-8">
					<TabsList className="grid w-full sm:w-auto grid-cols-2 sm:flex">
						<TabsTrigger
							value="timeline"
							className="flex items-center gap-2 px-6 py-3"
						>
							<Clock className="w-4 h-4" />
							<span>Timeline</span>
						</TabsTrigger>
						<TabsTrigger
							value="calendar"
							className="flex items-center gap-2 px-6 py-3"
						>
							<CalendarIcon className="w-4 h-4" />
							<span>Calendário</span>
						</TabsTrigger>
					</TabsList>

					{/* Quick stats */}
					<div className="flex flex-wrap gap-4 text-sm">
						<div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
							<Clock className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">
								{travel.events?.length || 0} eventos
							</span>
						</div>
						<div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
							<Users className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">
								{travel.accommodations?.length || 0} acomodações
							</span>
						</div>
					</div>
				</div>

				<TabsContent value="timeline" className="mt-0">
					<div className="">
						<TravelTimeline travel={travel} />
					</div>
				</TabsContent>

				<TabsContent value="calendar" className="mt-0">
					<div className="">
						<Calendar
							travelId={travel.id}
							events={events}
							accommodations={travel.accommodations || []}
							onUpdateEvent={handleUpdateEvent}
						/>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
