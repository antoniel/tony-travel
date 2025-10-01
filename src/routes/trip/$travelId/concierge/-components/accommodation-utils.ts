import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const accommodationTypeLabels: Record<string, () => string> = {
	hotel: () => m["accommodation.type_hotel"](),
	hostel: () => m["accommodation.type_hostel"](),
	airbnb: () => m["accommodation.type_apartment"](),
	resort: () => m["accommodation.type_hotel"](),
	other: () => m["accommodation.type_other"](),
};

export const getAccommodationTypeLabel = (type: string) =>
	accommodationTypeLabels[type]?.() ?? type;

export const formatDateRange = (startISO: string, endISO: string) => {
	const start = formatDate(startISO);
	const end = formatDate(endISO);
	return m["concierge.tools.accommodation.date_range"]({ start, end });
};

export const formatDate = (date: Date | string) => {
	const locale = getLocale();
	const dateValue = typeof date === "string" ? new Date(date) : date;
	return dateValue.toLocaleDateString(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};
