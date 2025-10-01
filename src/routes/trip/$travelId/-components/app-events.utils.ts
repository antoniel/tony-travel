import type { Accommodation, AppEvent } from "@/lib/types";

export const PX_PER_HOUR = 48;

export const toUtcMidnight = (d: Date) =>
	new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
	);

export const toUtcEndOfDay = (d: Date) =>
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

export const isSameUTCDate = (a: Date, b: Date) =>
	a.getUTCFullYear() === b.getUTCFullYear() &&
	a.getUTCMonth() === b.getUTCMonth() &&
	a.getUTCDate() === b.getUTCDate();

export const toLocalStartOfDay = (d: Date) =>
	new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);

export const addDaysUtc = (base: Date, days: number) => {
	const copy = new Date(base);
	copy.setUTCDate(copy.getUTCDate() + days);
	return copy;
};

export interface DisplayEvent extends AppEvent {
	originalStartDate?: Date;
	originalEndDate?: Date;
	displayStartDate?: Date;
	displayEndDate?: Date;
}

export const getWeekDays = (events: AppEvent[]) => {
	const [firstEvent] = events.sort((a, b) => {
		const aTime = a?.startDate?.getTime();
		const bTime = b?.startDate?.getTime();
		return aTime - bTime;
	});
	const startOfWeek = new Date(firstEvent?.startDate ?? new Date());
	startOfWeek.setHours(0, 0, 0, 0);

	const weekDays = [];

	for (let i = 0; i < 7; i++) {
		const date = new Date(startOfWeek);
		date.setDate(startOfWeek.getDate() + i);
		weekDays.push(date);
	}
	return weekDays;
};

export const getEventsForDate = (
	events: AppEvent[],
	date: Date,
): DisplayEvent[] => {
	const targetDay = new Date(date);
	targetDay.setHours(0, 0, 0, 0);
	const nextDay = new Date(targetDay);
	nextDay.setDate(targetDay.getDate() + 1);

	return events
		.filter((event) => {
			const eventStart = new Date(event.startDate);
			const eventEnd = new Date(event.endDate);

			return eventStart < nextDay && eventEnd > targetDay;
		})
		.map((event) => ({
			...event,
			originalStartDate: event.startDate,
			originalEndDate: event.endDate,
		}));
};

export const getTimePositionFromDate = (date: Date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();

	if (hours === 0 && minutes === 0) return 0;

	const startHour = 0;
	if (hours < startHour) return 0;

	const hourPosition = (hours - startHour) * PX_PER_HOUR;
	const minutePosition = (minutes / 60) * PX_PER_HOUR;

	return hourPosition + minutePosition;
};

export const getTimeFromDate = (date: Date) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();

	const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
	const amPm = hours >= 12 ? "p" : "a";
	const minuteStr =
		minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";

	return `${displayHour}${minuteStr}${amPm}`;
};

// Generic event interface for layout calculations
interface LayoutEvent {
	id: string;
	startDate: Date;
	endDate: Date;
}

export const getEventLayout = (events: AppEvent[]) => {
	// Convert AppEvents to LayoutEvents and use unified layout function
	const layoutEvents: LayoutEvent[] = events.map(event => ({
		id: event.id,
		startDate: event.startDate,
		endDate: event.endDate,
	}));
	
	return getUnifiedEventLayout(layoutEvents);
};

/**
 * Unified layout function that handles collision detection for any event type
 * (regular events, flight events, or mixed)
 */
export const getUnifiedEventLayout = (events: LayoutEvent[]) => {
	const sortedEvents = [...events].sort((a, b) => {
		const startDiff = a.startDate.getTime() - b.startDate.getTime();
		if (startDiff !== 0) return startDiff;
		return a.endDate.getTime() - b.endDate.getTime();
	});

	const eventLayouts = new Map<
		string,
		{ column: number; totalColumns: number; width: number; left: number }
	>();
	const columns: LayoutEvent[][] = [];

	for (const event of sortedEvents) {
		let assignedColumn = -1;

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

		if (assignedColumn === -1) {
			assignedColumn = columns.length;
			columns.push([]);
		}

		columns[assignedColumn].push(event);
	}

	const processedEvents = new Set<string>();

	for (const event of sortedEvents) {
		if (processedEvents.has(event.id)) continue;

		const overlappingEvents = [event];
		const eventStart = event.startDate;
		const eventEnd = event.endDate;

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

export const getEventColor = (event: AppEvent) => {
	const typeColors = {
		travel: "var(--chart-1)",
		food: "var(--chart-3)",
		activity: "var(--chart-2)",
	};

	return typeColors[event.type];
};

export const getAccommodationsLayoutWithRows = (
	accommodations: Accommodation[],
	weekDays: Date[],
): (Accommodation & { row: number })[] => {
	if (!accommodations || accommodations.length === 0) return [];

	const validAccommodations = accommodations.filter((acc) => {
		const accStart = new Date(acc.startDate);
		const accEnd = new Date(acc.endDate);
		const firstDay = weekDays[0];
		const lastDay = weekDays[weekDays.length - 1];

		accStart.setUTCHours(0, 0, 0, 0);
		accEnd.setUTCHours(23, 59, 59, 999);

		return accStart <= lastDay && accEnd >= firstDay;
	});

	validAccommodations.sort(
		(a, b) => a.startDate.getTime() - b.startDate.getTime(),
	);

	const rows: { endDate: Date }[] = [];
	const accommodationsWithRows = validAccommodations.map((acc) => {
		const accStart = new Date(acc.startDate);
		accStart.setUTCHours(0, 0, 0, 0);

		let assignedRow = 0;
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].endDate < accStart) {
				assignedRow = i;
				break;
			}
		}

		if (assignedRow === 0 && rows.length > 0 && rows[0].endDate >= accStart) {
			assignedRow = rows.length;
		}

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
