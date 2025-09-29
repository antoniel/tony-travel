import { Plane } from "lucide-react";
import type { FlightSegmentEvent } from "./flight-segments.utils";

interface FlightEventBlockProps {
	flightEvent: FlightSegmentEvent;
	topPosition: number;
	eventHeight: number;
	isDragging?: boolean;
	onEventClick?: (event: FlightSegmentEvent) => void;
	dayIndex: number;
	timeDisplay: string | null;
	layout?: {
		column: number;
		totalColumns: number;
		width: number;
		left: number;
	};
}

export function FlightEventBlock({
	flightEvent,
	topPosition,
	eventHeight,
	isDragging = false,
	onEventClick,
	timeDisplay,
	layout,
}: FlightEventBlockProps) {
	const leftPercent = layout ? layout.left * 100 : 0;
	const widthPercent = layout ? layout.width * 100 : 100;

	// Format flight details for display
	const formatFlightTitle = () => {
		if (flightEvent.metadata.isConsolidated) {
			// Show consolidated route
			return `${flightEvent.originAirport} → ${flightEvent.destinationAirport}`;
		}
		// Show simple route for direct flights
		return `${flightEvent.originAirport} → ${flightEvent.destinationAirport}`;
	};

	const formatFlightSubtitle = () => {
		const parts: string[] = [];

		if (flightEvent.flightNumber) {
			parts.push(flightEvent.flightNumber);
		}

		if (flightEvent.metadata.isConsolidated) {
			const segmentCount = flightEvent.metadata.originalSegments.length;
			parts.push(`${segmentCount} trechos`);
		}

		return parts.join(" • ");
	};

	// Create tooltip with detailed flight information
	const createTooltipText = () => {
		const formatDateTime = (date: Date) => {
			return date.toLocaleString("pt-BR", {
				weekday: "short",
				day: "numeric",
				month: "short",
				hour: "2-digit",
				minute: "2-digit",
			});
		};

		const lines = [
			`${formatFlightTitle()}`,
			`Partida: ${formatDateTime(flightEvent.startDate)} (${flightEvent.originAirport})`,
			`Chegada: ${formatDateTime(flightEvent.endDate)} (${flightEvent.destinationAirport})`,
		];

		if (flightEvent.flightNumber) {
			lines.push(`Voo: ${flightEvent.flightNumber}`);
		}

		// Check if it's a cross-date flight
		const startDay = new Date(flightEvent.startDate);
		startDay.setHours(0, 0, 0, 0);
		const endDay = new Date(flightEvent.endDate);
		endDay.setHours(0, 0, 0, 0);

		if (startDay.getTime() !== endDay.getTime()) {
			lines.push("⚠️ Voo entre dias");
		}

		if (flightEvent.metadata.isPreTripFlight) {
			lines.push("📅 Voo pré-viagem");
		}

		if (flightEvent.metadata.isConsolidated) {
			lines.push("Voo com conexões:");
			flightEvent.metadata.originalSegments.forEach((segment, index) => {
				lines.push(
					`  ${index + 1}. ${segment.originAirport} → ${segment.destinationAirport}`,
				);
			});
		}

		if (flightEvent.participants.length > 0) {
			const names = flightEvent.participants.map((p) => p.user.name).join(", ");
			lines.push(`Passageiros: ${names}`);
		}

		return lines.join("\n");
	};

	return (
		<div
			data-flight-event="true"
			className={`bg-chart-4 absolute text-xs px-2 py-1 rounded text-white pointer-events-auto z-10 flex items-start gap-1.5 cursor-pointer hover:shadow-lg transition-shadow group ${
				isDragging ? "opacity-80 shadow-xl scale-105" : ""
			} ${
				flightEvent.metadata.isPreTripFlight
					? "border border-yellow-400/50"
					: ""
			}`}
			style={{
				top: `${topPosition}px`,
				height: `${eventHeight}px`,
				minHeight: "20px",
				left: layout ? `${leftPercent}%` : "4px",
				width: layout ? `${widthPercent}%` : "calc(100% - 8px)",
				right: layout ? "auto" : "4px",
				opacity: flightEvent.metadata.isPreTripFlight ? 0.85 : 1, // Slightly transparent for pre-trip flights
			}}
			title={createTooltipText()}
			onClick={(e) => {
				e.stopPropagation();
				e.preventDefault();
				if (!isDragging && onEventClick) {
					onEventClick(flightEvent);
				}
			}}
			onMouseDown={(e) => {
				e.stopPropagation();
				e.preventDefault();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					e.stopPropagation();
					if (onEventClick) {
						onEventClick(flightEvent);
					}
				}
			}}
			aria-label={`Voo ${formatFlightTitle()}${timeDisplay ? ` às ${timeDisplay}` : ""}`}
		>
			{/* Airplane icon */}
			<Plane
				className="w-3 h-3 flex-shrink-0"
				style={{
					transform: "rotate(45deg)", // Point northeast to indicate travel direction
				}}
				aria-hidden="true"
			/>

			{/* Flight content */}
			<div className="flex-1 min-w-0 flex flex-col justify-center">
				{/* Main flight route - always visible */}
				<div className="truncate font-semibold leading-tight text-[11px]">
					{formatFlightTitle()}
				</div>

				{/* Flight details and time - only show if there's enough height */}
				{eventHeight >= 32 && (
					<div className="flex items-center justify-between gap-1 text-[10px] opacity-90 leading-tight mt-0.5">
						{/* Flight number and segments info */}
						{formatFlightSubtitle() && (
							<span className="truncate">{formatFlightSubtitle()}</span>
						)}

						{/* Time display */}
						{timeDisplay && (
							<span className="flex-shrink-0 font-medium">{timeDisplay}</span>
						)}
					</div>
				)}

				{/* Time-only display for smaller heights */}
				{eventHeight >= 20 && eventHeight < 32 && timeDisplay && (
					<div className="text-[10px] opacity-75 leading-tight">
						{timeDisplay}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Flight details modal component for when users click on flight events
 */
interface FlightDetailsModalProps {
	flightEvent: FlightSegmentEvent | null;
	isOpen: boolean;
	onClose: () => void;
}

export function FlightDetailsModal({
	flightEvent,
	isOpen,
	onClose,
}: FlightDetailsModalProps) {
	if (!isOpen || !flightEvent) return null;

	const formatDateTime = (date: Date) => {
		return date.toLocaleString("pt-BR", {
			weekday: "short",
			day: "numeric",
			month: "short",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
				<div className="p-6 space-y-4">
					{/* Header with airplane icon */}
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-chart-5/20">
							<Plane
								className="w-5 h-5 text-chart-5"
								style={{ transform: "rotate(45deg)" }}
							/>
						</div>
						<div>
							<h2 className="text-lg font-semibold">
								{flightEvent.originAirport} → {flightEvent.destinationAirport}
							</h2>
							{flightEvent.flightNumber && (
								<p className="text-sm text-muted-foreground">
									Voo {flightEvent.flightNumber}
								</p>
							)}
						</div>
					</div>

					{/* Flight timing */}
					<div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">
								PARTIDA
							</p>
							<p className="font-medium">
								{formatDateTime(flightEvent.startDate)}
							</p>
							<p className="text-sm text-muted-foreground">
								{flightEvent.originAirport}
							</p>
						</div>
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">
								CHEGADA
							</p>
							<p className="font-medium">
								{formatDateTime(flightEvent.endDate)}
							</p>
							<p className="text-sm text-muted-foreground">
								{flightEvent.destinationAirport}
							</p>
						</div>
					</div>

					{/* Consolidated flight segments */}
					{flightEvent.metadata.isConsolidated && (
						<div className="space-y-2">
							<h3 className="font-medium text-sm">Trechos do voo:</h3>
							<div className="space-y-1">
								{flightEvent.metadata.originalSegments.map((segment, index) => (
									<div
										key={`${segment.originAirport}-${segment.destinationAirport}-${index}`}
										className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded"
									>
										<span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded font-mono">
											{index + 1}
										</span>
										<span>
											{segment.originAirport} → {segment.destinationAirport}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Passengers */}
					{flightEvent.participants.length > 0 && (
						<div className="space-y-2">
							<h3 className="font-medium text-sm">Passageiros:</h3>
							<div className="flex flex-wrap gap-2">
								{flightEvent.participants.map((participant) => (
									<span
										key={participant.id}
										className="px-2 py-1 bg-muted rounded-md text-sm"
									>
										{participant.user.name}
									</span>
								))}
							</div>
						</div>
					)}

					{/* Close button */}
					<div className="flex justify-end pt-4 border-t">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
						>
							Fechar
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
