// Utilities for pt-BR currency formatting and input masking

export function formatCurrencyBRL(amount: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(amount) ? amount : 0);
}

export function formatNumberPtBR(n: number): string {
	return new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(n) ? n : 0);
}

export function formatDecimalStringPtBR(
	value: string | number | null | undefined,
): string {
	if (value === null || value === undefined || value === "") return "";
	const numeric = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numeric)) return "";
	return formatNumberPtBR(numeric);
}

export function normalizeCurrencyInputPtBR(raw: string): {
	display: string;
	decimal: string;
	numeric: number | null;
} {
	if (!raw) {
		return { display: "", decimal: "", numeric: null };
	}
	const digits = raw.replace(/\D/g, "");
	if (!digits) {
		return { display: "", decimal: "", numeric: null };
	}
	const cents = Number.parseInt(digits, 10);
	if (!Number.isFinite(cents)) {
		return { display: "", decimal: "", numeric: null };
	}
	const numeric = cents / 100;
	return {
		display: formatNumberPtBR(numeric),
		decimal: numeric.toFixed(2),
		numeric,
	};
}

// Given raw user input, return display string (e.g. "1.234,56") and numeric value (e.g. 1234.56)
export function maskCurrencyInputPtBR(raw: string): {
	display: string;
	numeric: number | null;
} {
	const { display, numeric } = normalizeCurrencyInputPtBR(raw);
	return { display, numeric };
}

export function parsePtBRCurrencyToNumber(raw: string): number | null {
	if (!raw) return null;
	// Remove currency symbols and spaces, then replace decimal comma with dot, strip thousand separators
	const normalized = raw
		.replace(/[^0-9.,]/g, "")
		.replaceAll(".", "")
		.replace(",", ".");
	const n = Number.parseFloat(normalized);
	return Number.isFinite(n) ? n : null;
}
