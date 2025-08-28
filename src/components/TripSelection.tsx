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
import { LocationSelector } from "@/components/ui/location-selector";
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
import { useAirportsSearch } from "@/hooks/useAirportsSearch";
import { useDestinationsSearch } from "@/hooks/useDestinationsSearch";
import { useUser } from "@/hooks/useUser";
import { signIn } from "@/lib/auth-client";
import { startPlanTravel } from "@/lib/planTravel.prompt";
import type { AppEvent, Travel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { orpc } from "@/orpc/client";
import type { Airport } from "@/orpc/modules/travel/travel.model";
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
import { match } from "ts-pattern";

interface TripSelectionProps {
	predefinedTrips: Travel[];
}

interface TripSearchForm {
	destination: string;
	destinations: { value: string; label: string }[];
	dateRange: DateRange | undefined;
	budget: string;
	customBudget: string;
	people: string;
	customPeople: string;
	departureAirports: Airport[];
}

export default function TripSelection({ predefinedTrips }: TripSelectionProps) {
	const navigate = useNavigate();
	const { isAuthenticated } = useUser();
	const [form, setForm] = useState<TripSearchForm>({
		destination: "",
		destinations: [],
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

	// Destination selector state
	const [destinationSearch, setDestinationSearch] = useState("");
	const [isDestinationPopoverOpen, setIsDestinationPopoverOpen] =
		useState(false);

	const { data: searchResults = [] } = useAirportsSearch(airportSearch, 10);
	const { data: destinationResults = [] } = useDestinationsSearch(
		destinationSearch,
		10,
	);

	// Login modal state
	const [loginModalOpen, setLoginModalOpen] = useState(false);

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
		// Check if user is authenticated
		if (!isAuthenticated) {
			setLoginModalOpen(true);
			return;
		}

		// Generate and open prompt dialog
		const prompt = await buildPrompt();
		setGeneratedPrompt(prompt || "");
		setPromptOpen(true);
	};

	const handleSelectPredefinedTrip = (trip: Travel) => {
		navigate({ to: `/trip/${trip.id}` });
	};

	const handleGoogleLogin = async () => {
		try {
			await signIn.social({
				provider: "google",
				callbackURL: window.location.href,
			});
			setLoginModalOpen(false);
		} catch (error) {
			console.error("Login error:", error);
		}
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

	// Use search results from backend
	const filteredAirports = searchResults;
	const filteredDestinations = destinationResults;

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
											<LocationSelector
												label="De onde você vai partir?"
												placeholder="Selecione aeroporto(s) de partida"
												searchPlaceholder="Buscar por cidade, aeroporto ou código..."
												selectedLabel="Aeroportos selecionados"
												icon={<Plane className="h-4 w-4" />}
												options={filteredAirports.map((airport) => ({
													value: airport.code,
													label: renderAiportName(airport),
												}))}
												selected={form.departureAirports.map((airport) => ({
													value: airport.code,
													label: renderAiportName(airport),
												}))}
												onSelectionChange={(selected) => {
													const selectedCodes = selected.map((s) => s.value);
													setForm((prev) => ({
														...prev,
														departureAirports: filteredAirports.filter(
															(airport) => selectedCodes.includes(airport.code),
														),
													}));
												}}
												searchValue={airportSearch}
												onSearchChange={setAirportSearch}
												isOpen={isAirportPopoverOpen}
												onOpenChange={setIsAirportPopoverOpen}
												multiple
											/>

											{/* Destination */}
											<LocationSelector
												label="Para onde você quer ir?"
												placeholder="Selecione destino(s)"
												searchPlaceholder="Buscar destino..."
												selectedLabel="Destinos selecionados"
												icon={<MapPin className="h-4 w-4" />}
												options={filteredDestinations}
												selected={form.destinations}
												onSelectionChange={(selected) => {
													setForm((prev) => ({
														...prev,
														destinations: selected,
													}));
												}}
												searchValue={destinationSearch}
												onSearchChange={setDestinationSearch}
												isOpen={isDestinationPopoverOpen}
												onOpenChange={setIsDestinationPopoverOpen}
												multiple
											/>
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

					{/* Login Modal */}
					<Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>Faça login para continuar</DialogTitle>
								<DialogDescription>
									Você precisa estar logado para criar um roteiro personalizado.
								</DialogDescription>
							</DialogHeader>
							<div className="flex flex-col gap-4 py-4">
								<Button
									onClick={handleGoogleLogin}
									className="w-full h-12 gap-3"
									variant="outline"
								>
									<svg className="h-5 w-5" viewBox="0 0 24 4">
										<title>Google</title>
										<path
											fill="currentColor"
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
										/>
										<path
											fill="currentColor"
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
										/>
										<path
											fill="currentColor"
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
										/>
										<path
											fill="currentColor"
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
										/>
									</svg>
									Entrar com Google
								</Button>
								<div className="text-center text-sm text-muted-foreground">
									Ao fazer login, você concorda com nossos termos de uso e
									política de privacidade.
								</div>
							</div>
						</DialogContent>
					</Dialog>

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

const renderAiportName = (airport: Airport) => {
	return match(airport.type)
		.with("city_group", () => `${airport.city} - ${airport.stateCode}`)
		.with("state_group", () => `${airport.state}`)
		.with("country_group", () => `${airport.country}`)
		.otherwise(() => `${airport.city} - ${airport.code}`);
};
