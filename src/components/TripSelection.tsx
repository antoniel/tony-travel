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
import { useUser } from "@/hooks/useUser";
import { signIn } from "@/lib/auth-client";
import type { InsertAppEvent, Travel } from "@/lib/db/schema";
import type { TravelWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";
import { orpc } from "@/orpc/client";
import type {
	Airport,
	InsertFullTravel,
} from "@/orpc/modules/travel/travel.model";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { formatCurrencyBRL } from "@/lib/currency";
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
import { useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
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

	// Helpers for currency mask (pt-BR)
	const formatNumberPtBR = (n: number) =>
		new Intl.NumberFormat("pt-BR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(n);

	const formatDecimalStringPtBR = (value: string) => {
		if (!value) return "";
		const n = Number(value);
		if (!Number.isFinite(n)) return "";
		return formatNumberPtBR(n);
	};

	// Airport selector state
	const [airportSearch, setAirportSearch] = useState("");
	const [isAirportPopoverOpen, setIsAirportPopoverOpen] = useState(false);

	const [isDestinationPopoverOpen, setIsDestinationPopoverOpen] =
		useState(false);

	// Date range popover state
	const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);

	// Ref to date trigger for optional focus
	const dateTriggerRef = useRef<HTMLButtonElement | null>(null);

	const { data: searchResults = [] } = useAirportsSearch(airportSearch, 10);

	// Login modal state
	const [loginModalOpen, setLoginModalOpen] = useState(false);

	// Prompt dialog state
	const [promptOpen, setPromptOpen] = useState(false);
	const [generatedPrompt] = useState("");
	const [chatgptResponse, setChatgptResponse] = useState("");

	// Derived helpers for people/budget display on featured cards
	const getSelectedPeopleCount = () => {
		if (form.people === "custom") {
			const n = Number(form.customPeople);
			return Number.isFinite(n) && n > 0 ? n : 2;
		}
		const n = Number(form.people);
		return Number.isFinite(n) && n > 0 ? n : 2;
	};

	const getPeopleLabel = (tripPeopleEstimate?: number | null) => {
		if (typeof tripPeopleEstimate === "number" && Number.isFinite(tripPeopleEstimate)) {
			const count = Math.max(1, Math.floor(tripPeopleEstimate));
			return `${count} ${count === 1 ? "pessoa" : "pessoas"}`;
		}
		if (form.people === "5") return "5+ pessoas";
		const count = getSelectedPeopleCount();
		return `${count} ${count === 1 ? "pessoa" : "pessoas"}`;
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

	function copyToClipboard(text: string) {
		navigator.clipboard?.writeText(text).catch(() => {
			// ignore
		});
	}

	const getDurationInDays = (startDate: Date, endDate: Date) => {
		const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	const searchDestionationOption = searchResults.map((airport) => ({
		value: airport.code,
		label: renderAiportName(airport),
	}));
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
												options={searchDestionationOption}
												selected={form.departureAirports.map((airport) => ({
													value: airport.code,
													label: renderAiportName(airport),
												}))}
												onSelectionChange={(selected) => {
													// Preserve already selected airports across different searches
													setForm((prev) => {
														const selectedCodes = selected.map((s) => s.value);
														// Build a lookup from previous selections and current results
														const byCode = new Map<string, Airport>();
														for (const a of prev.departureAirports)
															byCode.set(a.code, a);
														for (const a of searchResults)
															if (!byCode.has(a.code)) byCode.set(a.code, a);

														const departureAirports = selectedCodes
															.map((code) => byCode.get(code))
															.filter(Boolean) as Airport[];

														return {
															...prev,
															departureAirports,
														};
													});
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
												options={searchDestionationOption}
												selected={form.destinations}
												onSelectionChange={(selected) => {
													setForm((prev) => ({
														...prev,
														destinations: selected,
													}));
												}}
												searchValue={airportSearch}
												onSearchChange={setAirportSearch}
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
															className="h-12 text-base flex-1 bg-background"
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
														<SelectTrigger className="h-12 text-base w-full bg-background border border-border shadow-xs">
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
												<div className="relative">
													<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
														R$
													</span>
													<Input
														id="budget"
														type="text"
														inputMode="numeric"
														placeholder="0,00"
														value={formatDecimalStringPtBR(form.customBudget)}
														onChange={(e) => {
															const raw = e.target.value;
															const digits = raw.replace(/\D/g, "");
															if (!digits) {
																setForm((prev) => ({
																	...prev,
																	customBudget: "",
																}));
																return;
															}
															const cents = Number.parseInt(digits, 10);
															const decimal = (cents / 100).toFixed(2); // normalized with dot
															setForm((prev) => ({
																...prev,
																customBudget: decimal,
															}));
														}}
														className="h-12 text-base pl-8"
													/>
												</div>
											</div>
										</div>
									</div>

									{/* Date Range - Full width */}
									<div className="space-y-3">
										<Label className="text-base font-medium">
											Quando você quer viajar?
										</Label>
										<Popover
											open={isDatePopoverOpen}
											onOpenChange={setIsDatePopoverOpen}
										>
											<PopoverTrigger asChild>
												<Button
													ref={dateTriggerRef}
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
													disabled={{
														before: new Date(new Date().setHours(0, 0, 0, 0)),
													}}
												/>
											</PopoverContent>
										</Popover>
									</div>
								</div>

								{/* Additional Details */}

								{/* Search Button */}
								<div className="pt-4">
									<Button
										onClick={() => {
											if (!isAuthenticated) {
												setLoginModalOpen(true);
												return;
											}

											// Require at least one departure, one destination and a date range
											const missingDeparture =
												form.departureAirports.length === 0;
											const missingDestination = form.destinations.length === 0;
											const missingDates =
												!form.dateRange?.from || !form.dateRange?.to;

											if (
												missingDeparture ||
												missingDestination ||
												missingDates
											) {
												let msg = "Preencha os campos obrigatórios: ";
												const parts: string[] = [];
												if (missingDeparture) parts.push("partida");
												if (missingDestination) parts.push("destino");
												if (missingDates) parts.push("datas");
												msg += parts.join(", ");
												toast.error(msg);
												if (missingDeparture) {
													setIsAirportPopoverOpen(true);
												} else if (missingDestination) {
													setIsDestinationPopoverOpen(true);
												} else if (missingDates) {
													setIsDatePopoverOpen(true);
													queueMicrotask(() => dateTriggerRef.current?.focus());
												}
												return;
											}

											// Prepare data for TripWizard
											// Persist last selections for use as suggestions in other flows (e.g., Flights)
											try {
												localStorage.setItem(
													"tt_last_departure_airports",
													JSON.stringify(form.departureAirports),
												);
												localStorage.setItem(
													"tt_last_destinations",
													JSON.stringify(form.destinations),
												);
											} catch {}

											// Prepare data for TripWizard
											const searchParams = {
												destinations:
													form.destinations.length > 0
														? JSON.stringify(form.destinations)
														: undefined,
												dateFrom: form.dateRange?.from?.toISOString(),
												dateTo: form.dateRange?.to?.toISOString(),
												people:
													(form.people === "custom"
														? form.customPeople
														: form.people) || "2",
												budget: form.customBudget || "1500",
												departureAirports:
													form.departureAirports.length > 0
														? JSON.stringify(form.departureAirports)
														: undefined,
											};

											navigate({
												to: "/create-trip",
												search: searchParams,
											});
										}}
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

											{typeof trip.peopleEstimate === "number" && Number.isFinite(trip.peopleEstimate) ? (
												<div className="flex items-center text-sm text-muted-foreground">
													<Users className="h-4 w-4 mr-2" />
													<span>{getPeopleLabel(trip.peopleEstimate)}</span>
												</div>
											) : null}

											{typeof trip.budget === "number" && Number.isFinite(trip.budget) ? (
												<div className="flex items-center text-sm text-muted-foreground">
													<DollarSign className="h-4 w-4 mr-2" />
													<span>{`A partir de ${formatCurrencyBRL(trip.budget)}`}</span>
												</div>
											) : null}
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
		orpc.travelRoutes.saveTravel.mutationOptions({
			onSuccess: (data) => {
				navigate({ to: "/trip/$travelId", params: { travelId: data.id } });
			},
		}),
	);

	function extractJsonCodeBlock(input: string): string | null {
		const m = input.match(/```json\n([\s\S]*?)```/i);
		return m ? m[1] : null;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	function normalizeTravelForSave(raw: any): InsertFullTravel {
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
		const normalizeEvent = (ev: any): InsertAppEvent => ({
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
			accommodations: (raw.accommodation ?? []).map((a: any) => ({
				...a,
				startDate: toDate(a.startDate) as Date,
				endDate: toDate(a.endDate) as Date,
			})),
			events: (raw.events ?? []).map(normalizeEvent),
		};
	}
	function tryImportTravel() {
		setImportError(null);
		const text = props.chatgptResponse.trim();
		if (!text) {
			setImportError("Cole a resposta do ChatGPT para continuar.");
			return;
		}

		// First try to extract JSON from code block
		let jsonText = extractJsonCodeBlock(text);

		// If no code block found, try parsing the entire text as JSON
		if (!jsonText) {
			jsonText = text;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(jsonText);
		} catch {
			setImportError(
				"JSON inválido. Verifique vírgulas, aspas e datas como strings ISO.",
			);
			return;
		}

		// Ensure Travel shape minimally
		const t = parsed as TravelWithRelations;
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
							placeholder="Cole a resposta do ChatGPT aqui"
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
