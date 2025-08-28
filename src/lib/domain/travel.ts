import type { AppEvent, TravelWithRelations } from "../types";

/**
 * Calculate the total cost of an event including all its dependencies recursively
 */
export function calculateEventTotalCost(
	event: AppEvent,
	dependencies: AppEvent[] | undefined,
): number {
	const baseCost =
		typeof event.estimatedCost === "number" ? event.estimatedCost : 0;

	const dependenciesCosts =
		dependencies?.reduce((acc, dependency) => {
			const dependencyCost = calculateEventTotalCost(dependency, undefined);
			return acc + dependencyCost;
		}, 0) ?? 0;

	return baseCost + dependenciesCosts;
}

/**
 * Calculate the total cost of all events in a travel
 */
export function calculateTravelTotalCost(
	travel: TravelWithRelations | undefined,
): number {
	if (!travel) return 0;

	return travel.events.reduce(
		(acc, event) => acc + calculateEventTotalCost(event, event.dependencies),
		0,
	);
}

/**
 * Calculate the number of days in a travel
 */
export function calculateTravelDays(
	travel: TravelWithRelations | undefined,
): number {
	if (!travel) return 0;

	const timeDiff = travel.endDate.getTime() - travel.startDate.getTime();
	return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

/**
 * Get travel statistics
 */
export function getTravelStatistics(travel: TravelWithRelations | null) {
	if (!travel) {
		return {
			totalDays: 0,
			totalEvents: 0,
			totalCost: 0,
		};
	}

	return {
		totalDays: calculateTravelDays(travel),
		totalEvents: travel.events.length,
		totalCost: calculateTravelTotalCost(travel),
	};
}

/**
 * Format a number as Brazilian Real (BRL) currency
 */
export function formatBRL(value: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);
}

/**
 * Format a date in Brazilian format (dd/mm/yyyy)
 */
export function formatDateBR(date: Date): string {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}
