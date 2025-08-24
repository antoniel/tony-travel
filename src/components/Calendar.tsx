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
	const [view, setView] = useState<"month" | "week">("week"); // Week as default

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
	const weekDays = getWeekDays(props.events);
	console.log({ currentDate: props.currentDate });
	const totalDays = 35; // 5 weeks
	const [dayWidth, setDayWidth] = useState(0);
	const LEFT_GUTTER_PX = 80;
	const containerRef = useRef<HTMLDivElement>(null);
	console.log(containerRef.current?.clientWidth);

	// Measure synchronously before paint so the first render already uses the correct width
	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const measure = () => {
			const available = el.clientWidth - LEFT_GUTTER_PX;
			if (available > 0) {
				setDayWidth(available / 7);
			}
		};

		// Initial measure
		measure();

		// Watch size changes
		const ro = new ResizeObserver(measure);
		ro.observe(el);

		return () => ro.disconnect();
	}, []);
	// useEffect(() => {
	// 	setDayWidth((slideWindowRef.current?.clientWidth ?? 0) / 7);
	// }, [slideWindowRef.current?.clientWidth]);
	const centerWeekStart = 14; // Index where current week starts (2 weeks * 7 days)
	const headerScrollAreaRef = useRef<HTMLDivElement>(null);
	const timeRulerRef = useRef<HTMLDivElement>(null);

	// Create hourly time slots from 6 AM to 11 PM

	// Auto-scroll to center on current week and handle infinite scrolling
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const headerScrollArea = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const contentScrollArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;

		if (!headerScrollArea || !contentScrollArea) return;

		// Center on current week (scroll to position of center week)
		const centerPosition = centerWeekStart * dayWidth;
		headerScrollArea.scrollLeft = centerPosition;
		contentScrollArea.scrollLeft = centerPosition;

		// Sync scroll between header and content
		const syncHorizontalScroll = (source: HTMLElement, target: HTMLElement) => {
			const handleScroll = () => {
				if (target.scrollLeft !== source.scrollLeft) {
					target.scrollLeft = source.scrollLeft;
				}
			};
			source.addEventListener("scroll", handleScroll);
			return () => source.removeEventListener("scroll", handleScroll);
		};

		// Sync vertical scroll between content and time ruler
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

	// Handle horizontal scroll with mousepad/trackpad and infinite scrolling
	const handleWheel = (e: React.WheelEvent) => {
		const headerScrollArea = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const contentScrollArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;

		if (!headerScrollArea || !contentScrollArea) return;

		// Use content area for vertical scroll detection since header doesn't scroll vertically
		const scrollArea = contentScrollArea;

		// Enable horizontal scroll when:
		// 1. Shift key is pressed (standard behavior)
		// 2. Natural horizontal scroll (deltaX > 0)
		// 3. At vertical scroll limits and trying to scroll vertically
		const hasHorizontalScroll = e.deltaX !== 0;
		const isShiftScroll = e.shiftKey;
		const atVerticalTop = scrollArea.scrollTop === 0 && e.deltaY < 0;
		const atVerticalBottom =
			scrollArea.scrollTop >=
				scrollArea.scrollHeight - scrollArea.clientHeight && e.deltaY > 0;

		// Only handle if we're actually going to scroll horizontally
		const shouldHandleHorizontally =
			hasHorizontalScroll || isShiftScroll || atVerticalTop || atVerticalBottom;

		if (shouldHandleHorizontally) {
			const scrollAmount =
				e.deltaX || (isShiftScroll ? e.deltaY : e.deltaY * 0.5);
			headerScrollArea.scrollLeft += scrollAmount;
			contentScrollArea.scrollLeft += scrollAmount;

			// // Check for infinite scroll boundaries and adjust currentDate
			// const maxScroll =
			// 	contentScrollArea.scrollWidth - contentScrollArea.clientWidth;
			// const scrollRatio = contentScrollArea.scrollLeft / maxScroll;

			// // If scrolled too far left (< 20%), move currentDate back a week
			// if (scrollRatio < 0.2) {
			// 	const newDate = new Date(props.currentDate);
			// 	newDate.setDate(props.currentDate.getDate() - 7);
			// 	props.setCurrentDate(newDate);
			// }
			// // If scrolled too far right (> 80%), move currentDate forward a week
			// else if (scrollRatio > 0.8) {
			// 	const newDate = new Date(props.currentDate);
			// 	newDate.setDate(props.currentDate.getDate() + 7);
			// 	props.setCurrentDate(newDate);
			// }
		}
	};

	const getTimePositionFromDate = (date: Date) => {
		const hours = date.getHours();
		const minutes = date.getMinutes();

		if (hours === 0 && minutes === 0) return 0; // All-day event at top

		// Calculate position relative to 6 AM start (each hour = 48px height)
		const startHour = 6;
		if (hours < startHour) return 0; // Before 6 AM

		const hourPosition = (hours - startHour) * 48; // 48px per hour (h-12)
		const minutePosition = (minutes / 60) * 48; // Proportional minutes

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
				{/* Corner space for header */}
				<div className="h-16 border-b bg-gray-50" />
				{/* Time slots */}
				<div className="absolute top-16 left-0 right-0 bottom-0">
					<ScrollArea ref={timeRulerRef} className="h-full" enableThumb={false}>
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
								return (
									<div
										key={date.toISOString()}
										className={`border-r last:border-r-0 p-2 text-center ${"bg-white"}`}
									>
										<div className="text-xs text-gray-500 uppercase">
											{DAYS_OF_WEEK[date.getDay()]}
										</div>
										<div className={`text-lg font-medium ${"text-gray-900"}`}>
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

								return (
									<div
										key={date.toISOString()}
										className={"border-r last:border-r-0 relative"}
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

												// Calculate event height based on duration
												let eventHeight = 18; // Default height for all-day events
												if (eventTime) {
													const startTime = event.startDate.getTime();
													const endTime = event.endDate.getTime();
													const durationMs = endTime - startTime;
													const durationMinutes = durationMs / (1000 * 60);

													// Convert duration to pixels (48px per hour = 0.8px per minute)
													const calculatedHeight = Math.max(
														18,
														(durationMinutes * 48) / 60,
													);
													eventHeight = calculatedHeight;
												}

												const endTime = getTimeFromDate(event.endDate);
												const timeDisplay =
													eventTime && endTime && eventTime !== endTime
														? `${eventTime} - ${endTime}`
														: eventTime;

												return (
													<div
														key={event.id}
														className="absolute left-1 right-1 text-xs px-1 py-0.5 rounded text-white pointer-events-auto z-10"
														style={{
															backgroundColor: getEventColor(event),
															top: `${topPosition}px`,
															height: `${eventHeight}px`,
															minHeight: "18px",
														}}
														title={`${timeDisplay ? `${timeDisplay} ` : ""}${event.title}`}
													>
														<div className="truncate">
															{timeDisplay && (
																<span className="font-semibold">
																	{timeDisplay}{" "}
																</span>
															)}
															{event.title}
														</div>
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
	const [firstEvent, ...rest] = events.sort((a, b) => {
		const aTime = a.startDate.getTime();
		const bTime = b.startDate.getTime();
		return aTime - bTime;
	});
	const lastEvent = rest.at(-1);
	if (!lastEvent) {
		return [];
	}
	const startOfWeek = new Date(firstEvent.startDate);

	// Create a sliding window of 5 weeks (35 days) centered on current week
	const weekDays = [];
	const totalWeeks = 5;
	const startOffset = 0; // 2 weeks before

	for (let i = startOffset; i < startOffset + totalWeeks * 7; i++) {
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
		return null; // All-day event
	}

	// Format as "8:30a" or "3:00p"
	const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
	const amPm = hours >= 12 ? "p" : "a";
	const minuteStr =
		minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";

	return `${displayHour}${minuteStr}${amPm}`;
};

const getEventColor = (event: AppEvent) => {
	const typeColors = {
		travel: "#10b981", // Green
		food: "#f59e0b", // Orange
		activity: "#8b5cf6", // Purple
	};

	return typeColors[event.type];
};
