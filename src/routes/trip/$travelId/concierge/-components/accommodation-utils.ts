export const accommodationTypeLabels: Record<string, string> = {
	hotel: "Hotel",
	hostel: "Hostel",
	airbnb: "Airbnb",
	resort: "Resort",
	other: "Outro",
};

export const getAccommodationTypeLabel = (type: string) =>
	accommodationTypeLabels[type] ?? type;

export const formatDateRange = (startISO: string, endISO: string) => {
	const start = new Date(startISO);
	const end = new Date(endISO);
	return `${formatDate(start)} até ${formatDate(end)}`;
};

export const formatDate = (date: Date | string) => {
	const dateValue = typeof date === "string" ? new Date(date) : date;
	return dateValue.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};
