import Calendar from "@/components/Calendar";
import { EventCreateModal } from "@/components/EventCreateModal";
import { TravelTimeline } from "@/components/TravelTimeline";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/trip/$travelId/")({
	component: ItineraryPage,
});

function ItineraryPage() {
	const { travelId } = Route.useParams();

	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;
	const isLoading = travelQuery.isLoading;

	const [events, setEvents] = useState<AppEvent[]>([]);
	const queryClient = useQueryClient();
	const createEventMutation = useMutation(
		orpc.eventRoutes.createEvent.mutationOptions(),
	);

	// Add Event modal state (mobile header action)
	const [isAddEventOpen, setIsAddEventOpen] = useState(false);
	const defaultEvent = useMemo(() => {
		const now = new Date();
		let start = now;
		if (travel?.startDate && travel?.endDate) {
			if (now < travel.startDate || now > travel.endDate) {
				start = new Date(travel.startDate);
			}
		}
		if (start.getHours() === 0 && start.getMinutes() === 0) {
			start.setHours(9, 0);
		}
		const end = new Date(start);
		end.setHours(start.getHours() + 1);
		return {
			title: "",
			startDate: start,
			endDate: end,
			type: "activity" as AppEvent["type"],
			location: "",
			cost: null as number | null,
		};
	}, [travel?.startDate, travel?.endDate]);
	const [newEvent, setNewEvent] = useState(defaultEvent);

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

	const canWrite = !!travel?.userMembership;

	return (
		<div className="space-y-8 overflow-x-hidden">
			<Tabs defaultValue="timeline" className="w-full">
				<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
					<TabsList className="grid w-full sm:w-auto grid-cols-2 sm:flex">
						<TabsTrigger
							value="timeline"
							className="flex items-center gap-2 px-6 "
						>
							<Clock className="w-4 h-4" />
							<span>Timeline</span>
						</TabsTrigger>
						<TabsTrigger
							value="calendar"
							className="flex items-center gap-2 px-6 "
						>
							<CalendarIcon className="w-4 h-4" />
							<span>Calendário</span>
						</TabsTrigger>
					</TabsList>

					{/* Quick stats + mobile add action */}
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
							<Clock className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium">
								{travel.events?.length || 0} eventos
							</span>
						</div>
						{canWrite ? (
							<Button
								variant="secondary"
								size="sm"
								className="h-8 gap-2 sm:hidden"
								onClick={() => {
									setNewEvent(defaultEvent);
									setIsAddEventOpen(true);
								}}
								title="Adicionar evento"
							>
								<Plus className="w-4 h-4" /> Adicionar
							</Button>
						) : null}
					</div>
				</div>

				<TabsContent value="timeline" className="mt-0">
					<div className="">
						<TravelTimeline travel={travel} canWrite={canWrite} />
					</div>
				</TabsContent>

				<TabsContent value="calendar" className="mt-0">
					<div className="">
						<Calendar
							travelId={travel.id}
							events={events}
							accommodations={travel.accommodations || []}
							travelStartDate={new Date(travel.startDate)}
							travelEndDate={new Date(travel.endDate)}
							onUpdateEvent={handleUpdateEvent}
							canWrite={canWrite}
						/>
					</div>
				</TabsContent>
			</Tabs>

			{/* Event Create Modal (mobile/action in header) */}
			{canWrite ? (
				<EventCreateModal
					isOpen={isAddEventOpen}
					newEvent={newEvent}
					onClose={() => setIsAddEventOpen(false)}
					onCreate={async () => {
						if (!newEvent.title.trim()) return;
						await createEventMutation.mutateAsync({
							...newEvent,
							travelId: travel.id,
						});
						// Reset state and close
						setNewEvent(defaultEvent);
						setIsAddEventOpen(false);
						// Refresh travel data
						queryClient.invalidateQueries(
							orpc.travelRoutes.getTravel.queryOptions({
								input: { id: travelId },
							}),
						);
					}}
					onEventChange={setNewEvent}
					travelStartDate={travel.startDate}
					travelEndDate={travel.endDate}
				/>
			) : null}
		</div>
	);
}
