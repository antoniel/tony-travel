import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { startPlanTravel } from "@/lib/prompts";
import type { AppEvent, Travel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { orpc } from "@/orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	CalendarIcon,
	Clock,
	DollarSign,
	MapPin,
	Plane,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

interface TripSelectionProps {
	predefinedTrips: Travel[];
}

interface Airport {
	code: string;
	name: string;
	city: string;
}

interface TripSearchForm {
	destination: string;
	dateRange: DateRange | undefined;
	budget: string;
	customBudget: string;
	people: string;
	customPeople: string;
	departureAirports: Airport[];
}

const destinations = [
	{ value: "colombia", label: "Colômbia" },
	{ value: "peru", label: "Peru" },
	{ value: "ecuador", label: "Equador" },
	{ value: "bolivia", label: "Bolívia" },
];

const brazilianAirports: Airport[] = [
	{
		code: "GRU",
		name: "Aeroporto Internacional de São Paulo",
		city: "São Paulo",
	},
	{
		code: "GIG",
		name: "Aeroporto Internacional Tom Jobim",
		city: "Rio de Janeiro",
	},
	{ code: "CGH", name: "Aeroporto de Congonhas", city: "São Paulo" },
	{
		code: "BSB",
		name: "Aeroporto Internacional de Brasília",
		city: "Brasília",
	},
	{
		code: "SSA",
		name: "Aeroporto Deputado Luís Eduardo Magalhães",
		city: "Salvador",
	},
	{
		code: "CNF",
		name: "Aeroporto Internacional Tancredo Neves",
		city: "Belo Horizonte",
	},
	{
		code: "FOR",
		name: "Aeroporto Internacional Pinto Martins",
		city: "Fortaleza",
	},
	{
		code: "REC",
		name: "Aeroporto Internacional dos Guararapes",
		city: "Recife",
	},
	{
		code: "POA",
		name: "Aeroporto Internacional Salgado Filho",
		city: "Porto Alegre",
	},
	{
		code: "CWB",
		name: "Aeroporto Internacional Afonso Pena",
		city: "Curitiba",
	},
	{
		code: "MAO",
		name: "Aeroporto Internacional Eduardo Gomes",
		city: "Manaus",
	},
	{ code: "BEL", name: "Aeroporto Internacional Val de Cans", city: "Belém" },
	{
		code: "VCP",
		name: "Aeroporto Internacional de Viracopos",
		city: "Campinas",
	},
	{ code: "SDU", name: "Aeroporto Santos Dumont", city: "Rio de Janeiro" },
	{
		code: "FLN",
		name: "Aeroporto Internacional Hercílio Luz",
		city: "Florianópolis",
	},
];

export default function TripSelection({ predefinedTrips }: TripSelectionProps) {
	const navigate = useNavigate();
	const [form, setForm] = useState<TripSearchForm>({
		destination: "",
		dateRange: undefined,
		budget: "",
		customBudget: "",
		people: "",
		customPeople: "",
		departureAirports: [],
	});

	// Airport selector state
	const [airportSearch, setAirportSearch] = useState("");
	const [isAirportPopoverOpen, setIsAirportPopoverOpen] = useState(false);

	// Prompt dialog state
	const [promptOpen, setPromptOpen] = useState(false);
	const [generatedPrompt, setGeneratedPrompt] = useState("");
	const [chatgptResponse, setChatgptResponse] = useState("");

	const generatePromptMutation = useMutation(
		orpc.generatePrompt.mutationOptions({
			onSuccess: (data) => {
				setGeneratedPrompt(data);
				setPromptOpen(true);
			},
			onError: (error) => {
				console.error(error);
			},
		}),
	);

	const buildPrompt = async () => {
		// Dates
		const start = form.dateRange?.from
			? formatISODate(form.dateRange.from)
			: formatISODate(new Date());
		const end = form.dateRange?.to
			? formatISODate(form.dateRange.to)
			: formatISODate(addDaysSafe(new Date(), 12));

		// Budget per person
		const perPerson = (() => {
			if (form.budget === "custom" && form.customBudget)
				return Number(form.customBudget);
			if (!form.budget) return 1500; // default
			const n = Number(form.budget);
			return Number.isFinite(n) ? n : 1500;
		})();

		// Group size
		const groupSize = (() => {
			if (form.people === "custom" && form.customPeople)
				return Number(form.customPeople);
			if (!form.people) return 2; // default
			const n = Number(form.people);
			return Number.isFinite(n) && n > 0 ? n : 2;
		})();

		// Departure airport codes
		const departureCities = form.departureAirports.length
			? form.departureAirports.map((a) => a.code)
			: ["GRU"]; // default

		generatePromptMutation.mutate(
			{
				tripDates: { start, end },
				budget: { perPerson, currency: "BRL" },
				destination: form.destination || "",
				groupSize,
				departureCities,
			},
			{
				onError: (error) => {
					console.log(error);
					return startPlanTravel({
						tripDates: { start, end },
						budget: { perPerson, currency: "BRL" },
						destination: form.destination || "",
						groupSize,
						departureCities,
					});
				},
			},
		);
		return generatePromptMutation.data;
	};

	const handleSearch = async () => {
		// Generate and open prompt dialog
		const prompt = await buildPrompt();
		setGeneratedPrompt(prompt || "");
		setPromptOpen(true);
	};

	const handleSelectPredefinedTrip = (trip: Travel) => {
		navigate({ to: `/trip/${trip.id}` });
	};

	const addAirport = (airport: Airport) => {
		if (!form.departureAirports.some((a) => a.code === airport.code)) {
			setForm((prev) => ({
				...prev,
				departureAirports: [...prev.departureAirports, airport],
			}));
		}
		setAirportSearch("");
		setIsAirportPopoverOpen(false);
	};

	const removeAirport = (airportCode: string) => {
		setForm((prev) => ({
			...prev,
			departureAirports: prev.departureAirports.filter(
				(a) => a.code !== airportCode,
			),
		}));
	};

	function formatISODate(d: Date) {
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	function addDaysSafe(d: Date, days: number) {
		const copy = new Date(d);
		copy.setDate(copy.getDate() + days);
		return copy;
	}

	function copyToClipboard(text: string) {
		navigator.clipboard?.writeText(text).catch(() => {
			// ignore
		});
	}

	const filteredAirports = brazilianAirports
		.filter(
			(airport) =>
				airport.name.toLowerCase().includes(airportSearch.toLowerCase()) ||
				airport.city.toLowerCase().includes(airportSearch.toLowerCase()) ||
				airport.code.toLowerCase().includes(airportSearch.toLowerCase()),
		)
		.slice(0, 8); // Limit to 8 results for performance

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
									{/* Departure Airport & Destination */}
									<div className="pb-8 border-b border-border/50">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
											{/* Departure Airport */}
											<div className="space-y-3">
												<Label className="text-base font-medium">
													De onde você vai partir?
												</Label>
												<Popover
													open={isAirportPopoverOpen}
													onOpenChange={setIsAirportPopoverOpen}
												>
													<PopoverTrigger asChild>
														<Button
															variant="outline"
															className="h-12 w-full justify-start text-left font-normal text-base"
														>
															<Plane className="mr-3 h-4 w-4" />
															{form.departureAirports.length > 0 ? (
																<span className="truncate">
																	{form.departureAirports
																		.map((a) => a.code)
																		.join(", ")}
																	{form.departureAirports.length > 1 &&
																		` (+${form.departureAirports.length - 1})`}
																</span>
															) : (
																<span className="text-muted-foreground">
																	Selecione aeroporto(s) de partida
																</span>
															)}
														</Button>
													</PopoverTrigger>
													<PopoverContent className="w-80 p-0" align="start">
														<div className="p-4 space-y-4">
															{/* Search */}
															<Input
																placeholder="Buscar por cidade, aeroporto ou código..."
																value={airportSearch}
																onChange={(e) =>
																	setAirportSearch(e.target.value)
																}
																className="w-full"
															/>

															{/* Selected Airports */}
															{form.departureAirports.length > 0 && (
																<div className="space-y-2">
																	<div className="text-sm font-medium">
																		Aeroportos selecionados:
																	</div>
																	<div className="flex flex-wrap gap-2">
																		{form.departureAirports.map((airport) => (
																			<Badge
																				key={airport.code}
																				variant="secondary"
																				className="flex items-center gap-1"
																			>
																				{airport.code} - {airport.city}
																				<X
																					className="h-3 w-3 cursor-pointer hover:text-destructive"
																					onClick={(e) => {
																						e.preventDefault();
																						e.stopPropagation();
																						removeAirport(airport.code);
																					}}
																				/>
																			</Badge>
																		))}
																	</div>
																</div>
															)}

															{/* Airport List */}
															<div className="space-y-1 max-h-64 overflow-y-auto">
																{filteredAirports.map((airport) => (
																	<Button
																		key={airport.code}
																		variant="ghost"
																		className="w-full justify-start text-left p-2 h-auto"
																		onClick={() => addAirport(airport)}
																		disabled={form.departureAirports.some(
																			(a) => a.code === airport.code,
																		)}
																	>
																		<div>
																			<div className="font-medium">
																				{airport.code} - {airport.city}
																			</div>
																			<div className="text-xs text-muted-foreground truncate">
																				{airport.name}
																			</div>
																		</div>
																	</Button>
																))}
																{airportSearch &&
																	filteredAirports.length === 0 && (
																		<div className="text-center text-sm text-muted-foreground py-4">
																			Nenhum aeroporto encontrado
																		</div>
																	)}
															</div>
														</div>
													</PopoverContent>
												</Popover>
											</div>

											{/* Destination */}
											<div className="space-y-3">
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
										</div>

										{/* People and Budget */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div className="space-y-3">
												<Label
													htmlFor="people"
													className="text-base font-medium"
												>
													Quantas pessoas?
												</Label>
												{form.people === "custom" ? (
													<div className="flex gap-2">
														<Input
															type="number"
															placeholder="Ex: 6"
															value={form.customPeople}
															onChange={(e) =>
																setForm((prev) => ({
																	...prev,
																	customPeople: e.target.value,
																}))
															}
															className="h-12 text-base flex-1"
															min="1"
															max="50"
														/>
														<Button
															variant="outline"
															onClick={() =>
																setForm((prev) => ({
																	...prev,
																	people: "",
																	customPeople: "",
																}))
															}
															className="h-12 px-3"
														>
															<X className="h-4 w-4" />
														</Button>
													</div>
												) : (
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
															<SelectItem value="custom">
																💡 Valor personalizado
															</SelectItem>
														</SelectContent>
													</Select>
												)}
											</div>
											<div className="space-y-3">
												<Label
													htmlFor="budget"
													className="text-base font-medium"
												>
													Qual seu orçamento? (BRL)
												</Label>
												{form.budget === "custom" ? (
													<div className="flex gap-2">
														<div className="relative flex-1">
															<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
																$
															</span>
															<Input
																type="number"
																placeholder="Ex: 1500"
																value={form.customBudget}
																onChange={(e) =>
																	setForm((prev) => ({
																		...prev,
																		customBudget: e.target.value,
																	}))
																}
																className="h-12 text-base pl-8"
																min="0"
																step="50"
															/>
														</div>
														<Button
															variant="outline"
															onClick={() =>
																setForm((prev) => ({
																	...prev,
																	budget: "",
																	customBudget: "",
																}))
															}
															className="h-12 px-3"
														>
															<X className="h-4 w-4" />
														</Button>
													</div>
												) : (
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
															<SelectItem value="1000">
																$500 - $1.000
															</SelectItem>
															<SelectItem value="2000">
																$1.000 - $2.000
															</SelectItem>
															<SelectItem value="3000">
																$2.000 - $3.000
															</SelectItem>
															<SelectItem value="5000">$3.000+</SelectItem>
															<SelectItem value="custom">
																💡 Valor personalizado
															</SelectItem>
														</SelectContent>
													</Select>
												)}
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

					<DialogCreateTravel
						{...{
							promptOpen,
							setPromptOpen,
							generatedPrompt,
							copyToClipboard,
							chatgptResponse,
							setChatgptResponse,
						}}
					/>

					{/* Predefined Trips */}
					<div className=" mx-auto">
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

function DialogCreateTravel(props: {
	promptOpen: boolean;
	setPromptOpen: (open: boolean) => void;
	generatedPrompt: string;
	copyToClipboard: (text: string) => void;
	chatgptResponse: string;
	setChatgptResponse: (response: string) => void;
}) {
	const [importError, setImportError] = useState<string | null>(null);
	const navigate = useNavigate();

	const saveTravelMutation = useMutation(
		orpc.saveTravel.mutationOptions({
			onSuccess: (data) => {
				navigate({ to: "/trip/$tripId", params: { tripId: data.id } });
			},
		}),
	);

	function extractJsonCodeBlock(input: string): string | null {
		const m = input.match(/```json\n([\s\S]*?)```/i);
		return m ? m[1] : null;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	function normalizeTravelForSave(raw: any): Omit<Travel, "id"> {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const toDate = (v: any) => {
			if (v instanceof Date) return v;
			if (typeof v === "string") {
				const d = new Date(v);
				if (!Number.isNaN(d.getTime())) return d;
			}
			return v;
		};
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const normalizeEvent = (ev: any): AppEvent => ({
			...ev,
			startDate: toDate(ev.startDate) as Date,
			endDate: toDate(ev.endDate) as Date,
			dependencies: (ev.dependencies ?? []).map(normalizeEvent),
		});
		return {
			name: raw.name,
			destination: raw.destination,
			startDate: toDate(raw.startDate) as Date,
			endDate: toDate(raw.endDate) as Date,
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			accommodation: (raw.accommodation ?? []).map((a: any) => ({
				...a,
				startDate: toDate(a.startDate) as Date,
				endDate: toDate(a.endDate) as Date,
			})),
			events: (raw.events ?? []).map(normalizeEvent),
			locationInfo: raw.locationInfo,
			visaInfo: raw.visaInfo,
		};
	}
	function tryImportTravel() {
		setImportError(null);
		const text = props.chatgptResponse.trim();
		if (!text) {
			setImportError("Cole a resposta do ChatGPT para continuar.");
			return;
		}
		const jsonBlock = extractJsonCodeBlock(text);
		if (!jsonBlock) {
			setImportError(
				"Responda e cole APENAS um bloco ```json``` com o objeto Travel.",
			);
			return;
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonBlock);
		} catch {
			setImportError(
				"JSON inválido. Verifique vírgulas, aspas e datas como strings ISO.",
			);
			return;
		}

		// Ensure Travel shape minimally
		const t = parsed as Travel;
		if (!t || !t.name || !t.startDate || !t.endDate || !t.events) {
			setImportError(
				"Objeto inválido: faltam campos obrigatórios (name, dates, events).",
			);
			return;
		}

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const { id, ...rest } = t as any;
			const normalized = normalizeTravelForSave(rest);
			saveTravelMutation.mutate({ travel: normalized });
			props.setPromptOpen(false);
		} catch (err) {
			setImportError("Falha ao salvar o roteiro no backend.");
		}
	}
	return (
		<Dialog open={props.promptOpen} onOpenChange={props.setPromptOpen}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle>Gerar e importar roteiro</DialogTitle>
					<DialogDescription>
						1) Copie o prompt abaixo e cole no ChatGPT. 2) Cole aqui APENAS um
						bloco <code>```json</code> com o objeto Travel (nenhum texto fora do
						bloco).
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<div className="mb-2 text-sm font-medium">Prompt para ChatGPT</div>
						<textarea
							readOnly
							className="w-full h-56 text-sm rounded-md border bg-muted/30 p-3"
							value={props.generatedPrompt}
						/>
						<div className="mt-2 flex gap-2">
							<Button
								size="sm"
								onClick={() => props.copyToClipboard(props.generatedPrompt)}
							>
								Copiar
							</Button>
						</div>
					</div>

					<div className="pt-2">
						<div className="mb-2 text-sm font-medium">
							Resposta do ChatGPT (cole aqui o bloco <code>```json</code>)
						</div>
						<textarea
							className="w-full h-40 text-sm rounded-md border p-3"
							placeholder="Cole apenas o bloco ```json``` com o objeto Travel..."
							value={props.chatgptResponse}
							onChange={(e) => props.setChatgptResponse(e.target.value)}
						/>
						{importError && (
							<div className="text-sm text-destructive">{importError}</div>
						)}
						<div className="mt-2 flex gap-2 justify-end">
							<Button onClick={tryImportTravel} className="">
								Importar roteiro
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
