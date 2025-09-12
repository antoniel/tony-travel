import type { Accommodation, InsertAccommodationSchema } from "@/lib/db/schema";
import { AppResult } from "@/orpc/appResult";
import type * as z from "zod";
import type { TravelDAO } from "../travel/travel.dao";
import type { AccommodationDAO } from "./accommodation.dao";
import { accommodationErrors } from "./accommodation.errors";

export function validateAccommodationDates(
	startDate: Date,
	endDate: Date,
	travelStartDate: Date,
	travelEndDate: Date,
) {
	if (startDate >= endDate) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_DATES_INVALID",
			"Data de check-in deve ser anterior à data de check-out",
			{
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				travelStartDate: travelStartDate.toISOString(),
				travelEndDate: travelEndDate.toISOString(),
			},
		);
	}

	if (startDate < travelStartDate) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_DATES_INVALID",
			"Check-in não pode ser anterior ao início da viagem",
			{
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				travelStartDate: travelStartDate.toISOString(),
				travelEndDate: travelEndDate.toISOString(),
			},
		);
	}

	if (endDate > travelEndDate) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_DATES_INVALID",
			"Check-out não pode ser posterior ao fim da viagem",
			{
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				travelStartDate: travelStartDate.toISOString(),
				travelEndDate: travelEndDate.toISOString(),
			},
		);
	}
	return AppResult.success(true);
}

export function calculateAccommodationDuration(
	startDate: Date,
	endDate: Date,
): number {
	const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export async function createAccommodationService(
	accommodationDAO: AccommodationDAO,
	travelDAO: TravelDAO,
	travelId: string,
	accommodation: Omit<z.infer<typeof InsertAccommodationSchema>, "travelId">,
): Promise<
	AppResult<{
		id: string;
		hasOverlap: boolean;
		conflictingAccommodation: Accommodation | null;
		validationError: string | null;
	}>
> {
	const travel = await travelDAO.getTravelById(travelId);
	if (!travel) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_NOT_FOUND",
			"Viagem não encontrada",
		);
	}

	const validation = validateAccommodationDates(
		new Date(accommodation.startDate),
		new Date(accommodation.endDate),
		new Date(travel.startDate),
		new Date(travel.endDate),
	);

	if (AppResult.isFailure(validation)) {
		return validation;
	}

	const accommodationData = {
		...accommodation,
		travelId,
	};
	const id = await accommodationDAO.createAccommodation(accommodationData);

	return AppResult.success({
		id,
		hasOverlap: false,
		conflictingAccommodation: null,
		validationError: null,
	});
}

export async function updateAccommodationService(
	accommodationDAO: AccommodationDAO,
	id: string,
	accommodation: Partial<z.infer<typeof InsertAccommodationSchema>>,
): Promise<
	AppResult<{
		success: boolean;
		conflictingAccommodation: Accommodation | null;
		validationError: string | null;
	}>
> {
	const currentAccommodation = await accommodationDAO.getAccommodationById(id);
	if (!currentAccommodation) {
		return AppResult.success({
			success: false,
			conflictingAccommodation: null,
			validationError: "Acomodação não encontrada",
		});
	}

	await accommodationDAO.updateAccommodation(id, accommodation);

	return AppResult.success({
		success: true,
		conflictingAccommodation: null,
		validationError: null,
	});
}

export async function suggestAccommodationDates(
	accommodationDAO: AccommodationDAO,
	travelDAO: TravelDAO,
	travelId: string,
): Promise<AppResult<{ startDate: Date; endDate: Date } | null>> {
	const travel = await travelDAO.getTravelById(travelId);
	if (!travel) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_NOT_FOUND",
			"Viagem não encontrada",
		);
	}

	const travelStartDate = new Date(travel.startDate);
	const travelEndDate = new Date(travel.endDate);

	const existingAccommodations =
		await accommodationDAO.getAccommodationsByTravel(travelId);

	if (existingAccommodations.length === 0) {
		return AppResult.success({
			startDate: travelStartDate,
			endDate: travelEndDate,
		});
	}

	const sortedAccommodations = [...existingAccommodations].sort(
		(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
	);

	const firstAccommodation = sortedAccommodations[0];
	const lastAccommodation =
		sortedAccommodations[sortedAccommodations.length - 1];

	const firstStart = new Date(firstAccommodation.startDate);
	const lastEnd = new Date(lastAccommodation.endDate);

	// Check gap before first accommodation
	if (travelStartDate < firstStart) {
		const gapDays = Math.ceil(
			(firstStart.getTime() - travelStartDate.getTime()) /
				(1000 * 60 * 60 * 24),
		);
		if (gapDays >= 1) {
			return AppResult.success({
				startDate: travelStartDate,
				endDate: new Date(firstStart.getTime() - 24 * 60 * 60 * 1000),
			});
		}
	}

	// Check gap after last accommodation
	if (lastEnd < travelEndDate) {
		const gapDays = Math.ceil(
			(travelEndDate.getTime() - lastEnd.getTime()) / (1000 * 60 * 60 * 24),
		);
		if (gapDays >= 1) {
			return AppResult.success({
				startDate: new Date(lastEnd.getTime() + 24 * 60 * 60 * 1000),
				endDate: travelEndDate,
			});
		}
	}

	// Check gaps between accommodations
	for (let i = 0; i < sortedAccommodations.length - 1; i++) {
		const currentEnd = new Date(sortedAccommodations[i].endDate);
		const nextStart = new Date(sortedAccommodations[i + 1].startDate);

		const gapDays = Math.ceil(
			(nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (gapDays >= 2) {
			return AppResult.success({
				startDate: new Date(currentEnd.getTime() + 24 * 60 * 60 * 1000),
				endDate: new Date(nextStart.getTime() - 24 * 60 * 60 * 1000),
			});
		}
	}

	return AppResult.success(null);
}
