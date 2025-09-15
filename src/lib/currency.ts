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

// Given raw user input, return display string (e.g. "1.234,56") and numeric value (e.g. 1234.56)
export function maskCurrencyInputPtBR(raw: string): {
	display: string;
	numeric: number | null;
} {
	if (!raw) return { display: "", numeric: null };
	// Keep only digits
	const digits = raw.replace(/\D/g, "");
	if (!digits) return { display: "", numeric: null };
	// Interpret as cents
	const cents = Number.parseInt(digits, 10);
	if (!Number.isFinite(cents)) return { display: "", numeric: null };
	const numeric = cents / 100;
	return { display: formatNumberPtBR(numeric), numeric };
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
