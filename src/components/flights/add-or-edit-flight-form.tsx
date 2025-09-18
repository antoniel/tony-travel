import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LocationOption } from "@/components/ui/location-selector";
import { LocationSelector } from "@/components/ui/location-selector";
import { useAirportsSearch } from "@/hooks/useAirportsSearch";
import { orpc } from "@/orpc/client";
// Minimal flight type needed by this form
type FlightForForm = {
	id: string;
	originAirport: string;
	destinationAirport: string;
	departureDate: Date;
	departureTime: string;
	arrivalDate: Date;
	arrivalTime: string;
	cost: number | null;
	participants: { id: string; user: { id: string } }[];
};
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, DollarSign, Info, Plane } from "lucide-react";
import { useMemo, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { match } from "ts-pattern";
import { z } from "zod";

// Form validation schema
const flightFormSchema = z
	.object({
		originAirport: z.string().min(1, "Aeroporto de origem é obrigatório"),
		destinationAirport: z.string().min(1, "Aeroporto de destino é obrigatório"),
		departureDate: z.string().min(1, "Data de partida é obrigatória"),
		departureTime: z.string().min(1, "Horário de partida é obrigatório"),
		arrivalDate: z.string().min(1, "Data de chegada é obrigatória"),
		arrivalTime: z.string().min(1, "Horário de chegada é obrigatório"),
		cost: z.string().optional(),
		participantIds: z
			.array(z.string())
			.min(0, "Selecione pelo menos um participante"),
	})
	.superRefine((data, ctx) => {
		try {
			const dep = new Date(`${data.departureDate}T${data.departureTime}:00`);
			const arr = new Date(`${data.arrivalDate}T${data.arrivalTime}:00`);
			if (Number.isNaN(dep.getTime()) || Number.isNaN(arr.getTime())) return;
			if (arr.getTime() <= dep.getTime()) {
				const issue = {
					code: z.ZodIssueCode.custom,
					message: "Chegada deve ser após a partida",
				};
				ctx.addIssue({ ...issue, path: ["arrivalDate"] });
				ctx.addIssue({ ...issue, path: ["arrivalTime"] });
			}
		} catch {}
	});

type FlightFormData = z.infer<typeof flightFormSchema>;

interface Member {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

interface DuplicateInfo {
	isDuplicate: boolean;
	existingFlightId: string | null;
	message?: string;
}

interface Airport {
	code: string;
	name: string;
	city: string;
	state: string | null;
	stateCode: string | null;
	country: string;
	countryCode: string;
	type: "airport" | "city_group" | "state_group" | "country_group";
	airportCount?: number;
	airportCodes?: string[];
}

export function AddOrEditFlightForm({
	flight,
	travelId,
	members,
	onClose,
}: {
	flight?: FlightForForm;
	travelId: string;
	members: Member[];
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const isEditMode = !!flight;
	const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(
		null,
	);

	// Initialize form with default values
	const form = useForm<FlightFormData>({
		resolver: zodResolver(flightFormSchema),
		defaultValues: {
			originAirport: flight?.originAirport || "",
			destinationAirport: flight?.destinationAirport || "",
			departureDate: flight
				? new Date(flight.departureDate).toISOString().split("T")[0]
				: "",
			departureTime: flight?.departureTime || "",
			arrivalDate: flight
				? new Date(flight.arrivalDate).toISOString().split("T")[0]
				: "",
			arrivalTime: flight?.arrivalTime || "",
			cost: flight?.cost?.toString() || "",
			participantIds: flight ? flight.participants.map((p) => p.user.id) : [],
		},
	});

	// Fetch travel data for date limits
	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);

	const destinationQueryString = useMemo(() => {
		const rawDestination = travelQuery.data?.destination?.trim();
		if (!rawDestination) return "";
		return rawDestination
			.split(",")[0]?.replace(/\s+-\s+Todos os aeroportos$/i, "")
			.trim();
	}, [travelQuery.data?.destination]);

	const destinationAirportsQuery = useQuery({
		...orpc.travelRoutes.searchAirports.queryOptions({
			input: {
				query: destinationQueryString,
				limit: 50,
				expandGroups: true,
			},
		}),
		enabled: destinationQueryString.length > 0,
		staleTime: 5 * 60 * 1000,
	});

	const recommendedDestinationOptions: LocationOption[] = useMemo(() => {
		if (!destinationAirportsQuery.data) return [];
		return destinationAirportsQuery.data.map((airport) => ({
			value: airport.code,
			label: renderAirportName(airport),
		}));
	}, [destinationAirportsQuery.data]);

	// Calculate date limits (2 days before/after travel dates)
	const { minDate, maxDate } = (() => {
		if (!travelQuery.data) return { minDate: "", maxDate: "" };

		const startDate = new Date(travelQuery.data.startDate);
		const endDate = new Date(travelQuery.data.endDate);

		const minDate = addDaysToDate(startDate, -2);
		const maxDate = addDaysToDate(endDate, 2);

		return {
			minDate: formatDateForInput(minDate),
			maxDate: formatDateForInput(maxDate),
		};
	})();

	// Mutations
	const createFlightMutation = useMutation(
		orpc.flightRoutes.createFlight.mutationOptions(),
	);
	const updateFlightMutation = useMutation(
		orpc.flightRoutes.updateFlight.mutationOptions(),
	);
	const addParticipantMutation = useMutation(
		orpc.flightRoutes.addFlightParticipant.mutationOptions(),
	);
	const removeParticipantMutation = useMutation(
		orpc.flightRoutes.removeFlightParticipant.mutationOptions(),
	);

	const onSubmit = async (data: FlightFormData) => {
		try {
			if (isEditMode && flight) {
				// Update existing flight
				const flightData = {
					id: flight.id,
					flight: {
						originAirport: data.originAirport,
						destinationAirport: data.destinationAirport,
						departureDate: new Date(data.departureDate),
						departureTime: data.departureTime,
						arrivalDate: new Date(data.arrivalDate),
						arrivalTime: data.arrivalTime,
						cost: data.cost ? Number.parseFloat(data.cost) : null,
					},
				};

				await updateFlightMutation.mutateAsync(flightData);

				// Handle participant updates
				const currentParticipantIds = flight.participants.map((p) => p.user.id);
				const participantsToAdd = data.participantIds.filter(
					(id) => !currentParticipantIds.includes(id),
				);
				const participantsToRemove = currentParticipantIds.filter(
					(id) => !data.participantIds.includes(id),
				);

				// Add new participants
				for (const userId of participantsToAdd) {
					await addParticipantMutation.mutateAsync({
						flightId: flight.id,
						userId,
					});
				}

				// Remove participants
				for (const userId of participantsToRemove) {
					await removeParticipantMutation.mutateAsync({
						flightId: flight.id,
						userId,
					});
				}
			} else {
				// Create new flight
				const flightData = {
					travelId,
					flight: {
						originAirport: data.originAirport,
						destinationAirport: data.destinationAirport,
						departureDate: new Date(data.departureDate),
						departureTime: data.departureTime,
						arrivalDate: new Date(data.arrivalDate),
						arrivalTime: data.arrivalTime,
						cost: data.cost ? Number.parseFloat(data.cost) : null,
						travelId,
					},
					participantIds: data.participantIds,
				};

				await createFlightMutation.mutateAsync(flightData);
			}

			// Refresh flights data
			queryClient.invalidateQueries(
				orpc.flightRoutes.getFlightsByTravel.queryOptions({
					input: { travelId },
				}),
			);

			onClose();
		} catch (error) {
			console.error(
				`Error ${isEditMode ? "updating" : "creating"} flight:`,
				error,
			);
		}
	};

	// Show loading state while fetching travel data
	if (travelQuery.isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
			</div>
		);
	}

	const isSubmitting = isEditMode
		? updateFlightMutation.isPending
		: createFlightMutation.isPending;

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex h-full flex-col overflow-hidden"
			>
				<div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
					<FlightDetailsSection
						form={form}
						setDuplicateInfo={isEditMode ? () => {} : setDuplicateInfo}
						recommendedDestinationOptions={recommendedDestinationOptions}
					/>

					<FlightTimesSection form={form} minDate={minDate} maxDate={maxDate} />

					<FlightCostSection
						form={form}
						setDuplicateInfo={isEditMode ? () => {} : setDuplicateInfo}
					/>

					{!isEditMode && duplicateInfo?.isDuplicate && (
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription>
								{duplicateInfo.message} Os participantes selecionados serão
								adicionados ao voo existente.
							</AlertDescription>
						</Alert>
					)}

					<FlightParticipantsSection form={form} members={members} />
				</div>
				<div className="border-t bg-background px-6 py-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							className="w-full sm:w-auto"
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							{isSubmitting
								? isEditMode
									? "Atualizando..."
									: "Adicionando..."
								: isEditMode
									? "Atualizar Voo"
									: "Adicionar Voo"}
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}

const formatDateForInput = (date: Date) => {
	return date.toISOString().split("T")[0];
};

const addDaysToDate = (date: Date, days: number) => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

function FlightParticipantsSection({
	form,
	members,
}: { form: UseFormReturn<FlightFormData>; members: Member[] }) {
	return (
		<FormField
			control={form.control}
			name="participantIds"
			render={({ field }) => (
				<FormItem>
					<FormLabel className="font-semibold text-base text-foreground">
						Participantes
					</FormLabel>
					<FormControl>
						<div className="space-y-3">
							{members.map((member) => (
								<div
									key={member.id}
									className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
								>
									<Checkbox
										id={member.id}
										checked={field.value.includes(member.id)}
										onCheckedChange={(checked) => {
											if (checked) {
												field.onChange([...field.value, member.id]);
											} else {
												field.onChange(
													field.value.filter((id: string) => id !== member.id),
												);
											}
										}}
										className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
									/>
									<div className="flex items-center gap-3">
										<Avatar className="h-8 w-8">
											<AvatarImage src={member.image || undefined} />
											<AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-accent/10 text-primary font-semibold">
												{member.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</AvatarFallback>
										</Avatar>
										<Label
											htmlFor={member.id}
											className="font-medium cursor-pointer flex-1"
										>
											{member.name}
										</Label>
									</div>
								</div>
							))}
						</div>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

function FlightDetailsSection({
	form,
	setDuplicateInfo,
	recommendedDestinationOptions,
}: {
	form: UseFormReturn<FlightFormData>;
	setDuplicateInfo: (info: DuplicateInfo | null) => void;
	recommendedDestinationOptions: LocationOption[];
}) {
	const [originSearch, setOriginSearch] = useState("");
	const [destinationSearch, setDestinationSearch] = useState("");
	const [isOriginOpen, setIsOriginOpen] = useState(false);
	const [isDestinationOpen, setIsDestinationOpen] = useState(false);

	// Recommended options based on last home selections
	const { data: originResults = [] } = useAirportsSearch(
		originSearch,
		10,
		true,
	);
	const { data: destinationResults = [] } = useAirportsSearch(
		destinationSearch,
		10,
		true,
	);

	const originOptions = useMemo(() => {
		const results = originResults.map((airport) => ({
			value: airport.code,
			label: renderAirportName(airport),
		}));
		const map = new Map<string, LocationOption>();
		for (const o of results) {
			if (!map.has(o.value)) map.set(o.value, o);
		}
		return Array.from(map.values());
	}, [originResults]);

	const destinationOptions = useMemo(() => {
		const results = destinationResults.map((airport) => ({
			value: airport.code,
			label: renderAirportName(airport),
		}));
		const map = new Map<string, LocationOption>();
		const combined = destinationSearch.trim().length > 0
			? [...results, ...recommendedDestinationOptions]
			: [...recommendedDestinationOptions, ...results];
		for (const o of combined) {
			if (!map.has(o.value)) map.set(o.value, o);
		}
		return Array.from(map.values());
	}, [destinationResults, recommendedDestinationOptions, destinationSearch]);

	return (
		<div className="space-y-6">
			<h4 className="font-semibold text-base text-foreground">
				Detalhes do Voo
			</h4>

			<div className="space-y-4">
				<div className="grid grid-cols-1 gap-6">
					<FormField
						control={form.control}
						name="originAirport"
						render={({ field }) => {
							const selectedOrigin = field.value
								? [{ value: field.value, label: field.value }]
								: [];

							return (
								<FormItem>
									<FormControl>
										<LocationSelector
											label="Aeroporto de Origem *"
											placeholder="Selecione o aeroporto de partida"
											searchPlaceholder="Buscar aeroporto..."
											selectedLabel="Origem selecionada"
											icon={<Plane className="h-4 w-4" />}
											options={originOptions}
											selected={selectedOrigin}
											onSelectionChange={(selected) => {
												field.onChange(selected[0]?.value || "");
												setDuplicateInfo(null);
											}}
											multiple={false}
											searchValue={originSearch}
											onSearchChange={setOriginSearch}
											isOpen={isOriginOpen}
											onOpenChange={setIsOriginOpen}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					<FormField
						control={form.control}
						name="destinationAirport"
						render={({ field }) => {
							const selectedDestination = field.value
								? [{ value: field.value, label: field.value }]
								: [];

							return (
								<FormItem>
									<FormControl>
										<LocationSelector
											label="Aeroporto de Destino *"
											placeholder="Selecione o aeroporto de chegada"
											searchPlaceholder="Buscar aeroporto..."
											selectedLabel="Destino selecionado"
											icon={<Plane className="h-4 w-4" />}
											options={destinationOptions}
											selected={selectedDestination}
											onSelectionChange={(selected) => {
												field.onChange(selected[0]?.value || "");
												setDuplicateInfo(null);
											}}
											multiple={false}
											searchValue={destinationSearch}
											onSearchChange={setDestinationSearch}
											isOpen={isDestinationOpen}
											onOpenChange={setIsDestinationOpen}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
				</div>
			</div>
		</div>
	);
}

function FlightTimesSection({
	form,
	minDate,
	maxDate,
}: {
	form: UseFormReturn<FlightFormData>;
	minDate: string;
	maxDate: string;
}) {
	const departureDate = form.watch("departureDate");
	const departureTime = form.watch("departureTime");
	const arrivalDate = form.watch("arrivalDate");

	const arrivalMinDate = departureDate || minDate;
	const arrivalTimeMin =
		arrivalDate && departureDate && arrivalDate === departureDate
			? departureTime || undefined
			: undefined;

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<h4 className="font-semibold text-base text-foreground flex items-center gap-2">
					<Calendar className="w-4 h-4 text-primary" />
					Partida
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="departureDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Data *</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="date"
										min={minDate}
										max={maxDate}
										className="h-11"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="departureTime"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Horário *</FormLabel>
								<FormControl>
									<Input {...field} type="time" className="h-11" />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>

			<div className="space-y-4">
				<h4 className="font-semibold text-base text-foreground flex items-center gap-2">
					<Calendar className="w-4 h-4 text-accent" />
					Chegada
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="arrivalDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Data *</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="date"
										min={arrivalMinDate}
										max={maxDate}
										className="h-11"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="arrivalTime"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Horário *</FormLabel>
								<FormControl>
									<Input
										{...field}
										type="time"
										min={arrivalTimeMin}
										className="h-11"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>
		</div>
	);
}

function FlightCostSection({
	form,
	setDuplicateInfo,
}: {
	form: UseFormReturn<FlightFormData>;
	setDuplicateInfo: (info: DuplicateInfo | null) => void;
}) {
	// Helpers to mirror the home budget mask (pt-BR)
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

	return (
		<div className="space-y-4">
			<h4 className="font-semibold text-base text-foreground flex items-center gap-2">
				<DollarSign className="w-4 h-4 text-emerald-600" />
				Valor da Passagem
			</h4>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="cost"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Preço (R$)</FormLabel>
							<FormControl>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
										R$
									</span>
									<Input
										value={formatDecimalStringPtBR(field.value || "")}
										type="text"
										inputMode="numeric"
										placeholder="0,00"
										className="h-11 pl-8"
										onChange={(e) => {
											const raw = e.target.value;
											const digits = raw.replace(/\D/g, "");
											if (!digits) {
												field.onChange("");
												setDuplicateInfo(null);
												return;
											}
											const cents = Number.parseInt(digits, 10);
											const decimal = (cents / 100).toFixed(2); // normalized with dot
											field.onChange(decimal);
											setDuplicateInfo(null);
										}}
									/>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</div>
	);
}

const renderAirportName = (airport: Airport) => {
	return match(airport.type)
		.with("city_group", () => `${airport.city} - ${airport.stateCode}`)
		.with("state_group", () => `${airport.state}`)
		.with("country_group", () => `${airport.country}`)
		.otherwise(() => `${airport.city} - ${airport.code}`);
};
