import type { Locale } from "date-fns";
import { format as dateFnsFormat, formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import type { Language } from "./types";

const DATE_FNS_LOCALES: Record<Language, Locale> = {
	"pt-BR": ptBR,
	en: enUS,
};

/**
 * Formats a date according to the locale
 */
export function formatDate(
	date: Date,
	formatStr: string,
	language: Language,
): string {
	const locale = DATE_FNS_LOCALES[language];
	return dateFnsFormat(date, formatStr, { locale });
}

/**
 * Formats a relative time (e.g., "2 days ago", "há 2 dias")
 */
export function formatRelativeTime(date: Date, language: Language): string {
	const locale = DATE_FNS_LOCALES[language];
	return formatDistanceToNow(date, { locale, addSuffix: true });
}

/**
 * Formats currency according to locale
 * Extends the existing formatCurrencyBRL to support locale
 */
export function formatCurrency(amount: number, language: Language): string {
	const localeCode = language === "pt-BR" ? "pt-BR" : "en-US";
	const currency = language === "pt-BR" ? "BRL" : "USD";

	return new Intl.NumberFormat(localeCode, {
		style: "currency",
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

/**
 * Formats a number according to locale
 */
export function formatNumber(
	value: number,
	language: Language,
	options?: Intl.NumberFormatOptions,
): string {
	const localeCode = language === "pt-BR" ? "pt-BR" : "en-US";
	return new Intl.NumberFormat(localeCode, options).format(value);
}

/**
 * Formats date and time together
 */
export function formatDateTime(
	date: Date,
	language: Language,
	options?: Intl.DateTimeFormatOptions,
): string {
	const localeCode = language === "pt-BR" ? "pt-BR" : "en-US";
	return new Intl.DateTimeFormat(localeCode, options).format(date);
}
