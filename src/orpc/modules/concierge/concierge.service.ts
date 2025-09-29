import type { Accommodation } from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { FlightDAO } from "../flight/flight.dao";
import type { TravelDAO } from "../travel/travel.dao";
import { conciergeErrors } from "./concierge.errors";
import type { PendingIssue, PendingIssuesSummary } from "./concierge.model";

const DATE_RANGE_MAX = 366;

export async function getPendingIssuesService(
	travelDAO: TravelDAO,
	flightDAO: FlightDAO,
	travelId: string,
): Promise<AppResult<PendingIssuesSummary, typeof conciergeErrors>> {
	try {
		const travel = await travelDAO.getTravelById(travelId);
		if (!travel) {
			return AppResult.failure(
				conciergeErrors,
				"TRAVEL_NOT_FOUND",
				"Viagem não encontrada",
				{ travelId },
			);
		}

		const flights = await flightDAO.getFlightsByTravel(travelId);

		const issues: PendingIssue[] = [];
		const members = travel.members ?? [];

		const flightParticipantIds = new Set<string>();
		for (const flight of flights) {
			for (const participant of flight.participants) {
				flightParticipantIds.add(participant.userId);
			}
		}

		const membersMissingFlights = members.filter(
			(member) => !flightParticipantIds.has(member.userId),
		);

		if (membersMissingFlights.length > 0) {
			const travelerNames = membersMissingFlights
				.map((member) => member.user?.name ?? "Viajante")
				.sort((a, b) => a.localeCompare(b, "pt-BR"));
			const travelerSummaries = membersMissingFlights.map((member) => ({
				id: member.userId,
				name: member.user?.name ?? "Viajante",
			}));
			issues.push({
				id: "flight-missing",
				type: "flight",
				severity: "critical",
				title: "Viajantes sem voos cadastrados",
				description:
					travelerNames.length === 1
						? `${travelerNames[0]} ainda não tem voo registrado.`
						: `${travelerNames.length} pessoas estão sem voo: ${travelerNames.join(", ")}.`,
				affectedTravelers: travelerSummaries,
				missingCount: membersMissingFlights.length,
				action: {
					type: "navigate",
					label: "Ir para voos",
					path: `/trip/${travelId}/flights`,
				},
				gapRanges: [],
			});
		}

		const accommodationIssues = calculateAccommodationGaps(
			travelId,
			travel.accommodations,
			travel.startDate,
			travel.endDate,
		);
		issues.push(...accommodationIssues);

		if ((travel.events?.length ?? 0) === 0) {
			issues.push({
				id: "event-empty",
				type: "event",
				severity: "advisory",
				title: "Itinerário sem eventos",
				description: "Sugira atividades para enriquecer a viagem.",
				affectedTravelers: [],
				missingCount: 1,
				action: {
					type: "navigate",
					label: "Adicionar eventos",
					path: `/trip/${travelId}`,
				},
				gapRanges: [],
			});
		}

		const sortedIssues = issues.sort((a, b) => {
			const priority = (issue: PendingIssue) =>
				issue.severity === "critical" ? 0 : 1;
			const typePriority = (issue: PendingIssue) => {
				switch (issue.type) {
					case "flight":
						return 0;
					case "accommodation":
						return 1;
					case "event":
						return 2;
					default:
						return 2;
				}
			};
			return (
				priority(a) - priority(b) ||
				typePriority(a) - typePriority(b) ||
				a.title.localeCompare(b.title, "pt-BR")
			);
		});

		const criticalCount = sortedIssues.filter(
			(issue) => issue.severity === "critical",
		).length;
		const advisoryCount = sortedIssues.length - criticalCount;

		return AppResult.success({
			issues: sortedIssues,
			criticalCount,
			advisoryCount,
			hasCritical: criticalCount > 0,
			hasIssues: sortedIssues.length > 0,
		});
	} catch (error) {
		return AppResult.failure(
			conciergeErrors,
			"PENDING_ANALYSIS_FAILED",
			"Não foi possível analisar pendências da viagem",
			{ travelId },
		);
	}
}

function calculateAccommodationGaps(
	travelId: string,
	accommodations: Accommodation[] | undefined,
	startDate: Date,
	endDate: Date,
): PendingIssue[] {
	if (!startDate || !endDate) {
		return [];
	}

	const tripNights = enumerateNights(startDate, endDate);
	if (tripNights.length === 0) {
		return [];
	}

	const coveredNights = new Set<string>();

	for (const accommodation of accommodations ?? []) {
		const stayNights = enumerateNights(
			accommodation.startDate,
			accommodation.endDate,
		);
		for (const night of stayNights) {
			coveredNights.add(night);
		}
	}

	const uncovered = tripNights.filter((night) => !coveredNights.has(night));
	if (uncovered.length === 0) {
		return [];
	}

	const ranges = toContinuousRanges(uncovered);
	const formattedRanges = ranges.map(({ start, end }) => ({
		start,
		end,
	}));

	const rangeSummary = formattedRanges
		.map(({ start, end }) => formatRangeLabel(start, end))
		.join("; ");

	return [
		{
			id: "accommodation-gaps",
			type: "accommodation",
			severity: "critical",
			title: "Datas sem acomodação",
			description: `Existem noites sem hospedagem: ${rangeSummary}.`,
			affectedTravelers: [],
			missingCount: uncovered.length,
			action: {
				type: "navigate",
				label: "Completar acomodações",
				path: `/trip/${travelId}/accommodations`,
			},
			gapRanges: formattedRanges,
		},
	];
}

function enumerateNights(start: Date, end: Date): string[] {
	const startUtc = startOfUTC(start);
	const endUtc = startOfUTC(end);
	const nights: string[] = [];
	let cursor = startUtc;
	let safety = 0;
	while (cursor < endUtc && safety < DATE_RANGE_MAX) {
		nights.push(toISODate(cursor));
		cursor = addDays(cursor, 1);
		safety++;
	}
	return nights;
}

function toContinuousRanges(dates: string[]): { start: string; end: string }[] {
	if (dates.length === 0) {
		return [];
	}
	const sorted = [...dates].sort();
	const ranges: { start: string; end: string }[] = [];
	let rangeStart = sorted[0];
	let previous = sorted[0];

	for (let i = 1; i < sorted.length; i++) {
		const current = sorted[i];
		const expectedNext = toISODate(
			addDays(new Date(`${previous}T00:00:00Z`), 1),
		);
		if (current !== expectedNext) {
			ranges.push({ start: rangeStart, end: previous });
			rangeStart = current;
		}
		previous = current;
	}

	ranges.push({ start: rangeStart, end: previous });
	return ranges;
}

function formatRangeLabel(start: string, end: string): string {
	const startDate = new Date(`${start}T00:00:00Z`);
	const endDate = new Date(`${end}T00:00:00Z`);
	if (start === end) {
		return format(startDate, "d MMM", { locale: ptBR });
	}
	return `${format(startDate, "d MMM", { locale: ptBR })} - ${format(endDate, "d MMM", { locale: ptBR })}`;
}

function startOfUTC(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

function addDays(date: Date, amount: number): Date {
	const next = new Date(date);
	next.setUTCDate(next.getUTCDate() + amount);
	return next;
}

function toISODate(date: Date): string {
	return date.toISOString().slice(0, 10);
}
