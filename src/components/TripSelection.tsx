import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Travel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, DollarSign, MapPin, Users } from "lucide-react";
import { useState } from "react";

interface TripSelectionProps {
	predefinedTrips: Travel[];
}

interface TripSearchForm {
	destination: string;
	startDate: Date | undefined;
	endDate: Date | undefined;
	budget: string;
	people: string;
}

const destinations = [
	{ value: "colombia", label: "Colômbia" },
	{ value: "peru", label: "Peru" },
	{ value: "ecuador", label: "Equador" },
	{ value: "bolivia", label: "Bolívia" },
];

export default function TripSelection({ predefinedTrips }: TripSelectionProps) {
	const navigate = useNavigate();
	const [form, setForm] = useState<TripSearchForm>({
		destination: "",
		startDate: undefined,
		endDate: undefined,
		budget: "",
		people: "",
	});

	const handleSearch = () => {
		// TODO: Implement search logic
		console.log("Search form:", form);
		// For now, navigate to calendar with first predefined trip
		if (predefinedTrips.length > 0) {
			navigate({ to: `/trip/${predefinedTrips[0].id}` });
		}
	};

	const handleSelectPredefinedTrip = (trip: Travel) => {
		navigate({ to: `/trip/${trip.id}` });
	};

	const getDurationInDays = (startDate: Date, endDate: Date) => {
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-12">
				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-foreground mb-4">
						Planeje sua próxima aventura
					</h1>
					<p className="text-xl text-muted-foreground">
						Encontre o roteiro perfeito para sua viagem pela América do Sul
					</p>
				</div>

				{/* Trip Search Form */}
				<Card className="max-w-2xl mx-auto mb-16">
					<CardHeader>
						<CardTitle className="text-center">
							Criar novo planejamento
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Destination */}
						<div className="space-y-2">
							<Label htmlFor="destination">Destino</Label>
							<Select
								value={form.destination}
								onValueChange={(value) =>
									setForm((prev) => ({ ...prev, destination: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecione um destino" />
								</SelectTrigger>
								<SelectContent>
									{destinations.map((dest) => (
										<SelectItem key={dest.value} value={dest.value}>
											{dest.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Dates */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Data de início</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full justify-start text-left font-normal",
												!form.startDate && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{form.startDate ? (
												format(form.startDate, "dd/MM/yyyy", { locale: ptBR })
											) : (
												<span>Selecionar data</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={form.startDate}
											onSelect={(date) =>
												setForm((prev) => ({ ...prev, startDate: date }))
											}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>

							<div className="space-y-2">
								<Label>Data de fim</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className={cn(
												"w-full justify-start text-left font-normal",
												!form.endDate && "text-muted-foreground",
											)}
										>
											<CalendarIcon className="mr-2 h-4 w-4" />
											{form.endDate ? (
												format(form.endDate, "dd/MM/yyyy", { locale: ptBR })
											) : (
												<span>Selecionar data</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={form.endDate}
											onSelect={(date) =>
												setForm((prev) => ({ ...prev, endDate: date }))
											}
											initialFocus
											disabled={(date) =>
												form.startDate ? date < form.startDate : false
											}
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>

						{/* Budget and People */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="budget">Budget máximo (USD)</Label>
								<Input
									id="budget"
									type="number"
									placeholder="1500"
									value={form.budget}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, budget: e.target.value }))
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="people">Número de pessoas</Label>
								<Input
									id="people"
									type="number"
									placeholder="2"
									value={form.people}
									onChange={(e) =>
										setForm((prev) => ({ ...prev, people: e.target.value }))
									}
								/>
							</div>
						</div>

						{/* Search Button */}
						<Button onClick={handleSearch} className="w-full" size="lg">
							Buscar planejamentos
						</Button>
					</CardContent>
				</Card>

				{/* Predefined Trips */}
				<div className="max-w-6xl mx-auto">
					<h2 className="text-2xl font-bold text-foreground mb-8 text-center">
						Planejamentos em destaque
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{predefinedTrips.map((trip) => (
							<Card
								key={trip.id}
								className="cursor-pointer hover:shadow-lg transition-shadow"
								onClick={() => handleSelectPredefinedTrip(trip)}
							>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-lg mb-2">
												{trip.name}
											</CardTitle>
											<div className="flex items-center text-muted-foreground mb-2">
												<MapPin className="h-4 w-4 mr-1" />
												<span className="text-sm">{trip.destination}</span>
											</div>
										</div>
										<Badge variant="secondary">
											{getDurationInDays(trip.startDate, trip.endDate)} dias
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="flex items-center text-sm text-muted-foreground">
											<Clock className="h-4 w-4 mr-2" />
											<span>
												{format(trip.startDate, "dd/MM", { locale: ptBR })} -{" "}
												{format(trip.endDate, "dd/MM/yyyy", { locale: ptBR })}
											</span>
										</div>

										<div className="flex items-center text-sm text-muted-foreground">
											<Users className="h-4 w-4 mr-2" />
											<span>1-2 pessoas</span>
										</div>

										<div className="flex items-center text-sm text-muted-foreground">
											<DollarSign className="h-4 w-4 mr-2" />
											<span>A partir de $800</span>
										</div>

										<div className="pt-2">
											<p className="text-sm text-muted-foreground line-clamp-2">
												{trip.locationInfo.climate}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
