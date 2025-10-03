import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
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
import {
	formatCurrencyBRL,
	formatDecimalStringPtBR,
	normalizeCurrencyInputPtBR,
} from "@/lib/currency";
import type { InsertAppEvent } from "@/lib/db/schema";
import type { TravelWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";
import { orpc } from "@/orpc/client";
import type {
	Airport,
	FeaturedTravel,
	InsertFullTravel,
} from "@/orpc/modules/travel/travel.model";
import * as m from "@/paraglide/messages";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	CalendarDays,
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
	predefinedTrips: FeaturedTravel[];
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

	const now = new Date();

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
		if (
			typeof tripPeopleEstimate === "number" &&
			Number.isFinite(tripPeopleEstimate)
		) {
			const count = Math.max(1, Math.floor(tripPeopleEstimate));
			return count === 1
				? m["trip.people_count"]({ count: count.toString() })
				: m["trip.people_count_plural"]({ count: count.toString() });
		}
		if (form.people === "5") return m["trip.people_5_plus"]();
		const count = getSelectedPeopleCount();
		return count === 1
			? m["trip.people_count"]({ count: count.toString() })
			: m["trip.people_count_plural"]({ count: count.toString() });
	};

	const handleSelectPredefinedTrip = (trip: FeaturedTravel) => {
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
		<div className="relative h-full">
			<div className="relative isolate min-h-screen pb-6 inset-0">
				{/* Global Home background (fixed) so header blur picks it up */}
				<div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background">
					<div className="aurora aurora-a" aria-hidden />
					<div className="aurora aurora-b" aria-hidden />
					<div className="bg-grid-fade" aria-hidden />
				</div>
				{/* Disruptive aurora + grid background */}
				{/* Header */}
				<div className="container relative isolate mx-auto px-4 pt-12">
					<div className="text-center mb-12">
						<h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
							{m["trip.plan_next_adventure"]()}
						</h1>
						<p className="text-lg md:text-xl text-muted-foreground">
							{m["trip.create_itinerary_easy"]()}
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
												label={m["trip.where_from"]()}
												placeholder={m["trip.select_departure_airport"]()}
												searchPlaceholder={m["trip.search_city_airport"]()}
												selectedLabel={m["trip.selected_airports"]()}
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
												label={m["trip.where_to"]()}
												placeholder={m["trip.select_destination"]()}
												searchPlaceholder={m["trip.search_destination"]()}
												selectedLabel={m["trip.selected_destinations"]()}
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
													{m["trip.how_many_people"]()}
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
															<SelectValue placeholder={m["trip.traveler_placeholder"]()} />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="1">{m["trip.people_1"]()}</SelectItem>
															<SelectItem value="2">{m["trip.people_2"]()}</SelectItem>
															<SelectItem value="3">{m["trip.people_3"]()}</SelectItem>
															<SelectItem value="4">{m["trip.people_4"]()}</SelectItem>
															<SelectItem value="5">{m["trip.people_5_plus"]()}</SelectItem>
															<SelectItem value="custom">
																{m["trip.people_custom"]()}
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
													{m["trip.whats_budget"]()}
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
															const { decimal } = normalizeCurrencyInputPtBR(
																e.target.value,
															);
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
											{m["trip.when_travel"]()}
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
																{m["trip.date_range_to"]()}{" "}
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
														<span>{m["trip.select_travel_dates"]()}</span>
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
												let msg = m["trip.fill_required_fields"]();
												const parts: string[] = [];
												if (missingDeparture) parts.push(m["trip.departure"]());
												if (missingDestination)
													parts.push(m["trip.destination"]());
												if (missingDates) parts.push(m["trip.dates"]());
												msg += " " + parts.join(", ");
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
											{m["trip.create_custom_itinerary"]()}
										</span>
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Login Modal */}
					<ResponsiveModal
						open={loginModalOpen}
						onOpenChange={setLoginModalOpen}
						desktopClassName="sm:max-w-md"
						contentClassName="gap-0"
					>
						<DialogHeader className="border-b px-6 py-4">
							<DialogTitle className="text-left">
								{m["trip.login_required"]()}
							</DialogTitle>
							<DialogDescription>
								{m["trip.login_required_message"]()}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 px-6 py-4">
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
								{m["auth.login_with_google"]()}
							</Button>
							<div className="text-center text-sm text-muted-foreground">
								{m["auth.terms_agreement"]()}
							</div>
						</div>
					</ResponsiveModal>

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
							{m["trip.featured_trips"]()}
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{predefinedTrips.map((trip) => {
								const daysUntilStart = differenceInUtcCalendarDays(
									trip.startDate,
									now,
								);
								const startDateForDisplay = getUtcDateForDisplay(
									trip.startDate,
								);
								const endDateForDisplay = getUtcDateForDisplay(trip.endDate);
								const countdownLabel =
									trip.userMembership && daysUntilStart >= 0
										? daysUntilStart === 0
											? m["trip.today"]()
											: daysUntilStart === 1
												? m["trip.tomorrow"]()
												: m["trip.in_days"]({ days: daysUntilStart.toString() })
										: null;

								return (
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
												<div className="flex flex-col items-end gap-1">
													{trip.userMembership ? (
														<Badge variant="outline">
															{m["trip.your_trip"]()}
														</Badge>
													) : null}
													{countdownLabel ? (
														<Badge variant="default">{countdownLabel}</Badge>
													) : null}
												</div>
											</div>
										</CardHeader>
										<CardContent>
											<div className="space-y-3">
												<div className="flex items-center text-sm text-muted-foreground">
													<Clock className="h-4 w-4 mr-2" />
													<span>
														{format(startDateForDisplay, "dd/MM", {
															locale: ptBR,
														})}{" "}
														-{" "}
														{format(endDateForDisplay, "dd/MM/yyyy", {
															locale: ptBR,
														})}
													</span>
												</div>

												<div className="flex items-center text-sm text-muted-foreground">
													<CalendarDays className="h-4 w-4 mr-2" />
													<span>
														{m["trip.days_of_trip"]({
															days: getDurationInDays(
																trip.startDate,
																trip.endDate,
															).toString(),
														})}
													</span>
												</div>

												{typeof trip.peopleEstimate === "number" &&
												Number.isFinite(trip.peopleEstimate) ? (
													<div className="flex items-center text-sm text-muted-foreground">
														<Users className="h-4 w-4 mr-2" />
														<span>{getPeopleLabel(trip.peopleEstimate)}</span>
													</div>
												) : null}

												{typeof trip.budget === "number" &&
												Number.isFinite(trip.budget) ? (
													<div className="flex items-center text-sm text-muted-foreground">
														<DollarSign className="h-4 w-4 mr-2" />
														<span>
															{m["trip.starts_from"]({
																amount: formatCurrencyBRL(trip.budget),
															})}
														</span>
													</div>
												) : null}
											</div>
										</CardContent>
									</Card>
								);
							})}
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
		const normalizeDestinationOption = (option: unknown) => {
			if (
				typeof option === "object" &&
				option !== null &&
				"value" in option &&
				"label" in option
			) {
				const { value, label } = option as { value: string; label: string };
				return { value, label };
			}
			if (typeof option === "string") {
				return { value: option, label: option };
			}
			return null;
		};

		const destinationAirports = (() => {
			if (Array.isArray(raw.destinationAirports)) {
				return raw.destinationAirports
					.map(normalizeDestinationOption)
					.filter(Boolean) as { value: string; label: string }[];
			}
			if (Array.isArray(raw.destinations)) {
				return raw.destinations
					.map(normalizeDestinationOption)
					.filter(Boolean) as { value: string; label: string }[];
			}
			if (
				typeof raw.destination === "string" &&
				raw.destination.trim().length > 0
			) {
				return [{ value: raw.destination, label: raw.destination }];
			}
			return [];
		})();

		return {
			name: raw.name,
			destination: raw.destination,
			destinationAirports,
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
			setImportError(m["trip.chatgpt_paste_placeholder"]());
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
			setImportError(m["trip.import_error_invalid_json"]());
			return;
		}

		// Ensure Travel shape minimally
		const t = parsed as TravelWithRelations;
		if (!t || !t.name || !t.startDate || !t.endDate || !t.events) {
			setImportError(m["trip.import_error_missing_fields"]());
			return;
		}

		try {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const { id, ...rest } = t as any;
			const normalized = normalizeTravelForSave(rest);
			saveTravelMutation.mutate({ travel: normalized });
			props.setPromptOpen(false);
		} catch (err) {
			setImportError(m["trip.import_error"]());
		}
	}
	return (
		<ResponsiveModal
			open={props.promptOpen}
			onOpenChange={props.setPromptOpen}
			desktopClassName="max-w-3xl"
			contentClassName="gap-0"
		>
			<DialogHeader className="border-b px-6 py-4">
				<DialogTitle className="text-left">
					{m["trip.generate_import_itinerary"]()}
				</DialogTitle>
				<DialogDescription>
					{m["trip.chatgpt_prompt_instructions"]()} <code>```json</code> com o objeto Travel (nenhum texto fora do
					bloco).
				</DialogDescription>
			</DialogHeader>
			<div className="space-y-4 px-6 py-4">
				<div>
					<div className="mb-2 text-sm font-medium">{m["trip.chatgpt_prompt_title"]()}</div>
					<textarea
						readOnly
						className="h-56 w-full rounded-md border bg-muted/30 p-3 text-sm"
						value={props.generatedPrompt}
					/>
					<div className="mt-2 flex gap-2">
						<Button
							size="sm"
							onClick={() => props.copyToClipboard(props.generatedPrompt)}
						>
							{m["trip.chatgpt_copy"]()}
						</Button>
					</div>
				</div>

				<div className="pt-2">
					<div className="mb-2 text-sm font-medium">
						{m["trip.chatgpt_response_label"]()} <code>```json</code>)
					</div>
					<textarea
						className="h-40 w-full rounded-md border p-3 text-sm"
						placeholder={m["trip.paste_chatgpt_response"]()}
						value={props.chatgptResponse}
						onChange={(e) => props.setChatgptResponse(e.target.value)}
					/>
					{importError && (
						<div className="text-sm text-destructive">{importError}</div>
					)}
					<div className="mt-2 flex justify-end gap-2">
						<Button onClick={tryImportTravel}>
							{m["trip.import_itinerary"]()}
						</Button>
					</div>
				</div>
			</div>
		</ResponsiveModal>
	);
}

const renderAiportName = (airport: Airport) => {
	return match(airport.type)
		.with("city_group", () => `${airport.city} - ${airport.stateCode}`)
		.with("state_group", () => `${airport.state}`)
		.with("country_group", () => `${airport.country}`)
		.otherwise(() => `${airport.city} - ${airport.code}`);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function differenceInUtcCalendarDays(target: Date, reference: Date): number {
	const targetUtc = Date.UTC(
		target.getUTCFullYear(),
		target.getUTCMonth(),
		target.getUTCDate(),
	);
	const referenceUtc = Date.UTC(
		reference.getUTCFullYear(),
		reference.getUTCMonth(),
		reference.getUTCDate(),
	);
	return Math.round((targetUtc - referenceUtc) / MS_PER_DAY);
}

function getUtcDateForDisplay(date: Date): Date {
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}
