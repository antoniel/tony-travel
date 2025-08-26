import type { AppEvent } from "@/lib/types";
import { useActivityImage } from "@/hooks/useActivityImage";
import { X } from "lucide-react";
import ActivityImage from "./ActivityImage";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface EventDetailsPanelProps {
	event: AppEvent | null;
	onClose: () => void;
	isOpen: boolean;
}

export default function EventDetailsPanel({
	event,
	onClose,
	isOpen,
}: EventDetailsPanelProps) {
	// Use the activity image hook for lazy loading
	const {
		imageUrl,
		imageMetadata,
		isLoading: imageLoading,
		refetch: refetchImage,
	} = useActivityImage({
		event: event || ({} as AppEvent),
		autoFetch: isOpen && !!event, // Only fetch when panel is open and event exists
	});

	if (!isOpen || !event) return null;

	const getEventColor = (event: AppEvent) => {
		const typeColors = {
			travel: "var(--chart-1)",
			food: "var(--chart-3)",
			activity: "var(--chart-2)",
		};
		return typeColors[event.type];
	};

	const formatDateTime = (date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(date);
	};

	const formatTime = (date: Date) => {
		const hours = date.getHours();
		const minutes = date.getMinutes();

		if (hours === 0 && minutes === 0) {
			return "Todo o dia";
		}

		const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
		const amPm = hours >= 12 ? "PM" : "AM";
		const minuteStr =
			minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";

		return `${displayHour}${minuteStr} ${amPm}`;
	};

	const getEventTypeName = (type: AppEvent["type"]) => {
		const typeNames = {
			travel: "Viagem",
			food: "Comida",
			activity: "Atividade",
		};
		return typeNames[type];
	};

	const getDuration = () => {
		const durationMs = event.endDate.getTime() - event.startDate.getTime();
		const hours = Math.floor(durationMs / (1000 * 60 * 60));
		const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

		if (hours === 0 && minutes === 0) {
			return "Todo o dia";
		}

		if (hours > 0 && minutes > 0) {
			return `${hours}h ${minutes}m`;
		}

		if (hours > 0) {
			return `${hours}h`;
		}

		return `${minutes}m`;
	};

	return (
		<div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-lg z-50 overflow-y-auto">
			<div className="p-6">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg font-semibold">Detalhes do Evento</h2>
					<Button variant="ghost" size="sm" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<Card>
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<CardTitle className="text-xl mb-2">{event.title}</CardTitle>
								<div className="flex items-center gap-2">
									<div
										className="w-3 h-3 rounded-full"
										style={{ backgroundColor: getEventColor(event) }}
									/>
									<span className="text-sm text-muted-foreground">
										{getEventTypeName(event.type)}
									</span>
								</div>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* Activity Image - only show for activities */}
						{event.type === "activity" && (
							<div>
								<ActivityImage
									imageUrl={imageUrl}
									imageMetadata={imageMetadata}
									title={event.title}
									location={event.location}
									className="mb-4"
									isLoading={imageLoading}
									showRefreshButton={true}
									onRefreshImage={refetchImage}
								/>
							</div>
						)}

						<div>
							<h3 className="font-medium text-sm text-muted-foreground mb-2">
								HORÁRIO
							</h3>
							<div className="space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-sm">Início:</span>
									<span className="text-sm font-medium">
										{formatTime(event.startDate)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm">Fim:</span>
									<span className="text-sm font-medium">
										{formatTime(event.endDate)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm">Duração:</span>
									<span className="text-sm font-medium">{getDuration()}</span>
								</div>
							</div>
						</div>

						<div>
							<h3 className="font-medium text-sm text-muted-foreground mb-2">
								DATA
							</h3>
							<p className="text-sm">{formatDateTime(event.startDate)}</p>
						</div>

						{event.location && (
							<div>
								<h3 className="font-medium text-sm text-muted-foreground mb-2">
									LOCAL
								</h3>
								<p className="text-sm">{event.location}</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
