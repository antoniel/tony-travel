import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEventDragDrop } from "@/hooks/useEventDragDrop";
import { useScrollSync } from "@/hooks/useScrollSync";
import { DAYS_OF_WEEK, MONTHS, TIME_SLOTS } from "@/lib/constants";
import type { InsertAppEvent } from "@/lib/db/schema";
import type { Accommodation, AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EventCreateModal } from "../EventCreateModal";
import { EventEditModal } from "../EventEditModal";
import { EventDetailsModal } from "../ui/event-details-modal";
interface DisplayEvent extends AppEvent {
	originalStartDate?: Date;
	originalEndDate?: Date;
	displayStartDate?: Date;
	displayEndDate?: Date;
}

interface CalendarProps {
	travelId: string;
	events: AppEvent[];
	accommodations?: Accommodation[];
	onAddEvent?: (event: InsertAppEvent) => void;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
	travelStartDate?: Date;
	travelEndDate?: Date;
	canWrite?: boolean;
}

const PX_PER_HOUR = 48;

// Helpers to treat date-only values in UTC to avoid off-by-one issues
const toUtcMidnight = (d: Date) =>
	new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
	);
const toUtcEndOfDay = (d: Date) =>
	new Date(
		Date.UTC(
			d.getUTCFullYear(),
			d.getUTCMonth(),
			d.getUTCDate(),
			23,
			59,
			59,
			999,
		),
	);
const isSameUTCDate = (a: Date, b: Date) =>
	a.getUTCFullYear() === b.getUTCFullYear() &&
	a.getUTCMonth() === b.getUTCMonth() &&
	a.getUTCDate() === b.getUTCDate();

export default function Calendar(props: CalendarProps) {
	const [index, setIndex] = useState(0);
	const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
	const controlsRef = useRef<{ scrollByDays: (delta: number) => void } | null>(
		null,
	);
	const currentDate = (() => {
		const base = props.travelStartDate
			? toUtcMidnight(new Date(props.travelStartDate))
			: toUtcMidnight(new Date());
		return new Date(base.getTime() + index * 24 * 60 * 60 * 1000);
	})();

	const year = currentDate.getUTCFullYear();
	const month = currentDate.getUTCMonth();

	const handleEventClick = (event: AppEvent) => {
		setSelectedEvent(event);
		setIsDetailsOpen(true);
	};

	const handleCloseDetails = () => {
		setIsDetailsOpen(false);
		setSelectedEvent(null);
	};

	const handleEditEvent = (event: AppEvent) => {
		setEditingEvent(event);
		setIsEditModalOpen(true);
		setIsDetailsOpen(false); // Close details modal when opening edit modal
	};

	return (
		<>
			<div className="space-y-2">
				<div className="bg-card rounded-lg border">
					{/* Header */}
					<div className="flex items-center justify-between p-4">
						<h2 className="text-xl font-semibold text-foreground">{`${MONTHS[month]} ${year}`}</h2>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => controlsRef.current?.scrollByDays(-1)}
								aria-label="Dia anterior"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8"
								onClick={() => controlsRef.current?.scrollByDays(1)}
								aria-label="Próximo dia"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
				<div className="bg-card rounded-xl overflow-hidden border">
					<div className="p-0">
						<RenderWeekViews
							travelId={props.travelId}
							// currentDate={currentDate}
							events={props.events}
							travelStartDate={props.travelStartDate}
							travelEndDate={props.travelEndDate}
							accommodations={props.accommodations}
							onUpdateEvent={props.canWrite ? props.onUpdateEvent : undefined}
							onEventClick={handleEventClick}
							canWrite={props.canWrite}
							controlsRef={controlsRef}
							setIndex={setIndex}
							editingEvent={editingEvent}
							isEditModalOpen={isEditModalOpen}
							onEditEvent={handleEditEvent}
							onCloseEditModal={() => {
								setIsEditModalOpen(false);
								setEditingEvent(null);
							}}
						/>
					</div>
				</div>
			</div>

			<EventDetailsModal
				event={selectedEvent}
				isOpen={Boolean(selectedEvent) && isDetailsOpen}
				onClose={handleCloseDetails}
				onEditEvent={handleEditEvent}
				canWrite={props.canWrite}
			/>
		</>
	);
}

const RenderWeekViews = (props: {
	travelId: string;
	events: AppEvent[];
	accommodations?: Accommodation[];
	// currentDate: Date;
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
	onEventClick?: (event: AppEvent) => void;
	travelStartDate?: Date;
	travelEndDate?: Date;
	canWrite?: boolean;
	setIndex: (index: number) => void;
	controlsRef?: React.RefObject<{
		scrollByDays: (delta: number) => void;
	} | null>;
	editingEvent: AppEvent | null;
	isEditModalOpen: boolean;
	onEditEvent: (event: AppEvent) => void;
	onCloseEditModal: () => void;
}) => {
	// Mutations and cache handling
	const queryClient = useQueryClient();
	const updateEventMutation = useMutation(
		orpc.eventRoutes.updateEvent.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.travelRoutes.getTravel.queryKey({
						input: { id: props.travelId },
					}),
				});
			},
		}),
	);

	// Track last updated event (drag/resize) to commit server-side on mouse up
	const lastUpdateRef = useRef<{
		id: string;
		startDate: Date;
		endDate: Date;
	} | null>(null);
	// Travel range helpers
	const normalizeStartOfDay = (d: Date) => toUtcMidnight(d);
	const normalizeEndOfDay = (d: Date) => toUtcEndOfDay(d);
	const travelStart = props.travelStartDate
		? normalizeStartOfDay(props.travelStartDate)
		: undefined;
	const travelEnd = props.travelEndDate
		? normalizeEndOfDay(props.travelEndDate)
		: undefined;
	const travelTotalDays =
		travelStart && travelEnd
			? Math.max(
					1,
					Math.floor(
						(travelEnd.getTime() - travelStart.getTime()) /
							(1000 * 60 * 60 * 24),
					) + 1,
				)
			: undefined;
	const restrictNonTravelDays = Boolean(
		travelStart && travelEnd && (travelTotalDays ?? 0) < 7,
	);
	const isWithinTravel = (date: Date) => {
		if (!travelStart || !travelEnd) return true;
		const dayStart = normalizeStartOfDay(date);
		return (
			dayStart.getTime() >= travelStart.getTime() &&
			dayStart.getTime() <= travelEnd.getTime()
		);
	};

	let weekDays: Date[] = [];
	if (travelStart && travelEnd) {
		const days = Math.max(1, travelTotalDays ?? 1);
		weekDays = Array.from({ length: days }, (_, i) => {
			const d = new Date(travelStart);
			d.setUTCDate(travelStart.getUTCDate() + i);
			return d;
		});
	} else {
		weekDays = getWeekDays(props.events);
	}
	const [dayWidth, setDayWidth] = useState(0);
	const LEFT_GUTTER_PX = 80;
	const containerRef = useRef<HTMLDivElement>(null);
	const headerScrollAreaRef = useRef<HTMLDivElement>(null);
	const timeRulerRef = useRef<HTMLDivElement>(null);
	const allDayScrollAreaRef = useRef<HTMLDivElement>(null);

	// Calculate dynamic all-day section height
	const accommodationsLayout = props.accommodations
		? getAccommodationsLayoutWithRows(props.accommodations, weekDays)
		: [];
	const maxRows =
		accommodationsLayout.length > 0
			? accommodationsLayout.reduce((max, acc) => Math.max(max, acc.row), 0) + 1
			: 0;
	const allDaySectionHeight =
		props.accommodations && props.accommodations.length > 0
			? Math.max(48, maxRows * 22 + 12)
			: 0;
	const headerHeight = 64; // h-16 = 4rem = 64px
	const totalHeaderHeight = headerHeight + allDaySectionHeight;

	// Responsive: days visible per page (mobile: 3, desktop: 7)
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(max-width: 640px)");
		const update = () => setIsMobile(mq.matches);
		update();
		mq.addEventListener?.("change", update);
		return () => mq.removeEventListener?.("change", update);
	}, []);

	const visibleDays = isMobile ? 3 : 7;

	// Event creation modal state
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

	// Prevent click handler from overriding a just-committed drag selection
	const suppressNextClickRef = useRef(false);

	// Selection state for click+drag creation (15-min granularity)
	const [isSelecting, setIsSelecting] = useState(false);
	const [selectionDayIndex, setSelectionDayIndex] = useState<number | null>(
		null,
	);
	const [selectionStart, setSelectionStart] = useState<Date | null>(null);
	const [selectionCurrent, setSelectionCurrent] = useState<Date | null>(null);

	// Drag and drop functionality
	const {
		draggingEvent,
		handleEventMouseDown,
		handleMouseMove,
		handleMouseUp,
	} = useEventDragDrop({
		dayWidth,
		weekDays,
		onUpdateEvent: (eventId, updated) => {
			// optimistic local update
			props.onUpdateEvent?.(eventId, updated);
			// Track last full update to commit on mouse up
			if (updated.startDate && updated.endDate) {
				lastUpdateRef.current = {
					id: eventId,
					startDate: updated.startDate,
					endDate: updated.endDate,
				};
			}
		},
		restrictNonTravelDays: restrictNonTravelDays,
		isDayWithin: isWithinTravel,
	});

	// Scroll synchronization
	const { handleWheel } = useScrollSync({
		headerScrollAreaRef,
		timeRulerRef,
		allDayScrollAreaRef,
		dayWidth,
		// currentDate: props.currentDate,
		onFinishWheel: () => {
			props.setIndex(getFirstVisibleIndex());
		},
	});

	const contentScrollAreaRef = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		if (!contentScrollAreaRef.current || props.events.length === 0) return;
		const todayEvents = props.events.sort(
			(a, b) => a.startDate.getTime() - b.startDate.getTime(),
		);
		if (todayEvents.length === 0) return;
		const firstEvent = todayEvents[0];
		const scrollPosition = getTimePositionFromDate(firstEvent.startDate);

		const paddingOffset = 160;
		const finalScrollPosition = Math.max(0, scrollPosition - paddingOffset);
		requestAnimationFrame(() => {
			if (contentScrollAreaRef.current) {
				const scrollElement = contentScrollAreaRef.current.querySelector(
					"[data-radix-scroll-area-viewport]",
				);
				if (scrollElement) {
					scrollElement.scrollTop = finalScrollPosition;
				}
			}
		});
	}, [props.events]);

	useLayoutEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const measure = () => {
			const available = el.clientWidth - LEFT_GUTTER_PX;
			if (available > 0) {
				setDayWidth(available / visibleDays);
			}
		};

		measure();

		const ro = new ResizeObserver(measure);
		ro.observe(el);

		return () => ro.disconnect();
	}, [visibleDays]);

	// Horizontal navigation helpers (arrows/swipe)
	const getViewports = () => {
		const headerVp = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement | null;
		const contentVp = contentScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement | null;
		const allDayVp = allDayScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement | null;
		return { headerVp, contentVp, allDayVp };
	};

	const getBounds = () => {
		// Default bounds across rendered weekDays
		const minIdx = 0;
		let maxIdx = Math.max(0, weekDays.length - visibleDays);
		if (restrictNonTravelDays && travelTotalDays) {
			const lastTravelIdx = Math.max(
				0,
				Math.min(weekDays.length - 1, travelTotalDays - 1),
			);
			maxIdx = Math.max(0, lastTravelIdx - visibleDays + 1);
		}
		return { minIdx, maxIdx };
	};

	const getFirstVisibleIndex = () => {
		const { headerVp } = getViewports();
		const sl = headerVp?.scrollLeft ?? 0;
		return Math.round(sl / dayWidth);
	};

	const scrollToIndex = (targetIdx: number) => {
		const { minIdx, maxIdx } = getBounds();
		const clampedIdx = Math.max(minIdx, Math.min(maxIdx, targetIdx));
		const left = clampedIdx * dayWidth;
		const { headerVp, contentVp, allDayVp } = getViewports();
		if (headerVp) headerVp.scrollLeft = left;
		if (contentVp) contentVp.scrollLeft = left;
		if (allDayVp) allDayVp.scrollLeft = left;
	};

	const scrollByDays = (delta: number) => {
		const idx = getFirstVisibleIndex();
		props.setIndex(idx + delta);
		scrollToIndex(idx + delta);
	};

	// Expose controls to parent header
	if (props.controlsRef) {
		props.controlsRef.current = { scrollByDays };
	}

	// Swipe gestures on header bar (mobile)
	const swipeStart = useRef<{ x: number; y: number } | null>(null);
	const onHeaderPointerDown = (e: React.PointerEvent) => {
		if (!isMobile) return;
		swipeStart.current = { x: e.clientX, y: e.clientY };
	};
	const onHeaderPointerUp = (e: React.PointerEvent) => {
		if (!isMobile || !swipeStart.current) return;
		const dx = e.clientX - swipeStart.current.x;
		const dy = e.clientY - swipeStart.current.y;
		swipeStart.current = null;
		if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
			// Horizontal swipe
			scrollByDays(dx < 0 ? 1 : -1);
		}
	};

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

	const roundDateTo15 = (date: Date, mode: "floor" | "ceil") => {
		const d = new Date(date);
		const minutes = d.getMinutes();
		const remainder = minutes % 15;
		if (remainder === 0) return d;
		if (mode === "floor") {
			d.setMinutes(minutes - remainder, 0, 0);
		} else {
			d.setMinutes(minutes + (15 - remainder), 0, 0);
		}
		return d;
	};

	const clampToDay = (baseDay: Date, date: Date) => {
		const start = new Date(baseDay);
		start.setHours(0, 0, 0, 0);
		const end = new Date(baseDay);
		end.setHours(23, 59, 59, 999);
		return new Date(
			Math.min(Math.max(date.getTime(), start.getTime()), end.getTime()),
		);
	};

	const createEventMutation = useMutation(
		orpc.eventRoutes.createEvent.mutationOptions(),
	);
	const MINUTES_15_MS = 15 * 60 * 1000;

	const handleCellClick = (dayIndex: number, event: React.MouseEvent) => {
		if (!props.canWrite) return;
		// Don't create event if we just finished dragging
		if (draggingEvent?.hasMoved || isSelecting) {
			return;
		}
		// Skip the immediate click right after a drag selection
		if (suppressNextClickRef.current) {
			suppressNextClickRef.current = false;
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
			cost: null,
			description: "",
			link: "",
		});

		setIsModalOpen(true);
	};

	const handleDayMouseDown = (
		dayIndex: number,
		event: React.MouseEvent,
		isDisabled?: boolean,
	) => {
		if (!props.canWrite || isDisabled) return;
		if (draggingEvent?.hasMoved) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const yPosition = event.clientY - rect.top;
		const clickTime = getDateTimeFromClick(dayIndex, yPosition);
		const start = roundDateTo15(clickTime, "floor");
		setIsSelecting(true);
		setSelectionDayIndex(dayIndex);
		setSelectionStart(start);
		setSelectionCurrent(start);
		event.preventDefault();
	};

	const handleDayMouseMove = (
		dayIndex: number,
		event: React.MouseEvent,
		isDisabled?: boolean,
	) => {
		if (!isSelecting || selectionDayIndex !== dayIndex || isDisabled) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const yPosition = event.clientY - rect.top;
		const moveTimeRaw = getDateTimeFromClick(dayIndex, yPosition);
		const moveTime = roundDateTo15(moveTimeRaw, "ceil");
		const baseDay = weekDays[dayIndex];
		setSelectionCurrent(clampToDay(baseDay, moveTime));
	};

	const handleDayMouseUp = (
		dayIndex: number,
		_event: React.MouseEvent,
		isDisabled?: boolean,
	) => {
		if (!isSelecting || selectionDayIndex !== dayIndex || isDisabled) return;
		setIsSelecting(false);
		if (!selectionStart || !selectionCurrent) {
			setSelectionDayIndex(null);
			setSelectionStart(null);
			setSelectionCurrent(null);
			return;
		}
		let start = selectionStart;
		let end = selectionCurrent;
		if (end.getTime() < start.getTime()) {
			const tmp = start;
			start = end;
			end = tmp;
		}
		if (end.getTime() - start.getTime() < MINUTES_15_MS) {
			end = new Date(start.getTime() + MINUTES_15_MS);
		}
		// clamp end to same day just in case
		end = clampToDay(start, end);

		setNewEvent({
			title: "",
			startDate: start,
			endDate: end,
			type: "activity",
			location: "",
			cost: null,
			description: "",
			link: "",
		});
		setIsModalOpen(true);
		// Ensure subsequent click from this mouse interaction doesn't override the selection
		suppressNextClickRef.current = true;
		// reset selection state
		setSelectionDayIndex(null);
		setSelectionStart(null);
		setSelectionCurrent(null);
	};

	const handleCreateEvent = () => {
		if (!newEvent.title.trim()) return;

		createEventMutation.mutate({
			...newEvent,
			cost: newEvent.cost ?? undefined,
			travelId: props.travelId,
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

	const handleSaveEvent = (changes: Partial<AppEvent>) => {
		if (!props.editingEvent) return;

		updateEventMutation.mutate({
			travelId: props.travelId,
			id: props.editingEvent.id,
			event: changes,
		});

		props.onCloseEditModal();
	};

	return (
		<div
			className="relative h-[70vh] bg-card "
			onWheel={handleWheel}
			onMouseMove={handleMouseMove}
			onMouseUp={() => {
				handleMouseUp();
				if (lastUpdateRef.current) {
					const payload = lastUpdateRef.current;
					updateEventMutation.mutate({
						travelId: props.travelId,
						id: payload.id,
						event: {
							startDate: payload.startDate,
							endDate: payload.endDate,
						},
					});
					lastUpdateRef.current = null;
				}
			}}
			onMouseLeave={() => {
				handleMouseUp();
				if (lastUpdateRef.current) {
					const payload = lastUpdateRef.current;
					updateEventMutation.mutate({
						travelId: props.travelId,
						id: payload.id,
						event: {
							startDate: payload.startDate,
							endDate: payload.endDate,
						},
					});
					lastUpdateRef.current = null;
				}
			}}
			ref={containerRef}
		>
			{/* Fixed Time Column */}
			<div className="absolute left-0 top-0 bottom-0 w-20 border-r z-20 bg-card">
				<div
					className="absolute left-0 right-0 bottom-0"
					style={{ top: `${totalHeaderHeight}px` }}
				>
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
					onPointerDown={onHeaderPointerDown}
					onPointerUp={onHeaderPointerUp}
				>
					<div style={{ width: `${weekDays.length * dayWidth}px` }}>
						<div
							className="grid h-16"
							style={{
								gridTemplateColumns: `repeat(${weekDays.length}, ${dayWidth}px)`,
							}}
						>
							{weekDays.map((date) => {
								const isWeekend =
									date.getUTCDay() === 0 || date.getUTCDay() === 6; // Sunday or Saturday
								const isToday = isSameUTCDate(new Date(), date);
								const disabled = restrictNonTravelDays && !isWithinTravel(date);

								return (
									<div
										key={date.toISOString()}
										className={`relative border-r last:border-r-0 p-2 text-center ${
											isWeekend ? "bg-muted" : "bg-card"
										}`}
									>
										{disabled ? (
											<div
												className="absolute inset-0 pointer-events-none"
												style={{
													backgroundImage:
														"repeating-linear-gradient(45deg, hsl(var(--border) / 0.35) 0, hsl(var(--border) / 0.35) 4px, transparent 4px, transparent 8px)",
												}}
												aria-hidden="true"
											/>
										) : null}
										<div
											className={`text-xs uppercase ${isWeekend ? "text-muted-foreground" : "text-muted-foreground"}`}
										>
											{DAYS_OF_WEEK[date.getUTCDay()]}
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
											{date.getUTCDate()}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</ScrollArea>
			</div>

			{/* All Day Events Section */}
			{props.accommodations && props.accommodations.length > 0 && (
				<AllDayEventsSection
					accommodations={props.accommodations}
					weekDays={weekDays}
					dayWidth={dayWidth}
					allDayScrollAreaRef={allDayScrollAreaRef}
					sectionHeight={allDaySectionHeight}
				/>
			)}

			<div
				className="absolute left-20 right-0 bottom-0"
				style={{ top: `${totalHeaderHeight}px` }}
			>
				<ScrollArea
					ref={contentScrollAreaRef}
					className="h-full w-full content-scroll-area"
				>
					<div style={{ width: `${weekDays.length * dayWidth}px` }}>
						<div
							className="grid"
							style={{
								gridTemplateColumns: `repeat(${weekDays.length}, ${dayWidth}px)`,
							}}
						>
							{weekDays.map((date, dayIndex) => {
								const dayEvents = getEventsForDate(props.events, date);
								const isWeekend = date.getDay() === 0 || date.getDay() === 6;
								const disabled = restrictNonTravelDays && !isWithinTravel(date);
								const selectionForThisDay =
									isSelecting &&
									selectionDayIndex === dayIndex &&
									selectionStart &&
									selectionCurrent
										? { start: selectionStart, current: selectionCurrent }
										: undefined;
								return (
									<DayCollumn
										key={date.toISOString()}
										date={date}
										dayIndex={dayIndex}
										events={dayEvents}
										isWeekend={isWeekend}
										isDisabled={disabled}
										isSelecting={isSelecting}
										selection={selectionForThisDay}
										onClick={handleCellClick}
										onDayMouseDown={handleDayMouseDown}
										onDayMouseMove={handleDayMouseMove}
										onDayMouseUp={handleDayMouseUp}
										draggingEvent={
											draggingEvent
												? {
														event: draggingEvent.event,
														hasMoved: draggingEvent.hasMoved,
													}
												: undefined
										}
										onEventMouseDown={
											props.canWrite ? handleEventMouseDown : () => {}
										}
										onEventClick={props.onEventClick}
										onUpdateEvent={
											props.canWrite ? props.onUpdateEvent : undefined
										}
									/>
								);
							})}
						</div>
					</div>
				</ScrollArea>
			</div>

			{props.canWrite ? (
				<>
					<EventCreateModal
						isOpen={isModalOpen}
						newEvent={newEvent}
						onClose={() => setIsModalOpen(false)}
						onCreate={handleCreateEvent}
						onEventChange={setNewEvent}
						travelStartDate={props.travelStartDate}
						travelEndDate={props.travelEndDate}
					/>
					<EventEditModal
						isOpen={props.isEditModalOpen}
						event={props.editingEvent}
						onClose={props.onCloseEditModal}
						onSave={handleSaveEvent}
						travelStartDate={props.travelStartDate}
						travelEndDate={props.travelEndDate}
					/>
				</>
			) : null}
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

	for (let i = 0; i < 7; i++) {
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

interface DayCellProps {
	date: Date;
	dayIndex: number;
	events: AppEvent[];
	isWeekend: boolean;
	isDisabled?: boolean;
	isSelecting?: boolean;
	selection?: { start: Date; current: Date };
	onClick: (dayIndex: number, event: React.MouseEvent) => void;
	onDayMouseDown: (
		dayIndex: number,
		e: React.MouseEvent,
		isDisabled?: boolean,
	) => void;
	onDayMouseMove: (
		dayIndex: number,
		e: React.MouseEvent,
		isDisabled?: boolean,
	) => void;
	onDayMouseUp: (
		dayIndex: number,
		e: React.MouseEvent,
		isDisabled?: boolean,
	) => void;
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

const DayCollumn = ({
	date,
	dayIndex,
	events: dayEvents,
	isWeekend,
	isDisabled,
	isSelecting: _isSelecting,
	selection,
	onClick,
	onDayMouseDown,
	onDayMouseMove,
	onDayMouseUp,
	draggingEvent,
	onEventMouseDown,
	onEventClick,
	onUpdateEvent,
}: DayCellProps) => {
	return (
		<div
			key={date.toISOString()}
			className={`border-r last:border-r-0 relative ${
				isDisabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-accent/20"
			} ${isWeekend ? "bg-muted" : ""}`}
			onMouseDown={(e) => onDayMouseDown(dayIndex, e, isDisabled)}
			onMouseMove={(e) => onDayMouseMove(dayIndex, e, isDisabled)}
			onMouseUp={(e) => onDayMouseUp(dayIndex, e, isDisabled)}
			onMouseLeave={(e) => onDayMouseUp(dayIndex, e, isDisabled)}
			onClick={(e) => {
				if (isDisabled) return;
				onClick(dayIndex, e);
			}}
			onKeyDown={(e) => {
				if (isDisabled) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick(dayIndex, e as unknown as React.MouseEvent);
				}
			}}
			aria-label={`Criar evento em ${date.toLocaleDateString()}`}
			aria-disabled={isDisabled ? true : undefined}
		>
			{/* Hour lines */}
			{TIME_SLOTS.map((slot) => (
				<div key={slot} className="h-12 border-b" />
			))}

			{/* Events overlay */}
			<div className="absolute inset-0 pointer-events-none">
				{isDisabled ? (
					<div
						className="absolute inset-0"
						style={{
							backgroundImage:
								"repeating-linear-gradient(45deg, hsl(var(--border) / 0.35) 0, hsl(var(--border) / 0.35) 4px, transparent 4px, transparent 8px)",
						}}
						aria-hidden="true"
					/>
				) : null}
				{selection
					? (() => {
							const start =
								selection.start.getTime() <= selection.current.getTime()
									? selection.start
									: selection.current;
							const end =
								selection.start.getTime() <= selection.current.getTime()
									? selection.current
									: selection.start;
							const top = getTimePositionFromDate(start);
							const bottom = getTimePositionFromDate(end);
							const height = Math.max(8, bottom - top);
							const startStr = getTimeFromDate(start);
							const endStr = getTimeFromDate(end);
							return (
								<div
									className="absolute left-1 right-1 rounded bg-primary/20 ring-1 ring-primary/40"
									style={{ top: `${top}px`, height: `${height}px` }}
								>
									<div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary/20 ring-1 ring-primary/40 text-primary text-[10px] font-medium tracking-wide">
										{startStr} – {endStr}
									</div>
								</div>
							);
						})()
					: null}
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

const AllDayEventsSection = (props: {
	accommodations: Accommodation[];
	weekDays: Date[];
	dayWidth: number;
	allDayScrollAreaRef: React.RefObject<HTMLDivElement | null>;
	sectionHeight: number;
}) => {
	const {
		accommodations,
		weekDays,
		dayWidth,
		allDayScrollAreaRef,
		sectionHeight,
	} = props;

	// Get accommodations for the visible days and layout them to avoid overlaps
	const accommodationsLayout = getAccommodationsLayoutWithRows(
		accommodations,
		weekDays,
	);

	return (
		<div
			className="absolute top-16 left-20 right-0 bg-muted/20 border-b z-15"
			style={{ height: `${sectionHeight}px` }}
		>
			<ScrollArea
				ref={allDayScrollAreaRef}
				className="h-full"
				enableThumb={false}
			>
				<div style={{ width: `${weekDays.length * dayWidth}px` }}>
					<div
						className="relative p-1"
						style={{ height: `${sectionHeight - 8}px` }}
					>
						{/* Grid lines to match main calendar */}
						<div
							className="absolute inset-0 grid border-r-0"
							style={{
								gridTemplateColumns: `repeat(${weekDays.length}, ${dayWidth}px)`,
							}}
						>
							{weekDays.map((date, index) => (
								<div
									key={date.toISOString()}
									className={`border-r ${index === weekDays.length - 1 ? "border-r-0" : ""} ${
										date.getDay() === 0 || date.getDay() === 6
											? "bg-muted/20"
											: ""
									}`}
								/>
							))}
						</div>

						{/* Accommodation bars */}
						{accommodationsLayout.map((acc) => (
							<AccommodationBar
								key={acc.id}
								accommodation={acc}
								dayWidth={dayWidth}
								weekDays={weekDays}
								row={acc.row}
							/>
						))}
					</div>
				</div>
			</ScrollArea>
		</div>
	);
};

// Accommodation Bar Component
const AccommodationBar = (props: {
	accommodation: Accommodation & { row?: number };
	dayWidth: number;
	weekDays: Date[];
	row: number;
}) => {
	const { accommodation, dayWidth, weekDays, row } = props;

	// Calculate position and width
	const startDay = weekDays.findIndex((day) => {
		const accStart = new Date(accommodation.startDate);
		const dayStart = new Date(day);
		accStart.setUTCHours(0, 0, 0, 0);
		dayStart.setUTCHours(0, 0, 0, 0);
		return accStart <= dayStart;
	});

	const endDay = weekDays.findIndex((day) => {
		const accEnd = new Date(accommodation.endDate);
		const dayEnd = new Date(day);
		accEnd.setUTCHours(23, 59, 59, 999);
		dayEnd.setUTCHours(23, 59, 59, 999);
		return accEnd <= dayEnd;
	});

	// If accommodation doesn't overlap with visible days, don't render
	if (startDay === -1 && endDay === -1) return null;

	const actualStartDay = Math.max(0, startDay === -1 ? 0 : startDay);
	const actualEndDay = endDay === -1 ? weekDays.length - 1 : endDay;
	const width = (actualEndDay - actualStartDay + 1) * dayWidth;
	const left = actualStartDay * dayWidth;

	const getAccommodationColor = (type: Accommodation["type"]) => {
		const colors = {
			hotel: "var(--chart-4)",
			hostel: "var(--chart-5)",
			airbnb: "var(--chart-1)",
			resort: "var(--chart-2)",
			other: "var(--chart-3)",
		};
		return colors[type];
	};

	return (
		<div
			className="absolute rounded-md px-2 text-white font-medium shadow-sm border border-white/20 cursor-pointer hover:shadow-md transition-shadow flex items-center"
			style={{
				left: `${left + 2}px`,
				width: `${width - 4}px`,
				top: `${row * 22 + 4}px`,
				height: "20px",
				backgroundColor: getAccommodationColor(accommodation.type),
				minWidth: "80px",
				lineHeight: "1.2",
			}}
			title={`${accommodation.name} (${accommodation.type}) - ${new Date(accommodation.startDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })} até ${new Date(accommodation.endDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`}
		>
			<div className="truncate text-xs">{accommodation.name}</div>
		</div>
	);
};

// Layout function for accommodations with row assignment
const getAccommodationsLayoutWithRows = (
	accommodations: Accommodation[],
	weekDays: Date[],
): (Accommodation & { row: number })[] => {
	if (!accommodations || accommodations.length === 0) return [];

	// Filter accommodations that overlap with visible days
	const validAccommodations = accommodations.filter((acc) => {
		const accStart = new Date(acc.startDate);
		const accEnd = new Date(acc.endDate);
		const firstDay = weekDays[0];
		const lastDay = weekDays[weekDays.length - 1];

		accStart.setUTCHours(0, 0, 0, 0);
		accEnd.setUTCHours(23, 59, 59, 999);

		return accStart <= lastDay && accEnd >= firstDay;
	});

	// Sort by start date
	validAccommodations.sort(
		(a, b) => a.startDate.getTime() - b.startDate.getTime(),
	);

	// Assign rows to avoid overlaps
	const rows: { endDate: Date }[] = [];
	const accommodationsWithRows = validAccommodations.map((acc) => {
		const accStart = new Date(acc.startDate);
		accStart.setUTCHours(0, 0, 0, 0);

		// Find the first row that doesn't have a conflict
		let assignedRow = 0;
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].endDate < accStart) {
				assignedRow = i;
				break;
			}
		}

		// If all rows have conflicts, create a new row
		if (assignedRow === 0 && rows.length > 0 && rows[0].endDate >= accStart) {
			assignedRow = rows.length;
		}

		// Update or add the row
		const accEnd = new Date(acc.endDate);
		accEnd.setUTCHours(23, 59, 59, 999);

		if (assignedRow >= rows.length) {
			rows.push({ endDate: accEnd });
		} else {
			rows[assignedRow].endDate = accEnd;
		}

		return {
			...acc,
			row: assignedRow,
		};
	});

	return accommodationsWithRows;
};
