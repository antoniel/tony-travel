import { setLocale } from "@/paraglide/runtime";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import {
	buildPathWithLanguage,
	getCurrentLanguage,
	saveLanguage,
} from "./language-utils";
import type { Language } from "./types";

interface LanguageContextValue {
	currentLanguage: Language;
	setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
	children: React.ReactNode;
	initialLanguage?: Language;
}

export function LanguageProvider({
	children,
	initialLanguage,
}: LanguageProviderProps) {
	const navigate = useNavigate();
	const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
		const lang = initialLanguage || getCurrentLanguage();
		// Set Paraglide locale
		setLocale(lang);
		return lang;
	});

	// Update Paraglide when language changes
	useEffect(() => {
		setLocale(currentLanguage, { reload: false });
	}, [currentLanguage]);

	const handleSetLanguage = (lang: Language) => {
		// Save to localStorage
		saveLanguage(lang);

		// Update state
		setCurrentLanguage(lang);

		// Navigate to same page with new language
		const currentPath = window.location.pathname;
		const newPath = buildPathWithLanguage(currentPath, lang);

		// Only navigate if path actually changed
		if (newPath !== currentPath) {
			navigate({ to: newPath });
		}
	};

	const value: LanguageContextValue = {
		currentLanguage,
		setLanguage: handleSetLanguage,
	};

	return (
		<LanguageContext.Provider value={value}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error("useLanguage must be used within LanguageProvider");
	}
	return context;
}

// Re-export runtime utilities for convenience
export { baseLocale, getLocale } from "@/paraglide/runtime";
