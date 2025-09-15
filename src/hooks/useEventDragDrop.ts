import type { AppEvent } from "@/lib/types";
import { useState } from "react";

interface DisplayEvent extends AppEvent {
	originalStartDate?: Date;
	originalEndDate?: Date;
	displayStartDate?: Date;
	displayEndDate?: Date;
}

interface DragState {
	event: DisplayEvent;
	dayIndex: number;
	offsetY: number;
	isDragging: boolean;
	isResizing: boolean;
	resizeDirection?: "top" | "bottom";
	startX: number;
	startY: number;
	hasMoved: boolean;
	/**
	 * This stores the height of the event in the other day in
	 * case the current event is overflowed to the other day
	 */
	overflowHeight?: number;
}

interface UseEventDragDropProps {
	dayWidth: number;
	weekDays: Date[];
	onUpdateEvent?: (eventId: string, updatedEvent: Partial<AppEvent>) => void;
	restrictNonTravelDays?: boolean;
	isDayWithin?: (date: Date) => boolean;
}
let mutDraggingEvent: DragState | null = null;

export function useEventDragDrop({
  dayWidth,
  weekDays,
  onUpdateEvent,
  restrictNonTravelDays,
  isDayWithin,
}: UseEventDragDropProps) {
	const [draggingEvent, setDraggingEvent] = useState<DragState | null>(null);

	if (JSON.stringify(draggingEvent) !== JSON.stringify(mutDraggingEvent)) {
		console.log("DRAGGING_EVENT", draggingEvent);
		mutDraggingEvent = draggingEvent;
	}

	const handleEventMouseDown = (
		event: DisplayEvent,
		dayIndex: number,
		mouseEvent: React.MouseEvent,
		resizeDirection?: "top" | "bottom",
	) => {
		if (!onUpdateEvent) return;

		const eventHeight = getEventDurationInHours(event.startDate, event.endDate);
		const eventHeightInPixels = eventHeight * 48;

		mouseEvent.stopPropagation();
		mouseEvent.preventDefault();

		const rect = (
			mouseEvent.currentTarget as HTMLElement
		).getBoundingClientRect();
		const offsetY = mouseEvent.clientY - rect.top;
		const dayEventHeight = rect.height;
		const overflowHeight = eventHeightInPixels - dayEventHeight;

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
			overflowHeight,
		});
	};

	const handleMouseMove = (mouseEvent: React.MouseEvent) => {
		if (!draggingEvent || !onUpdateEvent) return;

		// Check if we've moved enough to consider it a drag (threshold of 5px)
		const deltaX = Math.abs(mouseEvent.clientX - draggingEvent.startX);
		const deltaY = Math.abs(mouseEvent.clientY - draggingEvent.startY);
		const hasMoved = deltaX > 5 || deltaY > 5;

		// Update the hasMoved flag
		if (hasMoved && !draggingEvent.hasMoved) {
			setDraggingEvent((prev) => (prev ? { ...prev, hasMoved: true } : null));
		}

		if (!hasMoved) return; // Don't do anything until we've moved enough

		const contentArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;
		if (!contentArea) return;

		const rect = contentArea.getBoundingClientRect();
		const yPosition = mouseEvent.clientY - rect.top + contentArea.scrollTop;

		if (draggingEvent.isDragging) {
			const totalMinutes = getTotalMinutes(yPosition, draggingEvent.offsetY);
			const normalizedTotalMinutes =
				totalMinutes >= 0
					? totalMinutes - (draggingEvent.overflowHeight || 0)
					: totalMinutes - (draggingEvent.overflowHeight || 0);

			handleEventDrag(mouseEvent, contentArea, rect, normalizedTotalMinutes);
		} else if (draggingEvent.isResizing) {
			handleEventResize(yPosition);
		}
	};

	const handleEventDrag = (
		mouseEvent: React.MouseEvent,
		contentArea: HTMLElement,
		rect: DOMRect,
		totalMinutes: number,
	) => {
		if (!draggingEvent || !onUpdateEvent) return;

		// Handle overflow across days
		let dayOffset = 0;
		let finalMinutes = totalMinutes;

		if (totalMinutes < 0) {
			// Overflow to previous day(s)
			dayOffset = Math.floor(totalMinutes / (24 * 60));
			finalMinutes = totalMinutes - dayOffset * 24 * 60;
		} else if (totalMinutes >= 24 * 60) {
			// Overflow to next day(s)
			dayOffset = Math.floor(totalMinutes / (24 * 60));
			finalMinutes = totalMinutes % (24 * 60);
		}

		// Convert back to hours and minutes
		const newHour = Math.floor(finalMinutes / 60);
		const newMinute = Math.floor(finalMinutes % 60);

		// Calculate which day column we're in
		const xPosition = mouseEvent.clientX - rect.left + contentArea.scrollLeft;
		const baseDayIndex = Math.floor(xPosition / dayWidth);
		const finalDayIndex = baseDayIndex + dayOffset; // Add vertical overflow

		// Calculate target day dynamically to allow movement beyond visible range
		let targetDay: Date;
		if (finalDayIndex >= 0 && finalDayIndex < weekDays.length) {
			targetDay = weekDays[finalDayIndex];
		} else {
			// For days outside the visible range, calculate dynamically
			const firstDay = weekDays[0];
			targetDay = new Date(firstDay);
			targetDay.setDate(firstDay.getDate() + finalDayIndex);
		}

		if (targetDay) {
			// Prevent dragging into disabled days when restricting
			if (restrictNonTravelDays && isDayWithin && !isDayWithin(targetDay)) {
				return;
			}
			// Use original event duration, not the truncated display duration
			const originalEvent = draggingEvent.event;
			const originalDuration =
				(originalEvent.originalEndDate || originalEvent.endDate).getTime() -
				(originalEvent.originalStartDate || originalEvent.startDate).getTime();

			const newStartDate = new Date(targetDay);
			newStartDate.setHours(newHour, newMinute, 0, 0);

			const newEndDate = new Date(newStartDate.getTime() + originalDuration);

			onUpdateEvent(draggingEvent.event.id, {
				startDate: newStartDate,
				endDate: newEndDate,
			});
		}
	};

  const handleEventResize = (yPosition: number) => {
    if (!draggingEvent || !onUpdateEvent) return;

		// Handle resizing
		const newHour = Math.max(0, Math.floor(yPosition / 48));
		const newMinute = Math.floor(((yPosition % 48) / 48) * 60);

    const targetDay = weekDays[draggingEvent.dayIndex];
    if (targetDay) {
      // Prevent resizing on disabled days when restricting
      if (restrictNonTravelDays && isDayWithin && !isDayWithin(targetDay)) {
        return;
      }
      const newTime = new Date(targetDay);
      newTime.setHours(newHour, newMinute, 0, 0);

      const originalEvent = draggingEvent.event;
      const originalStart =
        originalEvent.originalStartDate || originalEvent.startDate;
      const originalEnd =
        originalEvent.originalEndDate || originalEvent.endDate;

      if (draggingEvent.resizeDirection === "top") {
        // Resizing from top (changing start time)
        if (newTime.getTime() < originalEnd.getTime()) {
          onUpdateEvent(draggingEvent.event.id, {
            startDate: newTime,
            endDate: originalEnd,
          });
        }
      } else {
        // Resizing from bottom (changing end time)
        if (newTime.getTime() > originalStart.getTime()) {
          onUpdateEvent(draggingEvent.event.id, {
            startDate: originalStart,
            endDate: newTime,
          });
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

	return {
		draggingEvent,
		handleEventMouseDown,
		handleMouseMove,
		handleMouseUp,
	};
}

function getTotalMinutes(yPosition: number, offsetY: number) {
	const adjustedY = yPosition - offsetY;
	const totalMinutes = (adjustedY / 48) * 60; // 48px per hour = 0.8px per minute
	return totalMinutes;
}

const getEventDurationInHours = (startDate: Date, endDate: Date) => {
	const diffInMs = endDate.getTime() - startDate.getTime();
	const diffInHours = diffInMs / (1000 * 60 * 60);
	return diffInHours;
};
