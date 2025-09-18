import * as React from "react";
import type { DateRange } from "react-day-picker";
import { es, ptBR } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const localizedStrings = {
	pt: {
		title: "Agende um compromisso",
		description: "Selecione as datas do compromisso",
	},
	es: {
		title: "Reserva una cita",
		description: "Selecciona las fechas para tu cita",
	},
} as const;

const calendarLocale = {
	pt: ptBR,
	es,
} satisfies Record<keyof typeof localizedStrings, typeof ptBR>;

export default function Calendar12() {
	const [locale, setLocale] =
		React.useState<keyof typeof localizedStrings>("pt");
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
		from: new Date(2025, 8, 9),
		to: new Date(2025, 8, 17),
	});

	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle>{localizedStrings[locale].title}</CardTitle>
				<CardDescription>
					{localizedStrings[locale].description}
				</CardDescription>
				<CardAction>
					<Select
						value={locale}
						onValueChange={(value) =>
							setLocale(value as keyof typeof localizedStrings)
						}
					>
						<SelectTrigger className="w-[120px]">
							<SelectValue placeholder="Idioma" />
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="pt">Português</SelectItem>
							<SelectItem value="es">Español</SelectItem>
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent>
				<Calendar
					mode="range"
					selected={dateRange}
					onSelect={setDateRange}
					defaultMonth={dateRange?.from}
					numberOfMonths={2}
					locale={calendarLocale[locale]}
					className="bg-transparent p-0"
					buttonVariant="outline"
				/>
			</CardContent>
		</Card>
	);
}
