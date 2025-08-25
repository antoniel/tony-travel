import { type RefObject, useEffect } from "react";

interface UseScrollSyncProps {
	headerScrollAreaRef: RefObject<HTMLDivElement | null>;
	timeRulerRef: RefObject<HTMLDivElement | null>;
	allDayScrollAreaRef?: RefObject<HTMLDivElement | null>;
	dayWidth: number;
	currentDate: Date;
}

export function useScrollSync({
	headerScrollAreaRef,
	timeRulerRef,
	allDayScrollAreaRef,
	dayWidth,
	currentDate,
}: UseScrollSyncProps) {
	const centerWeekStart = 14;

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const headerScrollArea = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const contentScrollArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const allDayScrollArea = allDayScrollAreaRef?.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;

		if (!headerScrollArea || !contentScrollArea) return;

		const centerPosition = centerWeekStart * dayWidth;
		headerScrollArea.scrollLeft = centerPosition;
		contentScrollArea.scrollLeft = centerPosition;
		if (allDayScrollArea) {
			allDayScrollArea.scrollLeft = centerPosition;
		}

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

		const cleanupHeaderToContent = syncHorizontalScroll(
			headerScrollArea,
			contentScrollArea,
		);
		const cleanupContentToHeader = syncHorizontalScroll(
			contentScrollArea,
			headerScrollArea,
		);

		let cleanupHeaderToAllDay: (() => void) | undefined;
		let cleanupAllDayToHeader: (() => void) | undefined;
		let cleanupContentToAllDay: (() => void) | undefined;
		let cleanupAllDayToContent: (() => void) | undefined;

		if (allDayScrollArea) {
			cleanupHeaderToAllDay = syncHorizontalScroll(
				headerScrollArea,
				allDayScrollArea,
			);
			cleanupAllDayToHeader = syncHorizontalScroll(
				allDayScrollArea,
				headerScrollArea,
			);
			cleanupContentToAllDay = syncHorizontalScroll(
				contentScrollArea,
				allDayScrollArea,
			);
			cleanupAllDayToContent = syncHorizontalScroll(
				allDayScrollArea,
				contentScrollArea,
			);
		}

		const cleanupVerticalSync = syncVerticalScroll(
			contentScrollArea,
			timeRulerScrollArea,
		);

		return () => {
			cleanupHeaderToContent();
			cleanupContentToHeader();
			cleanupHeaderToAllDay?.();
			cleanupAllDayToHeader?.();
			cleanupContentToAllDay?.();
			cleanupAllDayToContent?.();
			cleanupVerticalSync?.();
		};
	}, [currentDate]);

	const handleWheel = (e: React.WheelEvent) => {
		const headerScrollArea = headerScrollAreaRef.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const contentScrollArea = document.querySelector(
			".content-scroll-area [data-radix-scroll-area-viewport]",
		) as HTMLElement;
		const allDayScrollArea = allDayScrollAreaRef?.current?.querySelector(
			"[data-radix-scroll-area-viewport]",
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
			if (allDayScrollArea) {
				allDayScrollArea.scrollLeft += scrollAmount;
			}
		}
	};

	return { handleWheel };
}
