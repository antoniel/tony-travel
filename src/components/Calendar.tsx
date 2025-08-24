import { ScrollArea } from "@/components/ui/scroll-area";
import { DAYS_OF_WEEK, MONTHS, TIME_SLOTS } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

export default function Calendar({ events = [] }: { events: AppEvent[] }) {
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
}) => {
	const totalDays = getHowManyDaysTravel(props.events);
	const weekDays = getWeekDays(props.events);
	const [dayWidth, setDayWidth] = useState(0);
	const LEFT_GUTTER_PX = 80;
	const containerRef = useRef<HTMLDivElement>(null);
	console.log(containerRef.current?.clientWidth);

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

	return (
		<div
			className="relative h-[80vh] bg-white"
			onWheel={handleWheel}
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
								const isToday = new Date().toDateString() === date.toDateString();
								
								return (
									<div
										key={date.toISOString()}
										className={`border-r last:border-r-0 p-2 text-center ${
											isWeekend ? "bg-gray-100" : "bg-white"
										}`}
									>
										<div className={`text-xs uppercase ${
											isWeekend ? "text-gray-600" : "text-gray-500"
										}`}>
											{DAYS_OF_WEEK[date.getDay()]}
										</div>
										<div className={`text-lg font-medium ${
											isToday 
												? "text-blue-600 font-bold" 
												: isWeekend 
													? "text-gray-700" 
													: "text-gray-900"
										}`}>
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
							{weekDays.map((date) => {
								const dayEvents = getEventsForDate(props.events, date);
								const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday or Saturday

								return (
									<div
										key={date.toISOString()}
										className={`border-r last:border-r-0 relative ${
											isWeekend ? "bg-gray-100" : ""
										}`}
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
												const timeDisplay = showTime && startTimeStr && endTimeStr && startTimeStr !== endTimeStr
													? `${startTimeStr} - ${endTimeStr}`
													: showTime ? startTimeStr : null;

												return (
													<div
														key={event.id}
														className="absolute left-1 right-1 text-xs px-1 py-0.5 rounded text-white pointer-events-auto z-10 flex flex-col justify-start"
														style={{
															backgroundColor: getEventColor(event),
															top: `${topPosition}px`,
															height: `${eventHeight}px`,
															minHeight: "18px",
														}}
														title={`${timeDisplay ? `${timeDisplay} ` : ""}${event.title}`}
													>
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
