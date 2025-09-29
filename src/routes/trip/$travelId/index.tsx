import { EventCreateModal } from "@/components/EventCreateModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import ItineraryCalendar from "@/routes/trip/$travelId/-components/itinerary-calendar";
import { ItineraryTimeline } from "@/routes/trip/$travelId/-components/itinerary-timeline";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, Clock, Plus } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/trip/$travelId/")({
	component: () => (
		<Suspense fallback={<ItineraryPageSkeleton />}>
			<ItineraryPage />
		</Suspense>
	),
});

function ItineraryPage() {
	const { travelId } = Route.useParams();
	const { data: travel } = useSuspenseQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);

	const [events, setEvents] = useState<AppEvent[]>([]);
	const queryClient = useQueryClient();
	const createEventMutation = useMutation({
		...orpc.eventRoutes.createEvent.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.eventRoutes.getEventsByTravel.queryOptions({
					input: { travelId },
				}),
			);
			queryClient.invalidateQueries(
				orpc.travelRoutes.getTravel.queryOptions({
					input: { id: travelId },
				}),
			);
			queryClient.invalidateQueries(
				orpc.conciergeRoutes.getPendingIssues.queryOptions({
					input: { travelId },
				}),
			);
		},
	});

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
			description: "",
			link: "",
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
		<>
			<div className="space-y-8 overflow-x-hidden">
				<Tabs defaultValue="timeline" className="w-full">
					<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
						<TabsList className="grid w-full sm:w-auto grid-cols-2 sm:flex">
							<TabsTrigger
								value="timeline"
								className="flex items-center gap-2 px-6 "
							>
								<Clock className="w-4 h-4" />
								<span>Cronograma</span>
							</TabsTrigger>
							<TabsTrigger
								value="calendar"
								className="flex items-center gap-2 px-6 "
							>
								<CalendarIcon className="w-4 h-4" />
								<span>Calendário</span>
							</TabsTrigger>
						</TabsList>

						{/* Quick stats + add action (mobile + desktop) */}
						<div className="flex flex-wrap items-center gap-3 text-sm">
							<div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
								<Clock className="w-4 h-4 text-muted-foreground" />
								<span className="font-medium">
									{travel.events?.length || 0} eventos
								</span>
							</div>
							{canWrite ? (
								<>
									{/* Mobile add button */}
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

									{/* Desktop add button aligned with stats */}
									<Button
										variant="default"
										size="sm"
										className="h-8 gap-2 hidden sm:inline-flex"
										onClick={() => {
											setNewEvent(defaultEvent);
											setIsAddEventOpen(true);
										}}
										title="Adicionar evento"
									>
										<Plus className="w-4 h-4" /> Adicionar Evento
									</Button>
								</>
							) : null}
						</div>
					</div>

					<TabsContent value="timeline" className="mt-0">
						<div className="">
							<ItineraryTimeline travel={travel} canWrite={canWrite} />
						</div>
					</TabsContent>

					<TabsContent value="calendar" className="mt-0">
						<ItineraryCalendar
							travelId={travel.id}
							events={events}
							accommodations={travel.accommodations || []}
							travelStartDate={new Date(travel.startDate)}
							travelEndDate={new Date(travel.endDate)}
							onUpdateEvent={handleUpdateEvent}
							canWrite={canWrite}
						/>
					</TabsContent>
				</Tabs>
			</div>
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
		</>
	);
}

function ItineraryPageSkeleton() {
	return (
		<div className="space-y-8 overflow-x-hidden">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
				<div className="space-y-3">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
				<div className="flex flex-wrap items-center gap-3 text-sm">
					<Skeleton className="h-8 w-32 rounded-full" />
					<Skeleton className="h-8 w-28 rounded-full" />
					<Skeleton className="h-8 w-36 rounded-md" />
				</div>
			</div>
			<div className="flex flex-col sm:flex-row sm:items-center gap-4">
				<div className="grid w-full sm:w-auto grid-cols-2 sm:flex gap-2">
					<Skeleton className="h-10 w-full sm:w-40 rounded-md" />
					<Skeleton className="h-10 w-full sm:w-40 rounded-md" />
				</div>
				<div className="hidden sm:flex items-center gap-2">
					<Skeleton className="h-8 w-24 rounded-md" />
					<Skeleton className="h-8 w-28 rounded-md" />
				</div>
			</div>
			<div className="space-y-8">
				<div className="border rounded-xl p-6 space-y-6">
					<div className="flex items-center justify-between">
						<Skeleton className="h-6 w-40" />
						<Skeleton className="h-8 w-24 rounded-md" />
					</div>
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, index) => (
							<div
								key={`skeleton-${
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									index
								}`}
								className="flex gap-4"
							>
								<Skeleton className="h-12 w-12 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-2/3" />
									<Skeleton className="h-4 w-1/2" />
								</div>
							</div>
						))}
					</div>
				</div>
				<div className="border rounded-xl p-6 space-y-6">
					<div className="flex items-center justify-between">
						<Skeleton className="h-6 w-48" />
						<Skeleton className="h-8 w-24 rounded-md" />
					</div>
					<div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 8 }).map((_, index) => (
							<Skeleton
								key={`skeleton-${
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									index
								}`}
								className="h-24 rounded-lg"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
