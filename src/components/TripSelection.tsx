import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { DateRange } from "react-day-picker";

interface TripSelectionProps {
	predefinedTrips: Travel[];
}

interface TripSearchForm {
	destination: string;
	dateRange: DateRange | undefined;
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
		dateRange: undefined,
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
		<div className="relative h-full bg-gradient-to-b from-primary/10 via-background to-background">
			<div className="relative isolate min-h-screen pb-6 inset-0">
				<div className="w-full  pointer-events-none absolute inset-0 -z-10 overflow-hidden top-0 left-0">
					<div className="aurora aurora-a" aria-hidden />
					<div className="aurora aurora-b" aria-hidden />
					<div className="bg-grid-fade" aria-hidden />
				</div>
				{/* Disruptive aurora + grid background */}
				{/* Header */}
				<div className="container relative isolate mx-auto px-4 pt-12">
					<div className="text-center mb-12">
						<h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
							Planeje sua próxima aventura
						</h1>
						<p className="text-lg md:text-xl text-muted-foreground">
							Crie o roteiro do seu jeito de forma rápida e fácil
						</p>
					</div>

					{/* Trip Search Form */}
					<div className="relative max-w-4xl mx-auto mb-16 rounded-2xl p-[1.5px] bg-gradient-to-r from-primary/40 via-accent/30 to-chart-4/40 animate-gradient-x [background-size:200%_200%]">
						<Card className="travel-card rounded-2xl ring-1 ring-border/60">
							<CardContent className="px-8 py-4 space-y-8">
								{/* Main Trip Info */}
								<div className="space-y-6">
									{/* Destination - Full width */}
									<div className="pb-8 border-b border-border/50">
										<div className="flex gap-4 items-stretch">
											<div className="space-y-3 flex-1">
												<Label
													htmlFor="destination"
													className="text-base font-medium"
												>
													Para onde você quer ir?
												</Label>
												<Select
													value={form.destination}
													onValueChange={(value) =>
														setForm((prev) => ({ ...prev, destination: value }))
													}
												>
													<SelectTrigger className="h-12 text-base w-full">
														<SelectValue placeholder="Escolha seu destino" />
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
											<div className="space-y-3 flex-1">
												<Label
													htmlFor="people"
													className="text-base font-medium"
												>
													Quantas pessoas?
												</Label>
												<Select
													value={form.people}
													onValueChange={(value) =>
														setForm((prev) => ({ ...prev, people: value }))
													}
												>
													<SelectTrigger className="h-12 text-base w-full">
														<SelectValue placeholder="Número de viajantes" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="1">1 pessoa</SelectItem>
														<SelectItem value="2">2 pessoas</SelectItem>
														<SelectItem value="3">3 pessoas</SelectItem>
														<SelectItem value="4">4 pessoas</SelectItem>
														<SelectItem value="5">5+ pessoas</SelectItem>
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-3 flex-1">
												<Label
													htmlFor="budget"
													className="text-base font-medium"
												>
													Qual seu orçamento? (USD)
												</Label>
												<Select
													value={form.budget}
													onValueChange={(value) =>
														setForm((prev) => ({ ...prev, budget: value }))
													}
												>
													<SelectTrigger className="h-12 text-base w-full">
														<SelectValue placeholder="Faixa de orçamento" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="500">Até $500</SelectItem>
														<SelectItem value="1000">$500 - $1.000</SelectItem>
														<SelectItem value="2000">
															$1.000 - $2.000
														</SelectItem>
														<SelectItem value="3000">
															$2.000 - $3.000
														</SelectItem>
														<SelectItem value="5000">$3.000+</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>
									</div>

									{/* Date Range - Full width */}
									<div className="space-y-3">
										<Label className="text-base font-medium">
											Quando você quer viajar?
										</Label>
										<Popover>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"h-12 w-full justify-start text-left font-normal text-base",
														!form.dateRange && "text-muted-foreground",
													)}
												>
													<CalendarIcon className="mr-3 h-4 w-4" />
													{form.dateRange?.from ? (
														form.dateRange.to ? (
															<>
																{format(form.dateRange.from, "dd/MM/yyyy", {
																	locale: ptBR,
																})}{" "}
																até{" "}
																{format(form.dateRange.to, "dd/MM/yyyy", {
																	locale: ptBR,
																})}
															</>
														) : (
															format(form.dateRange.from, "dd/MM/yyyy", {
																locale: ptBR,
															})
														)
													) : (
														<span>Selecione as datas da sua viagem</span>
													)}
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0" align="center">
												<Calendar
													mode="range"
													selected={form.dateRange}
													onSelect={(dateRange) =>
														setForm((prev) => ({ ...prev, dateRange }))
													}
													numberOfMonths={2}
													locale={ptBR}
													className="bg-transparent p-3"
													buttonVariant="outline"
												/>
											</PopoverContent>
										</Popover>
									</div>
								</div>

								{/* Additional Details */}

								{/* Search Button */}
								<div className="pt-4">
									<Button
										onClick={handleSearch}
										className="w-full h-14 travel-button-primary rounded-xl relative overflow-hidden text-base font-semibold"
									>
										<span className="relative z-10">
											Criar meu roteiro personalizado
										</span>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Predefined Trips */}
					<div className="max-w-6xl mx-auto">
						<h2 className="text-2xl md:text-3xl font-bold mb-8 text-center bg-gradient-to-r from-primary/90 via-foreground to-accent/80 bg-clip-text text-transparent">
							Planejamentos em destaque
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{predefinedTrips.map((trip) => (
								<Card
									key={trip.id}
									className="cursor-pointer travel-card rounded-xl hover:-translate-y-0.5 hover:shadow-xl transition-all bg-gradient-to-br from-primary/5 via-card to-card"
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
		</div>
	);
}
