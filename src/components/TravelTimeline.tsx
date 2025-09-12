import type { InsertAppEvent } from "@/lib/db/schema";
import type { Accommodation, AppEvent, TravelWithRelations } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useMutation } from "@tanstack/react-query";
import { differenceInDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Calendar,
	Camera,
	Hotel,
	MapPin,
	Plane,
	Plus,
	UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { EventCreateModal } from "./EventCreateModal";

interface TravelTimelineProps {
	travel: TravelWithRelations;
	onAddEvent?: (event: {
		title: string;
		startDate: Date;
		endDate: Date;
		type: AppEvent["type"];
		location: string;
		travelId: string;
	}) => void;
}

type TimelineItem = {
	id: string;
	type: "accommodation" | "event" | "travel-start" | "travel-end";
	date: Date;
	data: AppEvent | Accommodation | null;
	title: string;
	description: string;
	location?: string;
	cost?: number;
	icon: React.ComponentType<{ className?: string }>;
};

export function TravelTimeline({ travel }: TravelTimelineProps) {
	const timelineItems = createTimelineItems(travel);
	const groupedByDay = groupItemsByDay(timelineItems);

	const createEventMutation = useMutation(orpc.createEvent.mutationOptions());
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
	});

	const handleCreateEvent = () => {
		if (!onAddEvent || !newEvent.title.trim()) return;

		onAddEvent({
			...newEvent,
			travelId: travel.id,
		});

		setNewEvent({
			title: "",
			startDate: new Date(),
			endDate: new Date(),
			type: "activity",
			location: "",
		});

		setIsModalOpen(false);
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
								});
								setIsModalOpen(true);
							}}
						/>
					))}
				</div>
			</div>

			<EventCreateModal
				isOpen={isModalOpen}
				newEvent={newEvent}
				onClose={() => setIsModalOpen(false)}
				onCreate={handleCreateEvent}
				onEventChange={setNewEvent}
				travelStartDate={travel.startDate}
				travelEndDate={travel.endDate}
			/>
		</>
	);
}

function DaySection({
	date,
	items,
	onAddEvent,
}: {
	date: string;
	items: TimelineItem[];
	onAddEvent?: (date: string) => void;
}) {
	const handleAddEvent = () => {
		if (onAddEvent) {
			onAddEvent(date);
		}
	};

	return (
		<div className="mb-12">
			<div className="sticky top-0 z-20 bg-background/35 backdrop-blur-sm border-b border-border/40 mb-6 pl-20 py-4 -mx-4 px-4">
				<div className="flex items-center gap-4">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-1">
							{format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
						</h2>
						<div className="w-12 h-0.5 bg-primary rounded-full" />
					</div>
					<button
						type="button"
						onClick={handleAddEvent}
						className="flex items-center justify-center w-4 h-7 pb-1 rounded-full cursor-pointer text-black"
						title="Adicionar evento"
					>
						<Plus className="w-4 h-4" />
					</button>
				</div>
			</div>
			{items.map((item, index) => (
				<TimelineItemComponent
					key={item.id}
					item={item}
					index={index}
					isLast={index === items.length - 1}
				/>
			))}
		</div>
	);
}

function TimelineItemComponent({
	item,
}: {
	item: TimelineItem;
	index: number;
	isLast: boolean;
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
				<div className="travel-card rounded-lg p-6 hover:shadow-md transition-all duration-300">
					<div className="flex items-start justify-between mb-3">
						<div>
							<h3 className="text-lg font-semibold text-foreground mb-1">
								{item.title}
							</h3>
							<p className="text-sm text-muted-foreground">
								{format(item.date, "HH:mm")}
							</p>
						</div>
						{item.cost && (
							<div className="bg-chart-3/10 text-chart-3 px-3 py-1 rounded-full text-sm font-medium">
								R$ {item.cost.toLocaleString()}
							</div>
						)}
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
		const dayKey = format(item.date, "yyyy-MM-dd");
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
		default:
			return "text-white border-primary/20 bg-primary";
	}
}

function createTimelineItems(travel: TravelWithRelations): TimelineItem[] {
	const items: TimelineItem[] = [];

	items.push({
		id: "travel-start",
		type: "travel-start",
		date: travel.startDate,
		data: null,
		title: "Início da Viagem",
		description: `Sua aventura para ${travel.destination} começa! Prepare-se para uma experiência incrível de ${differenceInDays(travel.endDate, travel.startDate) + 1} dias.`,
		icon: Plane,
	});

	for (const acc of travel.accommodations) {
		items.push({
			id: acc.id,
			type: "accommodation",
			date: acc.startDate,
			data: acc,
			title: `Check-in: ${acc.name}`,
			description: `Hospedagem em ${acc.type}${acc.rating ? ` com avaliação ${acc.rating}/5` : ""}. ${acc.address ? `Localizado em ${acc.address}.` : ""} Sua estadia vai até ${format(acc.endDate, "d 'de' MMMM", { locale: ptBR })}.`,
			location: acc.address ?? undefined,
			cost: acc.price ?? undefined,
			icon: Hotel,
		});
	}

	for (const event of travel.events) {
		const icon = getEventIcon(event.type);
		const description = getEventDescription(event);

		items.push({
			id: event.id,
			type: "event",
			date: event.startDate,
			data: event,
			title: event.title,
			description,
			location: event.location ?? undefined,
			cost: event.estimatedCost ?? undefined,
			icon,
		});
	}

	items.push({
		id: "travel-end",
		type: "travel-end",
		date: travel.endDate,
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
