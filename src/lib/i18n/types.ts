export const LANGUAGES = ["pt-BR", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "pt-BR";

export const LANGUAGE_NAMES: Record<Language, string> = {
	"pt-BR": "Português (Brasil)",
	en: "English",
};
