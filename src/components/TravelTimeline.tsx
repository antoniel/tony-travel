import type { Accommodation, AppEvent, Travel } from "@/lib/types";
import { differenceInDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	Calendar,
	Camera,
	Hotel,
	MapPin,
	Plane,
	UtensilsCrossed,
} from "lucide-react";

interface TravelTimelineProps {
	travel: Travel;
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

	return (
		<div className="max-w-4xl mx-auto space-y-8">
			<div className="relative">
				<div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-chart-3 opacity-30" />

				{groupedByDay.map(({ date, items }) => (
					<DaySection key={date} date={date} items={items} />
				))}
			</div>
		</div>
	);
}

function DaySection({ date, items }: { date: string; items: TimelineItem[] }) {
	return (
		<div className="mb-12">
			<div className="mb-6 pl-20">
				<h2 className="text-xl font-semibold text-foreground mb-1">
					{format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
				</h2>
				<div className="w-12 h-0.5 bg-primary rounded-full" />
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
		<div className="relative flex items-start gap-6 pb-8">
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

function createTimelineItems(travel: Travel): TimelineItem[] {
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

	for (const acc of travel.accommodation) {
		items.push({
			id: acc.id,
			type: "accommodation",
			date: acc.startDate,
			data: acc,
			title: `Check-in: ${acc.name}`,
			description: `Hospedagem em ${acc.type}${acc.rating ? ` com avaliação ${acc.rating}/5` : ""}. ${acc.address ? `Localizado em ${acc.address}.` : ""} Sua estadia vai até ${format(acc.endDate, "d 'de' MMMM", { locale: ptBR })}.`,
			location: acc.address,
			cost: acc.price,
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
			location: event.location,
			cost: event.estimatedCost,
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
