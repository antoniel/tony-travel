import type { InsertAppEvent } from "@/lib/db/schema";
import type { Accommodation, AppEvent, TravelWithRelations } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, format, isSameDay } from "date-fns";
import {
	Calendar,
	Camera,
	Hotel,
	MapPin,
	Pencil,
	Plane,
	Plus,
	UtensilsCrossed,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EventCreateModal } from "../../../../components/EventCreateModal";
import { EventEditModal } from "../../../../components/EventEditModal";
import { EventDetailsModal } from "./event-details-modal";
import { FlightDetailsModal } from "./flight-event-block";
import {
	type FlightSegmentEvent,
	consolidateFlightSegments,
} from "./flight-segments.utils";

interface TravelTimelineProps {
	travel: TravelWithRelations;
	canWrite?: boolean;
}

type TimelineItem = {
	id: string;
	type: "accommodation" | "event" | "travel-start" | "travel-end" | "flight";
	date: Date;
	data: AppEvent | Accommodation | FlightSegmentEvent | null;
	title: string;
	description: string;
	location?: string;
	cost?: number;
	icon: React.ComponentType<{ className?: string }>;
};

export function ItineraryTimeline({ travel, canWrite }: TravelTimelineProps) {
	// Fetch flight data for this travel
	const { data: flights = [] } = useQuery(
		orpc.flightRoutes.getFlightsByTravel.queryOptions({
			input: { travelId: travel.id },
		}),
	);

	// Convert flights to timeline events
	const flightEvents = useMemo(() => {
		const allFlights = flights.flatMap((group) => group.flights);
		return consolidateFlightSegments(allFlights);
	}, [flights]);

	const timelineItems = createTimelineItems(travel, flightEvents);
	const groupedByDay = groupItemsByDay(timelineItems);

	const queryClient = useQueryClient();
	const createEventMutation = useMutation({
		...orpc.eventRoutes.createEvent.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.eventRoutes.getEventsByTravel.queryOptions({
					input: { travelId: travel.id },
				}),
			);
			queryClient.invalidateQueries(
				orpc.travelRoutes.getTravel.queryOptions({
					input: { id: travel.id },
				}),
			);
			queryClient.invalidateQueries(
				orpc.conciergeRoutes.getPendingIssues.queryOptions({
					input: { travelId: travel.id },
				}),
			);
		},
	});
	const updateEventMutation = useMutation(
		orpc.eventRoutes.updateEvent.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(
					orpc.travelRoutes.getTravel.queryOptions({
						input: { id: travel.id },
					}),
				);
				queryClient.invalidateQueries(
					orpc.eventRoutes.getEventsByTravel.queryOptions({
						input: { travelId: travel.id },
					}),
				);
				queryClient.invalidateQueries(
					orpc.conciergeRoutes.getPendingIssues.queryOptions({
						input: { travelId: travel.id },
					}),
				);
			},
		}),
	);

	const onAddEvent = (newEvent: InsertAppEvent) => {
		createEventMutation.mutate(newEvent);
	};

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newEvent, setNewEvent] = useState({
		title: "",
		startDate: new Date(),
		endDate: new Date(),
		type: "activity" as AppEvent["type"],
		location: "",
		cost: null as number | null,
		description: "",
		link: "",
	});

	// Edit modal state
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);

	// Details modal state (same responsive modal used by Calendar)
	const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	// Flight details modal state
	const [selectedFlightEvent, setSelectedFlightEvent] =
		useState<FlightSegmentEvent | null>(null);
	const [isFlightDetailsOpen, setIsFlightDetailsOpen] = useState(false);

	// Removed unused openGeneralAdd helper to satisfy strict TS

	const handleCreateEvent = () => {
		if (!canWrite || !newEvent.title.trim()) return;

		onAddEvent({
			...newEvent,
			cost: newEvent.cost ?? undefined,
			description: newEvent.description || undefined,
			link: newEvent.link || undefined,
			travelId: travel.id,
		});

		setNewEvent({
			title: "",
			startDate: new Date(),
			endDate: new Date(),
			type: "activity",
			location: "",
			cost: null,
			description: "",
			link: "",
		});

		setIsModalOpen(false);
	};

	const handleEditEvent = (event: AppEvent) => {
		setEditingEvent(event);
		setIsEditModalOpen(true);
		setIsDetailsOpen(false);
	};

	const handleEventClick = (event: AppEvent) => {
		setSelectedEvent(event);
		setIsDetailsOpen(true);
	};

	const handleFlightEventClick = (flightEvent: FlightSegmentEvent) => {
		setSelectedFlightEvent(flightEvent);
		setIsFlightDetailsOpen(true);
	};

	const handleCloseDetails = () => {
		setIsDetailsOpen(false);
		setSelectedEvent(null);
	};

	const handleCloseFlightDetails = () => {
		setIsFlightDetailsOpen(false);
		setSelectedFlightEvent(null);
	};

	const handleSaveEvent = (changes: Partial<AppEvent>) => {
		if (!editingEvent) return;

		updateEventMutation.mutate({
			travelId: travel.id,
			id: editingEvent.id,
			event: changes,
		});

		setIsEditModalOpen(false);
		setEditingEvent(null);
	};

	return (
		<>
			<div className=" space-y-8">
				<div className="relative">
					<div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-chart-3 opacity-30" />

					{groupedByDay.map(({ date, items }) => (
						<DaySection
							key={date}
							date={date}
							items={items}
							onAddEvent={(selectedDate) => {
								const dateObj = new Date(selectedDate);
								// Set a default time if none is set (e.g., 9:00 AM)
								if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
									dateObj.setHours(9, 0);
								}
								const endDate = new Date(dateObj);
								endDate.setHours(dateObj.getHours() + 1);

								setNewEvent({
									title: "",
									startDate: dateObj,
									endDate,
									type: "activity",
									location: "",
									cost: null,
									description: "",
									link: "",
								});
								setIsModalOpen(true);
							}}
							onEditEvent={handleEditEvent}
							onEventClick={handleEventClick}
							onFlightEventClick={handleFlightEventClick}
							canWrite={canWrite}
						/>
					))}
				</div>
			</div>

			{/* Details modal for viewing timeline items (events) */}
			<EventDetailsModal
				event={selectedEvent}
				isOpen={Boolean(selectedEvent) && isDetailsOpen}
				onClose={handleCloseDetails}
				onEditEvent={canWrite ? handleEditEvent : undefined}
				canWrite={canWrite}
			/>

			{/* Flight details modal */}
			<FlightDetailsModal
				flightEvent={selectedFlightEvent}
				isOpen={isFlightDetailsOpen}
				onClose={handleCloseFlightDetails}
				travelId={travel.id}
			/>

			{canWrite ? (
				<>
					<EventCreateModal
						isOpen={isModalOpen}
						newEvent={newEvent}
						onClose={() => setIsModalOpen(false)}
						onCreate={handleCreateEvent}
						onEventChange={setNewEvent}
						travelStartDate={travel.startDate}
						travelEndDate={travel.endDate}
					/>
					<EventEditModal
						isOpen={isEditModalOpen}
						event={editingEvent}
						onClose={() => {
							setIsEditModalOpen(false);
							setEditingEvent(null);
						}}
						onSave={handleSaveEvent}
						travelStartDate={travel.startDate}
						travelEndDate={travel.endDate}
					/>
				</>
			) : null}
		</>
	);
}

function DaySection({
	date,
	items,
	onAddEvent,
	onEditEvent,
	onEventClick,
	onFlightEventClick,
	canWrite,
}: {
	date: string;
	items: TimelineItem[];
	onAddEvent?: (date: string) => void;
	onEditEvent?: (event: AppEvent) => void;
	onEventClick?: (event: AppEvent) => void;
	onFlightEventClick?: (flightEvent: FlightSegmentEvent) => void;
	canWrite?: boolean;
}) {
	const formatDayUTC = (d: Date) =>
		new Date(d).toLocaleDateString("pt-BR", {
			weekday: "long",
			day: "numeric",
			month: "long",
			timeZone: "UTC",
		});
	const handleAddEvent = () => {
		if (canWrite && onAddEvent) {
			onAddEvent(date);
		}
	};

	return (
		<div className="mb-12">
			<div className="sticky top-0 z-20 bg-background/35 backdrop-blur-sm border-b border-border/40 mb-6 pl-20 py-4 -mx-2 px-2 sm:-mx-4 sm:px-4">
				<div className="flex items-center gap-4">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-1">
							{formatDayUTC(new Date(date))}
						</h2>
						<div className="w-12 h-0.5 bg-primary rounded-full" />
					</div>
					{canWrite ? (
						<button
							type="button"
							onClick={handleAddEvent}
							className="flex items-center justify-center w-4 h-7 pb-1 rounded-full cursor-pointer text-black"
							title="Adicionar evento"
						>
							<Plus className="w-4 h-4" />
						</button>
					) : null}
				</div>
			</div>
			{items.map((item, index) => (
				<TimelineItemComponent
					key={item.id}
					item={item}
					index={index}
					isLast={index === items.length - 1}
					onEditEvent={onEditEvent}
					onEventClick={onEventClick}
					onFlightEventClick={onFlightEventClick}
					canWrite={canWrite}
				/>
			))}
		</div>
	);
}

function TimelineItemComponent({
	item,
	onEditEvent,
	onEventClick,
	onFlightEventClick,
	canWrite,
}: {
	item: TimelineItem;
	index: number;
	isLast: boolean;
	onEditEvent?: (event: AppEvent) => void;
	onEventClick?: (event: AppEvent) => void;
	onFlightEventClick?: (flightEvent: FlightSegmentEvent) => void;
	canWrite?: boolean;
}) {
	const Icon = item.icon;
	const iconColor = getEventColor(item.type);

	return (
		<div className="relative flex items-center gap-6 pb-8">
			<div className="relative z-10 flex-shrink-0">
				<div
					className={`w-16 h-16 rounded-full border-2 shadow-sm flex items-center justify-center ${iconColor}`}
				>
					<Icon className="w-6 h-6" />
				</div>
			</div>

			<div className="flex-1 min-w-0 pt-2">
				<div
					className="travel-card rounded-lg p-6 hover:shadow-md transition-all duration-300 group cursor-pointer"
					role={
						item.type === "event" || item.type === "flight"
							? "button"
							: undefined
					}
					tabIndex={item.type === "event" || item.type === "flight" ? 0 : -1}
					onClick={() => {
						if (item.type === "event" && item.data) {
							onEventClick?.(item.data as AppEvent);
						} else if (item.type === "flight" && item.data) {
							onFlightEventClick?.(item.data as FlightSegmentEvent);
						}
					}}
					onKeyDown={(e) => {
						if (
							(item.type === "event" || item.type === "flight") &&
							item.data &&
							(e.key === "Enter" || e.key === " ")
						) {
							e.preventDefault();
							if (item.type === "event") {
								onEventClick?.(item.data as AppEvent);
							} else if (item.type === "flight") {
								onFlightEventClick?.(item.data as FlightSegmentEvent);
							}
						}
					}}
				>
					<div className="flex items-start justify-between mb-3">
						<div>
							<h3 className="text-lg font-semibold text-foreground mb-1">
								{item.title}
							</h3>
							<p className="text-sm text-muted-foreground">
								{item.type === "event" && item.data
									? `${format(item.date, "HH:mm")} - ${format((item.data as AppEvent).endDate, "HH:mm")}`
									: item.type === "flight" && item.data
										? `${format(item.date, "HH:mm")} - ${format((item.data as FlightSegmentEvent).endDate, "HH:mm")}`
										: format(item.date, "HH:mm")}
							</p>
						</div>
						<div className="flex items-center gap-2">
							{!!item.cost && (
								<div className="bg-chart-3/10 text-chart-3 px-3 py-1 rounded-full text-sm font-medium">
									R$ {item.cost.toLocaleString()}
								</div>
							)}
							{canWrite && item.type === "event" && item.data && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onEditEvent?.(item.data as AppEvent);
									}}
									className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full hover:bg-accent/20 text-muted-foreground hover:text-foreground"
									title="Editar evento"
								>
									<Pencil className="w-4 h-4" />
								</button>
							)}
						</div>
					</div>

					<p className="text-foreground/80 mb-3 leading-relaxed">
						{item.description}
					</p>

					{item.location && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<MapPin className="w-4 h-4" />
							<span>{item.location}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function groupItemsByDay(
	items: TimelineItem[],
): { date: string; items: TimelineItem[] }[] {
	const groups = new Map<string, TimelineItem[]>();

	for (const item of items) {
		const y = item.date.getUTCFullYear();
		const m = String(item.date.getUTCMonth() + 1).padStart(2, "0");
		const d = String(item.date.getUTCDate()).padStart(2, "0");
		const dayKey = `${y}-${m}-${d}`;
		if (!groups.has(dayKey)) {
			groups.set(dayKey, []);
		}
		groups.get(dayKey)?.push(item);
	}

	return Array.from(groups.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, items]) => ({
			date,
			items: items.sort((a, b) => a.date.getTime() - b.date.getTime()),
		}));
}

function getEventColor(type: TimelineItem["type"]): string {
	switch (type) {
		case "travel-start":
		case "travel-end":
			return "text-white border-chart-1/20 bg-chart-1";
		case "accommodation":
			return "text-white border-chart-4/20 bg-chart-4";
		case "event":
			return "text-white border-accent/20 bg-accent";
		case "flight":
			return "text-white border-chart-5/20 bg-chart-5";
		default:
			return "text-white border-primary/20 bg-primary";
	}
}

function createTimelineItems(
	travel: TravelWithRelations,
	flightEvents: FlightSegmentEvent[] = [],
): TimelineItem[] {
	const items: TimelineItem[] = [];

	const utcDaysInclusive = (start: Date, end: Date) => {
		const s = Date.UTC(
			start.getUTCFullYear(),
			start.getUTCMonth(),
			start.getUTCDate(),
		);
		const e = Date.UTC(
			end.getUTCFullYear(),
			end.getUTCMonth(),
			end.getUTCDate(),
		);
		return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
	};

	// If travel start has no specific time (00:00), set default morning time (06:00)
	const travelStartDate = new Date(travel.startDate);
	if (
		travelStartDate.getUTCHours() === 0 &&
		travelStartDate.getUTCMinutes() === 0
	) {
		travelStartDate.setUTCHours(6, 0, 0, 0);
	}

	items.push({
		id: "travel-start",
		type: "travel-start",
		date: travelStartDate,
		data: null,
		title: "Início da Viagem",
		description: `Sua aventura para ${travel.destination} começa! Prepare-se para uma experiência incrível de ${utcDaysInclusive(travel.startDate, travel.endDate)} dias.`,
		icon: Plane,
	});

	for (const acc of travel.accommodations) {
		// If accommodation check-in has no specific time (00:00), set default check-in time (21:00)
		const checkInDate = new Date(acc.startDate);
		if (checkInDate.getUTCHours() === 0 && checkInDate.getUTCMinutes() === 0) {
			checkInDate.setUTCHours(21, 0, 0, 0);
		}

		items.push({
			id: acc.id,
			type: "accommodation",
			date: checkInDate,
			data: acc,
			title: `Check-in: ${acc.name}`,
			description: `Hospedagem em ${acc.type}. ${acc.address ? `Localizado em ${acc.address}.` : ""} Sua estadia vai até ${new Date(acc.endDate).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" })}.`,
			location: acc.address ?? undefined,
			cost: acc.price ?? undefined,
			icon: Hotel,
		});
	}

	for (const event of travel.events) {
		const icon = getEventIcon(event.type);
		const description = getEventDescription(event);

		// If event has no specific time (00:00), set default activity time based on type
		const eventDate = new Date(event.startDate);
		if (eventDate.getUTCHours() === 0 && eventDate.getUTCMinutes() === 0) {
			switch (event.type) {
				case "food":
					eventDate.setUTCHours(12, 0, 0, 0); // Default lunch time
					break;
				case "travel":
					eventDate.setUTCHours(14, 0, 0, 0); // Default afternoon travel time
					break;
				case "activity":
					eventDate.setUTCHours(10, 0, 0, 0); // Default morning activity time
					break;
			}
		}

		items.push({
			id: event.id,
			type: "event",
			date: eventDate,
			data: event,
			title: event.title,
			description,
			location: event.location ?? undefined,
			cost: event.cost ?? event.estimatedCost ?? undefined,
			icon,
		});
	}

	// Add flight events to timeline
	for (const flightEvent of flightEvents) {
		const description = flightEvent.metadata.isConsolidated
			? `Voo de ${flightEvent.originAirport} para ${flightEvent.destinationAirport} com ${flightEvent.metadata.originalSegments.length} conexões. ${flightEvent.flightNumber ? `Voo ${flightEvent.flightNumber}.` : ""} ${flightEvent.participants.length > 0 ? `Passageiros: ${flightEvent.participants.map((p) => p.user.name).join(", ")}.` : ""}`
			: `Voo direto de ${flightEvent.originAirport} para ${flightEvent.destinationAirport}. ${flightEvent.flightNumber ? `Voo ${flightEvent.flightNumber}.` : ""} ${flightEvent.participants.length > 0 ? `Passageiros: ${flightEvent.participants.map((p) => p.user.name).join(", ")}.` : ""}`;

		items.push({
			id: flightEvent.id,
			type: "flight",
			date: flightEvent.startDate,
			data: flightEvent,
			title: flightEvent.title,
			description,
			location: `${flightEvent.originAirport} → ${flightEvent.destinationAirport}`,
			icon: Plane,
		});
	}

	// If travel end has no specific time (00:00), set default evening time (22:00)
	const travelEndDate = new Date(travel.endDate);
	if (
		travelEndDate.getUTCHours() === 0 &&
		travelEndDate.getUTCMinutes() === 0
	) {
		travelEndDate.setUTCHours(22, 0, 0, 0);
	}

	items.push({
		id: "travel-end",
		type: "travel-end",
		date: travelEndDate,
		data: null,
		title: "Fim da Viagem",
		description: `Chegou ao fim sua incrível jornada por ${travel.destination}. Leve consigo todas as memórias e experiências vividas!`,
		icon: Plane,
	});

	return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getEventIcon(
	type: AppEvent["type"],
): React.ComponentType<{ className?: string }> {
	switch (type) {
		case "travel":
			return Plane;
		case "food":
			return UtensilsCrossed;
		case "activity":
			return Camera;
		default:
			return Calendar;
	}
}

function getEventDescription(event: AppEvent): string {
	// If the event has a custom description, use it
	if (event.description) {
		return event.description;
	}

	// Otherwise, generate a default description
	const duration = differenceInDays(event.endDate, event.startDate);
	const timeInfo = isSameDay(event.startDate, event.endDate)
		? `às ${format(event.startDate, "HH:mm")}`
		: `por ${duration + 1} dias`;

	switch (event.type) {
		case "travel":
			return `Momento de se deslocar! ${event.location ? `Destino: ${event.location}. ` : ""}Esta atividade está programada ${timeInfo}.`;
		case "food":
			return `Hora de saborear a gastronomia local! ${event.location ? `Em ${event.location}. ` : ""}Experiência gastronômica programada ${timeInfo}.`;
		case "activity":
			return `Uma atividade imperdível te espera! ${event.location ? `Localizada em ${event.location}. ` : ""}Esta experiência acontece ${timeInfo}.`;
		default:
			return `Um evento especial programado ${timeInfo}. ${event.location ? `Localização: ${event.location}.` : ""}`;
	}
}
