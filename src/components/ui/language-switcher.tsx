import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES, LANGUAGE_NAMES } from "@/lib/i18n/types";
import { Check, Languages } from "lucide-react";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

export function LanguageSwitcher() {
	const { currentLanguage, setLanguage } = useLanguage();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-9 px-2">
					<Languages className="h-5 w-5" />
					<span className="sr-only">Language</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{LANGUAGES.map((lang) => (
					<DropdownMenuItem
						key={lang}
						onClick={() => setLanguage(lang)}
						className="cursor-pointer"
					>
						<Check
							className={`mr-2 h-4 w-4 ${
								currentLanguage === lang ? "opacity-100" : "opacity-0"
							}`}
						/>
						{LANGUAGE_NAMES[lang]}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
