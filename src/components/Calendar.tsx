import { ScrollArea } from "@/components/ui/scroll-area";
import { DAYS_OF_WEEK, MONTHS, TIME_SLOTS } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export interface AppEvent {
	id: string;
	title: string;
	startDate: Date;
	endDate: Date;
	type: "travel" | "food" | "activity";
	location?: string;
	/**
	 * Some events need to include locomotion to the location.
	 * so you should include the locomotion event as a dependency.
	 */
	dependencies?: AppEvent[];
}

interface CalendarProps {
	events: AppEvent[];
	onAddEvent?: (event: Omit<AppEvent, "id">) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
}

export default function Calendar({ events = [], onAddEvent, onUpdateEvent }: CalendarProps) {
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
	const [view, setView] = useState<"month" | "week">("week");

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const previousWeek = () => {
		const newDate = new Date(currentDate);
		newDate.setDate(currentDate.getDate() - 7);
		setCurrentDate(newDate);
	};

	const nextWeek = () => {
		const newDate = new Date(currentDate);
		newDate.setDate(currentDate.getDate() + 7);
		setCurrentDate(newDate);
	};

	const goToToday = () => {
		const [firstEvent] = events.sort((a, b) => {
			const aTime = a.startDate.getTime();
			const bTime = b.startDate.getTime();
			return aTime - bTime;
		});
		setCurrentDate(firstEvent.startDate);
	};

	return (
		<div className="bg-white rounded-lg shadow-sm border">
			<Tabs
				defaultValue="week"
				value={view}
				onValueChange={(value) => setView(value as "month" | "week")}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<button
								type="button"
								onClick={view === "week" ? previousWeek : undefined}
								className="p-1 hover:bg-gray-100 rounded"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<button
								type="button"
								onClick={view === "week" ? nextWeek : undefined}
								className="p-1 hover:bg-gray-100 rounded"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>
						<button
							type="button"
							onClick={goToToday}
							className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
						>
							today
						</button>
					</div>

					<h2 className="text-xl font-semibold text-gray-900">
						{`${MONTHS[month]} ${year}`}
					</h2>

					<TabsList>
						<TabsTrigger value="week">Week</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="week">
					<div className="p-0">
						<RenderWeekViews
							currentDate={currentDate}
							setCurrentDate={setCurrentDate}
							events={events}
							onAddEvent={onAddEvent}
							onUpdateEvent={onUpdateEvent}
						/>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}

const RenderWeekViews = (props: {
	events: AppEvent[];
	currentDate: Date;
	setCurrentDate: (date: Date) => void;
	onAddEvent?: (event: Omit<AppEvent, "id">) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
}) => {
	const totalDays = getHowManyDaysTravel(props.events);
	const weekDays = getWeekDays(props.events);
	const [dayWidth, setDayWidth] = useState(0);
	const LEFT_GUTTER_PX = 80;
	const containerRef = useRef<HTMLDivElement>(null);

	// Event creation modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [newEvent, setNewEvent] = useState({
		title: "",
		startDate: new Date(),
		endDate: new Date(),
		type: "activity" as AppEvent["type"],
		location: "",
	});

	// Drag and drop state
	const [draggingEvent, setDraggingEvent] = useState<{
		event: AppEvent;
		dayIndex: number;
		offsetY: number;
		isDragging: boolean;
		isResizing: boolean;
		resizeDirection?: 'top' | 'bottom';
		startX: number;
		startY: number;
		hasMoved: boolean;
	} | null>(null);

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

	const centerWeekStart = 14;
	const headerScrollAreaRef = useRef<HTMLDivElement>(null);
	const timeRulerRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const headerScrollArea = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const contentScrollArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;

		if (!headerScrollArea || !contentScrollArea) return;

		const centerPosition = centerWeekStart * dayWidth;
		headerScrollArea.scrollLeft = centerPosition;
		contentScrollArea.scrollLeft = centerPosition;

		const syncHorizontalScroll = (source: HTMLElement, target: HTMLElement) => {
			const handleScroll = () => {
				if (target.scrollLeft !== source.scrollLeft) {
					target.scrollLeft = source.scrollLeft;
				}
			};
			source.addEventListener("scroll", handleScroll);
			return () => source.removeEventListener("scroll", handleScroll);
		};

		const syncVerticalScroll = (source: HTMLElement, target: HTMLElement) => {
			const handleScroll = () => {
				if (target.scrollTop !== source.scrollTop) {
					target.scrollTop = source.scrollTop;
				}
			};
			source.addEventListener("scroll", handleScroll);
			return () => source.removeEventListener("scroll", handleScroll);
		};

		const timeRulerScrollArea = timeRulerRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;

		const cleanupHeaderSync = syncHorizontalScroll(
			headerScrollArea,
			contentScrollArea,
		);

		const cleanupVerticalSync = syncVerticalScroll(
			contentScrollArea,
			timeRulerScrollArea,
		);

		return () => {
			cleanupHeaderSync();
			cleanupVerticalSync?.();
		};
	}, [props.currentDate]);

	const handleWheel = (e: React.WheelEvent) => {
		const headerScrollArea = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const contentScrollArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;

		if (!headerScrollArea || !contentScrollArea) return;

		const scrollArea = contentScrollArea;

		const hasHorizontalScroll = e.deltaX !== 0;
		const isShiftScroll = e.shiftKey;
		const atVerticalTop = scrollArea.scrollTop === 0 && e.deltaY < 0;
		const atVerticalBottom =
			scrollArea.scrollTop >=
				scrollArea.scrollHeight - scrollArea.clientHeight && e.deltaY > 0;

		const shouldHandleHorizontally =
			hasHorizontalScroll || isShiftScroll || atVerticalTop || atVerticalBottom;

		if (shouldHandleHorizontally) {
			const scrollAmount =
				e.deltaX || (isShiftScroll ? e.deltaY : e.deltaY * 0.5);
			headerScrollArea.scrollLeft += scrollAmount;
			contentScrollArea.scrollLeft += scrollAmount;
		}
	};

	const getTimePositionFromDate = (date: Date) => {
		const hours = date.getHours();
		const minutes = date.getMinutes();

		if (hours === 0 && minutes === 0) return 0;

		const startHour = 0;
		if (hours < startHour) return 0;

		const hourPosition = (hours - startHour) * 48;
		const minutePosition = (minutes / 60) * 48;

		return hourPosition + minutePosition;
	};

	const getDateTimeFromClick = (dayIndex: number, yPosition: number) => {
		const clickedDate = weekDays[dayIndex];
		if (!clickedDate) return new Date();

		// Calculate hour from Y position (48px per hour)
		const hourFromClick = Math.floor(yPosition / 48);
		const minuteFromClick = Math.floor(((yPosition % 48) / 48) * 60);

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

	// Drag and Drop handlers
	const handleEventMouseDown = (
		event: AppEvent,
		dayIndex: number,
		mouseEvent: React.MouseEvent,
		resizeDirection?: 'top' | 'bottom'
	) => {
		if (!props.onUpdateEvent) return;
		
		mouseEvent.stopPropagation();
		mouseEvent.preventDefault();
		
		const rect = (mouseEvent.currentTarget as HTMLElement).getBoundingClientRect();
		const offsetY = mouseEvent.clientY - rect.top;
		
		setDraggingEvent({
			event,
			dayIndex,
			offsetY,
			isDragging: !resizeDirection,
			isResizing: !!resizeDirection,
			resizeDirection,
			startX: mouseEvent.clientX,
			startY: mouseEvent.clientY,
			hasMoved: false,
		});
	};

	const handleMouseMove = (mouseEvent: React.MouseEvent) => {
		if (!draggingEvent || !props.onUpdateEvent) return;

		// Check if we've moved enough to consider it a drag (threshold of 5px)
		const deltaX = Math.abs(mouseEvent.clientX - draggingEvent.startX);
		const deltaY = Math.abs(mouseEvent.clientY - draggingEvent.startY);
		const hasMoved = deltaX > 5 || deltaY > 5;
		
		// Update the hasMoved flag
		if (hasMoved && !draggingEvent.hasMoved) {
			setDraggingEvent(prev => prev ? { ...prev, hasMoved: true } : null);
		}
		
		if (!hasMoved) return; // Don't do anything until we've moved enough

		const contentArea = document.querySelector('.content-scroll-area [data-radix-scroll-area-viewport]') as HTMLElement;
		if (!contentArea) return;

		const rect = contentArea.getBoundingClientRect();
		const yPosition = mouseEvent.clientY - rect.top + contentArea.scrollTop;
		
		if (draggingEvent.isDragging) {
			// Calculate new time based on mouse position
			const adjustedY = yPosition - draggingEvent.offsetY;
			const newHour = Math.max(0, Math.floor(adjustedY / 48));
			const newMinute = Math.floor(((adjustedY % 48) / 48) * 60);
			
			// Calculate which day column we're in
			const xPosition = mouseEvent.clientX - rect.left + contentArea.scrollLeft;
			const dayIndex = Math.floor(xPosition / dayWidth);
			const targetDay = weekDays[Math.max(0, Math.min(dayIndex, weekDays.length - 1))];
			
			if (targetDay) {
				const originalDuration = draggingEvent.event.endDate.getTime() - draggingEvent.event.startDate.getTime();
				
				const newStartDate = new Date(targetDay);
				newStartDate.setHours(newHour, newMinute, 0, 0);
				
				const newEndDate = new Date(newStartDate.getTime() + originalDuration);
				
				props.onUpdateEvent(draggingEvent.event.id, {
					startDate: newStartDate,
					endDate: newEndDate,
				});
			}
		} else if (draggingEvent.isResizing) {
			// Handle resizing
			const newHour = Math.max(0, Math.floor(yPosition / 48));
			const newMinute = Math.floor(((yPosition % 48) / 48) * 60);
			
			const targetDay = weekDays[draggingEvent.dayIndex];
			if (targetDay) {
				const newTime = new Date(targetDay);
				newTime.setHours(newHour, newMinute, 0, 0);
				
				if (draggingEvent.resizeDirection === 'top') {
					// Resizing from top (changing start time)
					if (newTime.getTime() < draggingEvent.event.endDate.getTime()) {
						props.onUpdateEvent(draggingEvent.event.id, {
							startDate: newTime,
						});
					}
				} else {
					// Resizing from bottom (changing end time)
					if (newTime.getTime() > draggingEvent.event.startDate.getTime()) {
						props.onUpdateEvent(draggingEvent.event.id, {
							endDate: newTime,
						});
					}
				}
			}
		}
	};

	const handleMouseUp = () => {
		// If we were dragging, wait a bit before clearing to prevent immediate click
		if (draggingEvent?.hasMoved) {
			setTimeout(() => {
				setDraggingEvent(null);
			}, 100);
		} else {
			setDraggingEvent(null);
		}
	};

	return (
		<div
			className="relative h-[80vh] bg-white"
			onWheel={handleWheel}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			ref={containerRef}
		>
			{/* Fixed Time Column */}
			<div className="absolute left-0 top-0 bottom-0 w-20 bg-white border-r z-20">
				<div className="h-16 border-b bg-gray-50" />
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
									className="h-12 border-b text-xs text-gray-500 p-2 bg-white"
								>
									{time}
								</div>
							))}
						</div>
					</ScrollArea>
				</div>
			</div>

			{/* Sticky Date Header */}
			<div className="absolute top-0 left-20 right-0 h-16 bg-white border-b z-10">
				<ScrollArea ref={headerScrollAreaRef} className="h-full">
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
											isWeekend ? "bg-gray-100" : "bg-white"
										}`}
									>
										<div
											className={`text-xs uppercase ${
												isWeekend ? "text-gray-600" : "text-gray-500"
											}`}
										>
											{DAYS_OF_WEEK[date.getDay()]}
										</div>
										<div
											className={`text-lg font-medium ${
												isToday
													? "text-blue-600 font-bold"
													: isWeekend
														? "text-gray-700"
														: "text-gray-900"
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
								const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday

								return (
									<div
										key={date.toISOString()}
										className={`border-r last:border-r-0 relative cursor-pointer hover:bg-blue-50 ${
											isWeekend ? "bg-gray-100" : ""
										}`}
										onClick={(e) => handleCellClick(dayIndex, e)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleCellClick(
													dayIndex,
													e as unknown as React.MouseEvent,
												);
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
											{dayEvents.map((event, eventIndex) => {
												const eventTime = getTimeFromDate(event.startDate);
												const topPosition = eventTime
													? getTimePositionFromDate(event.startDate)
													: eventIndex * 20;

												// Calculate event height and duration
												const startTime = event.startDate.getTime();
												const endTime = event.endDate.getTime();
												const durationMs = endTime - startTime;
												const durationMinutes = durationMs / (1000 * 60);

												let eventHeight = 18; // Default minimum height
												if (eventTime && durationMinutes > 0) {
													// Convert duration to pixels (48px per hour = 0.8px per minute)
													const calculatedHeight = Math.max(
														24, // Minimum height for timed events
														(durationMinutes * 48) / 60,
													);
													eventHeight = calculatedHeight;
												}

												// Only show time if event has sufficient height (>= 40px, roughly 50+ minutes)
												const showTime = eventHeight >= 40;
												const startTimeStr = getTimeFromDate(event.startDate);
												const endTimeStr = getTimeFromDate(event.endDate);
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
												
												return (
													<div
														key={event.id}
														className={`absolute left-1 right-1 text-xs px-1 py-0.5 rounded text-white pointer-events-auto z-10 flex flex-col justify-start cursor-move hover:shadow-lg transition-shadow group ${
															isDragging ? 'opacity-80 shadow-xl scale-105' : ''
														}`}
														style={{
															backgroundColor: getEventColor(event),
															top: `${topPosition}px`,
															height: `${eventHeight}px`,
															minHeight: "18px",
														}}
														title={`${timeDisplay ? `${timeDisplay} ` : ""}${event.title}`}
														onMouseDown={(e) => handleEventMouseDown(event, dayIndex, e)}
													>
														{/* Resize handle - top */}
														{eventHeight >= 30 && props.onUpdateEvent && (
															<div
																className="absolute -top-1 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-t"
																onMouseDown={(e) => {
																	e.stopPropagation();
																	handleEventMouseDown(event, dayIndex, e, 'top');
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
														{eventHeight >= 30 && props.onUpdateEvent && (
															<div
																className="absolute -bottom-1 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-b"
																onMouseDown={(e) => {
																	e.stopPropagation();
																	handleEventMouseDown(event, dayIndex, e, 'bottom');
																}}
															/>
														)}
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</ScrollArea>
			</div>

			{/* Event Creation Modal */}
			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
									setNewEvent((prev) => ({ ...prev, title: e.target.value }))
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
									setNewEvent((prev) => ({ ...prev, type: value }))
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
									setNewEvent((prev) => ({ ...prev, location: e.target.value }))
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
									setNewEvent((prev) => ({
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
									setNewEvent((prev) => ({
										...prev,
										endDate: new Date(e.target.value),
									}))
								}
								className="col-span-3"
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setIsModalOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleCreateEvent}
							disabled={!newEvent.title.trim()}
						>
							Create Event
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

const getWeekDays = (events: AppEvent[]) => {
	const [firstEvent] = events.sort((a, b) => {
		const aTime = a.startDate.getTime();
		const bTime = b.startDate.getTime();
		return aTime - bTime;
	});
	const startOfWeek = new Date(firstEvent.startDate);

	const weekDays = [];

	const totalDays = getHowManyDaysTravel(events);
	for (let i = 0; i < totalDays; i++) {
		const date = new Date(startOfWeek);
		date.setDate(startOfWeek.getDate() + i);
		weekDays.push(date);
	}
	return weekDays;
};

const getEventsForDate = (events: AppEvent[], date: Date) => {
	return events.filter((event) => {
		const eventDate = new Date(event.startDate);
		return (
			eventDate.getDate() === date.getDate() &&
			eventDate.getMonth() === date.getMonth() &&
			eventDate.getFullYear() === date.getFullYear()
		);
	});
};

const getTimeFromDate = (date: Date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();

	if (hours === 0 && minutes === 0) {
		return null;
	}

	const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
	const amPm = hours >= 12 ? "p" : "a";
	const minuteStr =
		minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";

	return `${displayHour}${minuteStr}${amPm}`;
};

const getEventColor = (event: AppEvent) => {
	const typeColors = {
		travel: "#10b981",
		food: "#f59e0b",
		activity: "#8b5cf6",
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
