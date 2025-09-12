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
		);
	}

	if (startDate < travelStartDate) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_DATES_INVALID",
			"Check-in não pode ser anterior ao início da viagem",
		);
	}

	if (endDate > travelEndDate) {
		return AppResult.failure(
			accommodationErrors,
			"ACCOMMODATION_DATES_INVALID",
			"Check-out não pode ser posterior ao fim da viagem",
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

export async function checkAccommodationOverlap(
	accommodationDAO: AccommodationDAO,
	travelId: string,
	newStartDate: Date,
	newEndDate: Date,
	excludeId?: string,
): Promise<{ hasOverlap: boolean; conflictingAccommodation?: Accommodation }> {
	const existingAccommodations =
		await accommodationDAO.getAccommodationsByTravel(travelId);

	const conflicting = existingAccommodations.find((acc) => {
		if (excludeId && acc.id === excludeId) return false;

		const accStart = new Date(acc.startDate);
		const accEnd = new Date(acc.endDate);

		return (
			(newStartDate >= accStart && newStartDate < accEnd) ||
			(newEndDate > accStart && newEndDate <= accEnd) ||
			(newStartDate <= accStart && newEndDate >= accEnd)
		);
	});

	return {
		hasOverlap: !!conflicting,
		conflictingAccommodation: conflicting,
	};
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

	const overlapCheck = await checkAccommodationOverlap(
		accommodationDAO,
		travelId,
		new Date(accommodation.startDate),
		new Date(accommodation.endDate),
	);

	if (overlapCheck.hasOverlap) {
		return AppResult.success({
			id: "",
			hasOverlap: true,
			conflictingAccommodation: overlapCheck.conflictingAccommodation || null,
			validationError: "Existe conflito com uma acomodação existente",
		});
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
		hasOverlap: boolean;
		conflictingAccommodation: Accommodation | null;
		validationError: string | null;
	}>
> {
	const currentAccommodation = await accommodationDAO.getAccommodationById(id);
	if (!currentAccommodation) {
		return AppResult.success({
			success: false,
			hasOverlap: false,
			conflictingAccommodation: null,
			validationError: "Acomodação não encontrada",
		});
	}

	if (accommodation.startDate || accommodation.endDate) {
		const newStartDate = accommodation.startDate
			? new Date(accommodation.startDate)
			: new Date(currentAccommodation.startDate);
		const newEndDate = accommodation.endDate
			? new Date(accommodation.endDate)
			: new Date(currentAccommodation.endDate);

		const overlapCheck = await checkAccommodationOverlap(
			accommodationDAO,
			currentAccommodation.travelId,
			newStartDate,
			newEndDate,
			id,
		);

		if (overlapCheck.hasOverlap) {
			return AppResult.success({
				success: false,
				hasOverlap: true,
				conflictingAccommodation: overlapCheck.conflictingAccommodation || null,
				validationError: "Existe conflito com uma acomodação existente",
			});
		}
	}

	await accommodationDAO.updateAccommodation(id, accommodation);

	return AppResult.success({
		success: true,
		hasOverlap: false,
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
