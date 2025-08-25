import { ScrollArea } from "@/components/ui/scroll-area";
import { useEventDragDrop } from "@/hooks/useEventDragDrop";
import { useScrollSync } from "@/hooks/useScrollSync";
import { DAYS_OF_WEEK, MONTHS, TIME_SLOTS } from "@/lib/constants";
import type { AppEvent } from "@/lib/types";
import { useLayoutEffect, useRef, useState } from "react";
import EventDetailsPanel from "./EventDetailsPanel";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface DisplayEvent extends AppEvent {
	originalStartDate?: Date;
	originalEndDate?: Date;
	displayStartDate?: Date;
	displayEndDate?: Date;
}

interface CalendarProps {
	events: AppEvent[];
	onAddEvent?: (event: Omit<AppEvent, "id">) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
}

const PX_PER_HOUR = 48;

export default function Calendar({
	events = [],
	onAddEvent,
	onUpdateEvent,
}: CalendarProps) {
	const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
	const [isPanelOpen, setIsPanelOpen] = useState(false);
	const [currentDate, setCurrentDate] = useState(() => {
		const [firstEvent] = events.sort((a, b) => {
			const aTime = a.startDate.getTime();
			const bTime = b.startDate.getTime();
			return aTime - bTime;
		});
		if (!firstEvent) {
			return new Date();
		}
		return firstEvent.startDate;
	});

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const handleEventClick = (event: AppEvent) => {
		setSelectedEvent(event);
		setIsPanelOpen(true);
	};

	const handleClosePanel = () => {
		setIsPanelOpen(false);
		setSelectedEvent(null);
	};

	return (
		<>
			<div
				className={`transition-all duration-300 ${isPanelOpen ? "mr-96" : ""}`}
			>
				<div className="bg-card rounded-lg mb-2 border">
					{/* Header */}
					<div className="flex items-center justify-between p-4">
						<h2 className="text-xl font-semibold text-foreground">
							{`${MONTHS[month]} ${year}`}
						</h2>
					</div>
				</div>
				<div className="bg-card rounded-xl overflow-hidden border">
					<div className="p-0">
						<RenderWeekViews
							currentDate={currentDate}
							setCurrentDate={setCurrentDate}
							events={events}
							onAddEvent={onAddEvent}
							onUpdateEvent={onUpdateEvent}
							onEventClick={handleEventClick}
						/>
					</div>
				</div>
			</div>

			<EventDetailsPanel
				event={selectedEvent}
				onClose={handleClosePanel}
				isOpen={isPanelOpen}
			/>
		</>
	);
}

const RenderWeekViews = (props: {
	events: AppEvent[];
	currentDate: Date;
	setCurrentDate: (date: Date) => void;
	onAddEvent?: (event: Omit<AppEvent, "id">) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
	onEventClick?: (event: AppEvent) => void;
}) => {
	const totalDays = getHowManyDaysTravel(props.events);
	const weekDays = getWeekDays(props.events);
	const [dayWidth, setDayWidth] = useState(0);
	const LEFT_GUTTER_PX = 80;
	const containerRef = useRef<HTMLDivElement>(null);
	const headerScrollAreaRef = useRef<HTMLDivElement>(null);
	const timeRulerRef = useRef<HTMLDivElement>(null);

	// Event creation modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newEvent, setNewEvent] = useState({
		title: "",
		startDate: new Date(),
		endDate: new Date(),
		type: "activity" as AppEvent["type"],
		location: "",
	});

	// Drag and drop functionality
	const {
		draggingEvent,
		handleEventMouseDown,
		handleMouseMove,
		handleMouseUp,
	} = useEventDragDrop({
		dayWidth,
		weekDays,
		onUpdateEvent: props.onUpdateEvent,
	});

	// Scroll synchronization
	const { handleWheel } = useScrollSync({
		headerScrollAreaRef,
		timeRulerRef,
		dayWidth,
		currentDate: props.currentDate,
	});

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const measure = () => {
			const available = el.clientWidth - LEFT_GUTTER_PX;
			if (available > 0) {
				setDayWidth(available / 7);
			}
		};

		measure();

		const ro = new ResizeObserver(measure);
		ro.observe(el);

		return () => ro.disconnect();
	}, []);

	const getDateTimeFromClick = (dayIndex: number, yPosition: number) => {
		const clickedDate = weekDays[dayIndex];
		if (!clickedDate) return new Date();

		const hourFromClick = Math.floor(yPosition / PX_PER_HOUR);
		const minuteFromClick = Math.floor(
			((yPosition % PX_PER_HOUR) / PX_PER_HOUR) * 60,
		);

		const resultDate = new Date(clickedDate);
		resultDate.setHours(hourFromClick, minuteFromClick, 0, 0);

		return resultDate;
	};

	const handleCellClick = (dayIndex: number, event: React.MouseEvent) => {
		if (!props.onAddEvent) return;

		// Don't create event if we just finished dragging
		if (draggingEvent?.hasMoved) {
			return;
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const yPosition = event.clientY - rect.top;

		const clickTime = getDateTimeFromClick(dayIndex, yPosition);
		const endTime = new Date(clickTime);
		endTime.setHours(clickTime.getHours() + 1); // Default 1 hour duration

		setNewEvent({
			title: "",
			startDate: clickTime,
			endDate: endTime,
			type: "activity",
			location: "",
		});

		setIsModalOpen(true);
	};

	const handleCreateEvent = () => {
		if (!props.onAddEvent || !newEvent.title.trim()) return;

		props.onAddEvent({
			title: newEvent.title,
			startDate: newEvent.startDate,
			endDate: newEvent.endDate,
			type: newEvent.type,
			location: newEvent.location,
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
		<div
			className="relative h-[80vh] bg-card "
			onWheel={handleWheel}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			ref={containerRef}
		>
			{/* Fixed Time Column */}
			<div className="absolute left-0 top-0 bottom-0 w-20 border-r z-20 bg-card">
				<div className="absolute top-16 left-0 right-0 bottom-0">
					<ScrollArea
						ref={timeRulerRef}
						className="h-full pointer-events-none"
						enableThumb={false}
					>
						<div>
							{TIME_SLOTS.map((time) => (
								<div
									key={time}
									className="h-12 flex flex-col justify-center items-center border-t text-xs text-muted-foreground p-2 bg-card"
								>
									{time}
								</div>
							))}
						</div>
					</ScrollArea>
				</div>
			</div>

			{/* Sticky Date Header */}
			<div className="absolute top-0 left-20 right-0 h-16 bg-card border-b z-10">
				<ScrollArea
					ref={headerScrollAreaRef}
					className="h-full"
					enableThumb={false}
				>
					<div style={{ width: `${totalDays * dayWidth}px` }}>
						<div
							className="grid h-16"
							style={{
								gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`,
							}}
						>
							{weekDays.map((date) => {
								const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday
								const isToday =
									new Date().toDateString() === date.toDateString();

								return (
									<div
										key={date.toISOString()}
										className={`border-r last:border-r-0 p-2 text-center ${
											isWeekend ? "bg-muted" : "bg-card"
										}`}
									>
										<div
											className={`text-xs uppercase ${
												isWeekend
													? "text-muted-foreground"
													: "text-muted-foreground"
											}`}
										>
											{DAYS_OF_WEEK[date.getDay()]}
										</div>
										<div
											className={`text-lg font-medium ${
												isToday
													? "text-primary font-bold"
													: isWeekend
														? "text-foreground"
														: "text-foreground"
											}`}
										>
											{date.getDate()}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</ScrollArea>
			</div>

			<div className="absolute top-16 left-20 right-0 bottom-0">
				<ScrollArea className="h-full w-full content-scroll-area">
					<div style={{ width: `${totalDays * dayWidth}px` }}>
						<div
							className="grid"
							style={{
								gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`,
							}}
						>
							{weekDays.map((date, dayIndex) => {
								const dayEvents = getEventsForDate(props.events, date);
								const isWeekend = date.getDay() === 0 || date.getDay() === 6;

								return (
									<DayCell
										key={date.toISOString()}
										date={date}
										dayIndex={dayIndex}
										events={dayEvents}
										isWeekend={isWeekend}
										onClick={handleCellClick}
										draggingEvent={
											draggingEvent
												? {
														event: draggingEvent.event,
														hasMoved: draggingEvent.hasMoved,
													}
												: undefined
										}
										onEventMouseDown={handleEventMouseDown}
										onEventClick={props.onEventClick}
										onUpdateEvent={props.onUpdateEvent}
									/>
								);
							})}
						</div>
					</div>
				</ScrollArea>
			</div>

			<EventCreateModal
				isOpen={isModalOpen}
				newEvent={newEvent}
				onClose={() => setIsModalOpen(false)}
				onCreate={handleCreateEvent}
				onEventChange={setNewEvent}
			/>
		</div>
	);
};

const getWeekDays = (events: AppEvent[]) => {
	const [firstEvent] = events.sort((a, b) => {
		const aTime = a?.startDate?.getTime();
		const bTime = b?.startDate?.getTime();
		return aTime - bTime;
	});
	const startOfWeek = new Date(firstEvent?.startDate ?? new Date());

	const weekDays = [];

	const totalDays = getHowManyDaysTravel(events);
	for (let i = 0; i < totalDays; i++) {
		const date = new Date(startOfWeek);
		date.setDate(startOfWeek.getDate() + i);
		weekDays.push(date);
	}
	return weekDays;
};

const getEventsForDate = (events: AppEvent[], date: Date): DisplayEvent[] => {
	const targetDay = new Date(date);
	targetDay.setHours(0, 0, 0, 0);
	const nextDay = new Date(targetDay);
	nextDay.setDate(targetDay.getDate() + 1);

	return events
		.filter((event) => {
			const eventStart = new Date(event.startDate);
			const eventEnd = new Date(event.endDate);

			// Check if the event overlaps with this day
			return eventStart < nextDay && eventEnd > targetDay;
		})
		.map((event) => {
			// Don't modify the event dates, just return the original event
			// The rendering logic will handle the display
			return {
				...event,
				// Store original dates for reference
				originalStartDate: event.startDate,
				originalEndDate: event.endDate,
			};
		});
};

const getTimePositionFromDate = (date: Date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();

	if (hours === 0 && minutes === 0) return 0;

	const startHour = 0;
	if (hours < startHour) return 0;

	const hourPosition = (hours - startHour) * PX_PER_HOUR;
	const minutePosition = (minutes / 60) * PX_PER_HOUR;

	return hourPosition + minutePosition;
};

const getTimeFromDate = (date: Date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();

	// Always return a time string, even for 00:00
	const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
	const amPm = hours >= 12 ? "p" : "a";
	const minuteStr =
		minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";

	return `${displayHour}${minuteStr}${amPm}`;
};

const getEventLayout = (events: AppEvent[]) => {
	// Sort events by start time, then by end time (shorter first)
	const sortedEvents = [...events].sort((a, b) => {
		const startDiff = a.startDate.getTime() - b.startDate.getTime();
		if (startDiff !== 0) return startDiff;
		return a.endDate.getTime() - b.endDate.getTime();
	});

	const eventLayouts = new Map<
		string,
		{ column: number; totalColumns: number; width: number; left: number }
	>();
	const columns: AppEvent[][] = [];

	// Assign each event to a column
	for (const event of sortedEvents) {
		let assignedColumn = -1;

		// Find the first column where this event can fit (no overlap)
		for (let i = 0; i < columns.length; i++) {
			const hasOverlap = columns[i].some(
				(existingEvent) =>
					event.startDate < existingEvent.endDate &&
					event.endDate > existingEvent.startDate,
			);

			if (!hasOverlap) {
				assignedColumn = i;
				break;
			}
		}

		// If no column found, create a new one
		if (assignedColumn === -1) {
			assignedColumn = columns.length;
			columns.push([]);
		}

		columns[assignedColumn].push(event);
	}

	// Calculate layout for each event group that overlaps
	const processedEvents = new Set<string>();

	for (const event of sortedEvents) {
		if (processedEvents.has(event.id)) continue;

		// Find all events that overlap with this one
		const overlappingEvents = [event];
		const eventStart = event.startDate;
		const eventEnd = event.endDate;

		// Look for other events that overlap
		for (const otherEvent of sortedEvents) {
			if (otherEvent.id !== event.id && !processedEvents.has(otherEvent.id)) {
				if (
					eventStart < otherEvent.endDate &&
					eventEnd > otherEvent.startDate
				) {
					overlappingEvents.push(otherEvent);
				}
			}
		}

		// Find total columns needed for this overlapping group
		const columnsUsed = new Set<number>();
		for (const overlappingEvent of overlappingEvents) {
			for (let i = 0; i < columns.length; i++) {
				if (columns[i].includes(overlappingEvent)) {
					columnsUsed.add(i);
					break;
				}
			}
		}

		const totalColumns = columnsUsed.size;

		// Assign layout to each overlapping event
		for (const overlappingEvent of overlappingEvents) {
			let columnIndex = -1;
			for (let i = 0; i < columns.length; i++) {
				if (columns[i].includes(overlappingEvent)) {
					columnIndex = Array.from(columnsUsed).indexOf(i);
					break;
				}
			}

			const width = 1 / totalColumns;
			const left = columnIndex / totalColumns;

			eventLayouts.set(overlappingEvent.id, {
				column: columnIndex,
				totalColumns,
				width,
				left,
			});

			processedEvents.add(overlappingEvent.id);
		}
	}

	return eventLayouts;
};

// Components
interface EventBlockProps {
	event: AppEvent;
	topPosition: number;
	eventHeight: number;
	isDragging: boolean;
	onMouseDown: (
		event: AppEvent,
		dayIndex: number,
		e: React.MouseEvent,
		resizeHandle?: "top" | "bottom",
	) => void;
	onEventClick?: (event: AppEvent) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
	dayIndex: number;
	timeDisplay: string | null;
	layout?: {
		column: number;
		totalColumns: number;
		width: number;
		left: number;
	};
}

const EventBlock = ({
	event,
	topPosition,
	eventHeight,
	isDragging,
	onMouseDown,
	onEventClick,
	onUpdateEvent,
	dayIndex,
	timeDisplay,
	layout,
}: EventBlockProps) => {
	const leftPercent = layout ? layout.left * 100 : 0;
	const widthPercent = layout ? layout.width * 100 : 100;

	return (
		<div
			key={event.id}
			className={`absolute text-xs px-1 py-0.5 rounded text-white pointer-events-auto z-10 flex flex-col justify-start cursor-move hover:shadow-lg transition-shadow group ${
				isDragging ? "opacity-80 shadow-xl scale-105" : ""
			}`}
			style={{
				backgroundColor: getEventColor(event),
				top: `${topPosition}px`,
				height: `${eventHeight}px`,
				minHeight: "18px",
				left: layout ? `${leftPercent}%` : "4px",
				width: layout ? `${widthPercent}%` : "calc(100% - 8px)",
				right: layout ? "auto" : "4px",
			}}
			title={`${timeDisplay ? `${timeDisplay} ` : ""}${event.title}`}
			onMouseDown={(e) => onMouseDown(event, dayIndex, e)}
			onClick={(e) => {
				e.stopPropagation();
				if (!isDragging && onEventClick) {
					onEventClick(event);
				}
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					e.stopPropagation();
					if (onEventClick) {
						onEventClick(event);
					}
				}
			}}
		>
			{/* Resize handle - top */}
			{eventHeight >= 30 && onUpdateEvent && (
				<div
					className="absolute -top-1 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-t"
					onMouseDown={(e) => {
						e.stopPropagation();
						onMouseDown(event, dayIndex, e, "top");
					}}
				/>
			)}

			{/* Event content */}
			<div className="flex-1 flex flex-col justify-start pointer-events-none">
				{/* Title first - always the main focus */}
				<div className="truncate font-semibold leading-tight">
					{event.title}
				</div>
				{/* Time below, only if event has sufficient height */}
				{timeDisplay && (
					<div className="text-xs opacity-75 leading-tight mt-0.5">
						{timeDisplay}
					</div>
				)}
			</div>

			{/* Resize handle - bottom */}
			{eventHeight >= 30 && onUpdateEvent && (
				<div
					className="absolute -bottom-1 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-b"
					onMouseDown={(e) => {
						e.stopPropagation();
						onMouseDown(event, dayIndex, e, "bottom");
					}}
				/>
			)}
		</div>
	);
};

interface EventCreateModalProps {
	isOpen: boolean;
	newEvent: {
		title: string;
		startDate: Date;
		endDate: Date;
		type: AppEvent["type"];
		location: string;
	};
	onClose: () => void;
	onCreate: () => void;
	onEventChange: React.Dispatch<
		React.SetStateAction<{
			title: string;
			startDate: Date;
			endDate: Date;
			type: AppEvent["type"];
			location: string;
		}>
	>;
}

const EventCreateModal = ({
	isOpen,
	newEvent,
	onClose,
	onCreate,
	onEventChange,
}: EventCreateModalProps) => {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create New Event</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="title" className="text-right">
							Title
						</Label>
						<Input
							id="title"
							value={newEvent.title}
							onChange={(e) =>
								onEventChange((prev) => ({ ...prev, title: e.target.value }))
							}
							className="col-span-3"
							placeholder="Event title"
						/>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="type" className="text-right">
							Type
						</Label>
						<Select
							value={newEvent.type}
							onValueChange={(value: AppEvent["type"]) =>
								onEventChange((prev) => ({ ...prev, type: value }))
							}
						>
							<SelectTrigger className="col-span-3">
								<SelectValue placeholder="Select event type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="travel">Travel</SelectItem>
								<SelectItem value="food">Food</SelectItem>
								<SelectItem value="activity">Activity</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="location" className="text-right">
							Location
						</Label>
						<Input
							id="location"
							value={newEvent.location}
							onChange={(e) =>
								onEventChange((prev) => ({ ...prev, location: e.target.value }))
							}
							className="col-span-3"
							placeholder="Event location (optional)"
						/>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="startTime" className="text-right">
							Start
						</Label>
						<Input
							id="startTime"
							type="datetime-local"
							value={newEvent.startDate.toISOString().slice(0, 16)}
							onChange={(e) =>
								onEventChange((prev) => ({
									...prev,
									startDate: new Date(e.target.value),
								}))
							}
							className="col-span-3"
						/>
					</div>

					<div className="grid grid-cols-4 items-center gap-4">
						<Label htmlFor="endTime" className="text-right">
							End
						</Label>
						<Input
							id="endTime"
							type="datetime-local"
							value={newEvent.endDate.toISOString().slice(0, 16)}
							onChange={(e) =>
								onEventChange((prev) => ({
									...prev,
									endDate: new Date(e.target.value),
								}))
							}
							className="col-span-3"
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onCreate} disabled={!newEvent.title.trim()}>
						Create Event
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

interface DayCellProps {
	date: Date;
	dayIndex: number;
	events: AppEvent[];
	isWeekend: boolean;
	onClick: (dayIndex: number, event: React.MouseEvent) => void;
	draggingEvent?: {
		event: AppEvent;
		hasMoved?: boolean;
	};
	onEventMouseDown: (
		event: AppEvent,
		dayIndex: number,
		e: React.MouseEvent,
		resizeHandle?: "top" | "bottom",
	) => void;
	onEventClick?: (event: AppEvent) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
}

const DayCell = ({
	date,
	dayIndex,
	events: dayEvents,
	isWeekend,
	onClick,
	draggingEvent,
	onEventMouseDown,
	onEventClick,
	onUpdateEvent,
}: DayCellProps) => {
	return (
		<div
			key={date.toISOString()}
			className={`border-r last:border-r-0 relative cursor-pointer hover:bg-accent/20 ${
				isWeekend ? "bg-muted" : ""
			}`}
			onClick={(e) => onClick(dayIndex, e)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick(dayIndex, e as unknown as React.MouseEvent);
				}
			}}
			aria-label={`Create event on ${date.toLocaleDateString()}`}
		>
			{/* Hour lines */}
			{TIME_SLOTS.map((slot) => (
				<div key={slot} className="h-12 border-b" />
			))}

			{/* Events overlay */}
			<div className="absolute inset-0 pointer-events-none">
				{(() => {
					const eventLayouts = getEventLayout(dayEvents);
					return dayEvents.map((event) => {
						// For multi-day events, calculate display positions for this specific day
						const currentDayStart = new Date(date);
						currentDayStart.setHours(0, 0, 0, 0);
						const currentDayEnd = new Date(currentDayStart);
						currentDayEnd.setDate(currentDayEnd.getDate() + 1);

						const eventStart = new Date(event.startDate);
						const eventEnd = new Date(event.endDate);

						// Determine actual display times for this day
						const displayStart =
							eventStart < currentDayStart ? currentDayStart : eventStart;
						// For events that end after this day, show them ending at 23:59:59
						const endOfDay = new Date(currentDayEnd);
						endOfDay.setMilliseconds(-1); // This sets it to 23:59:59.999
						const displayEnd = eventEnd >= currentDayEnd ? endOfDay : eventEnd;

						const topPosition = getTimePositionFromDate(displayStart);

						// Calculate event height based on display times for this day
						const displayStartTime = displayStart.getTime();
						const displayEndTime = displayEnd.getTime();
						const durationMs = displayEndTime - displayStartTime;
						const durationMinutes = durationMs / (1000 * 60);

						let eventHeight = 18; // Default minimum height
						if (durationMinutes > 0) {
							// Convert duration to pixels (48px per hour = 0.8px per minute)
							const calculatedHeight = Math.max(
								24, // Minimum height for timed events
								(durationMinutes * PX_PER_HOUR) / 60,
							);
							eventHeight = calculatedHeight;
						}

						// Only show time if event has sufficient height (>= 40px, roughly 50+ minutes)
						const showTime = eventHeight >= 40;
						const startTimeStr = getTimeFromDate(displayStart);
						const endTimeStr = getTimeFromDate(displayEnd);
						const timeDisplay =
							showTime &&
							startTimeStr &&
							endTimeStr &&
							startTimeStr !== endTimeStr
								? `${startTimeStr} - ${endTimeStr}`
								: showTime
									? startTimeStr
									: null;

						const isDragging = draggingEvent?.event.id === event.id;

						const layout = eventLayouts.get(event.id);

						return (
							<EventBlock
								key={event.id}
								event={event}
								topPosition={topPosition}
								eventHeight={eventHeight}
								isDragging={isDragging}
								onMouseDown={onEventMouseDown}
								onEventClick={onEventClick}
								onUpdateEvent={onUpdateEvent}
								dayIndex={dayIndex}
								timeDisplay={timeDisplay}
								layout={layout}
							/>
						);
					});
				})()}
			</div>
		</div>
	);
};

const getEventColor = (event: AppEvent) => {
	const typeColors = {
		travel: "var(--chart-1)",
		food: "var(--chart-3)",
		activity: "var(--chart-2)",
	};

	return typeColors[event.type];
};

const getHowManyDaysTravel = (events: AppEvent[]) => {
	const [firstEvent] = events.sort((a, b) => {
		const aTime = a.startDate.getTime();
		const bTime = b.startDate.getTime();
		return aTime - bTime;
	});
	const [lastEvent] = events.sort((a, b) => {
		const aTime = a.endDate.getTime();
		const bTime = b.endDate.getTime();
		return bTime - aTime;
	});
	if (!lastEvent) {
		return 0;
	}
	const firstDay = firstEvent.startDate;
	const lastDay = lastEvent.endDate;
	return (
		Math.ceil(
			(lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24),
		) + 1
	);
};
