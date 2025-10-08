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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAirportsSearch } from "@/hooks/useAirportsSearch";
import {
	formatDecimalStringPtBR,
	normalizeCurrencyInputPtBR,
} from "@/lib/currency";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Info, Plane, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	type Resolver,
	type UseFormReturn,
	useFieldArray,
	useForm,
	useFormContext,
} from "react-hook-form";
import { match } from "ts-pattern";
import { z } from "zod";
// Minimal flight type needed by this form
type FlightForForm = {
	id: string;
	totalAmount: number | null;
	currency: string | null;
	slices: {
		id: string;
		originAirport: string;
		destinationAirport: string;
		cabinClass?: string | null;
		cabinClassMarketingName?: string | null;
		durationMinutes?: number | null;
		segments: {
			id: string;
			originAirport: string;
			destinationAirport: string;
			departureDate: Date;
			departureTime: string;
			arrivalDate: Date;
			arrivalTime: string;
			marketingFlightNumber?: string | null;
			operatingCarrierCode?: string | null;
			aircraftName?: string | null;
			aircraftType?: string | null;
			distanceMeters?: number | null;
			durationMinutes?: number | null;
		}[];
	}[];
	participants: { id: string; user: { id: string } }[];
};

const flightSegmentSchema = z
	.object({
		id: z.string().optional(),
		originAirport: z.string().min(1, m["validation.origin_airport_required"]()),
		destinationAirport: z
			.string()
			.min(1, m["validation.destination_airport_required"]()),
		departureDate: z.string().min(1, m["validation.departure_date_required"]()),
		departureTime: z.string().min(1, m["validation.departure_time_required"]()),
		arrivalDate: z.string().min(1, m["validation.arrival_date_required"]()),
		arrivalTime: z.string().min(1, m["validation.arrival_time_required"]()),
		marketingFlightNumber: z.string().optional(),
		operatingCarrierCode: z.string().optional(),
		aircraftName: z.string().optional(),
		aircraftType: z.string().optional(),
		distanceMeters: z.string().optional(),
		durationMinutes: z.string().optional(),
	})
	.superRefine((segment, ctx) => {
		const departure = new Date(
			`${segment.departureDate}T${segment.departureTime}:00`,
		);
		const arrival = new Date(
			`${segment.arrivalDate}T${segment.arrivalTime}:00`,
		);
		if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
			return;
		}
		if (arrival.getTime() <= departure.getTime()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: m["validation.arrival_after_departure"](),
				path: ["arrivalDate"],
			});
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: m["validation.arrival_after_departure"](),
				path: ["arrivalTime"],
			});
		}
	});

const flightSliceSchema = z.object({
	id: z.string().optional(),
	originAirport: z.string().optional(),
	destinationAirport: z.string().optional(),
	cabinClass: z.string().optional(),
	cabinClassMarketingName: z.string().optional(),
	durationMinutes: z.string().optional(),
	segments: z
		.array(flightSegmentSchema)
		.min(1, "Adicione pelo menos um trecho"),
});

// Form validation schema
const flightFormSchema = z.object({
	totalAmount: z.string().optional(),
	currency: z
		.string()
		.trim()
		.length(3, "Moeda deve conter 3 caracteres")
		.default("BRL"),
	slices: z.array(flightSliceSchema).min(1, "Adicione pelo menos um slice"),
	participantIds: z.array(z.string()).min(0),
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

const createEmptySegment = () => ({
	id: undefined as string | undefined,
	originAirport: "",
	destinationAirport: "",
	departureDate: "",
	departureTime: "",
	arrivalDate: "",
	arrivalTime: "",
	marketingFlightNumber: "",
	operatingCarrierCode: "",
	aircraftName: "",
	aircraftType: "",
	distanceMeters: "",
	durationMinutes: "",
});

const createEmptySlice = () => ({
	id: undefined as string | undefined,
	originAirport: "",
	destinationAirport: "",
	cabinClass: "",
	cabinClassMarketingName: "",
	durationMinutes: "",
	segments: [createEmptySegment()],
});

const mapFlightToFormValues = (flight?: FlightForForm): FlightFormData => {
	const slices = (flight?.slices || []).map((slice) => ({
		id: slice.id,
		originAirport: slice.originAirport,
		destinationAirport: slice.destinationAirport,
		cabinClass: slice.cabinClass ?? "",
		cabinClassMarketingName: slice.cabinClassMarketingName ?? "",
		durationMinutes: slice.durationMinutes?.toString() ?? "",
		segments: slice.segments.map((segment) => ({
			id: segment.id,
			originAirport: segment.originAirport,
			destinationAirport: segment.destinationAirport,
			departureDate: formatDateForInput(segment.departureDate),
			departureTime: segment.departureTime,
			arrivalDate: formatDateForInput(segment.arrivalDate),
			arrivalTime: segment.arrivalTime,
			marketingFlightNumber: segment.marketingFlightNumber ?? "",
			operatingCarrierCode: segment.operatingCarrierCode ?? "",
			aircraftName: segment.aircraftName ?? "",
			aircraftType: segment.aircraftType ?? "",
			distanceMeters: segment.distanceMeters?.toString() ?? "",
			durationMinutes: segment.durationMinutes?.toString() ?? "",
		})),
	}));

	return {
		totalAmount:
			flight?.totalAmount != null ? flight.totalAmount.toString() : "",
		currency: flight?.currency ?? "BRL",
		slices: slices.length > 0 ? slices : [createEmptySlice()],
		participantIds: flight
			? flight.participants.map((participant) => participant.user.id)
			: [],
	};
};

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
		resolver: zodResolver(flightFormSchema) as Resolver<FlightFormData>,
		defaultValues:
			flight != null
				? mapFlightToFormValues(flight)
				: {
						currency: "BRL",
						totalAmount: "",
						slices: [createEmptySlice()],
						participantIds: [],
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
			.split(",")[0]
			?.replace(/\s+-\s+Todos os aeroportos$/i, "")
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
			const totalAmount = parseCurrencyInput(data.totalAmount);
			const slicesPayload = data.slices.map((slice) => {
				const firstSegment = slice.segments[0];
				const lastSegment =
					slice.segments[slice.segments.length - 1] ?? firstSegment;

				const sliceDurationFromSegments = calculateSliceDurationMinutes(
					slice.segments,
				);

				return {
					originAirport:
						firstSegment?.originAirport ?? slice.originAirport ?? "",
					destinationAirport:
						lastSegment?.destinationAirport ?? slice.destinationAirport ?? "",
					durationMinutes:
						toOptionalInteger(slice.durationMinutes) ??
						sliceDurationFromSegments,
					cabinClass: emptyToNull(slice.cabinClass),
					cabinClassMarketingName: emptyToNull(slice.cabinClassMarketingName),
					segments: slice.segments.map((segment) => ({
						originAirport: segment.originAirport,
						destinationAirport: segment.destinationAirport,
						departureDate: new Date(segment.departureDate),
						departureTime: segment.departureTime,
						arrivalDate: new Date(segment.arrivalDate),
						arrivalTime: segment.arrivalTime,
						marketingFlightNumber: emptyToNull(segment.marketingFlightNumber),
						operatingCarrierCode: emptyToNull(segment.operatingCarrierCode),
						aircraftName: emptyToNull(segment.aircraftName),
						aircraftType: emptyToNull(segment.aircraftType),
						distanceMeters: toOptionalInteger(segment.distanceMeters),
						durationMinutes: toOptionalInteger(segment.durationMinutes),
					})),
				};
			});

			const baseFlightPayload = {
				totalAmount,
				currency: data.currency || "BRL",
				slices: slicesPayload,
			};

			if (isEditMode && flight) {
				// Update existing flight
				const flightData = {
					id: flight.id,
					flight: baseFlightPayload,
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
					flight: baseFlightPayload,
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
			queryClient.invalidateQueries(
				orpc.conciergeRoutes.getPendingIssues.queryOptions({
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
					<FlightSlicesSection
						form={form}
						minDate={minDate}
						maxDate={maxDate}
						recommendedDestinationOptions={recommendedDestinationOptions}
						setDuplicateInfo={isEditMode ? () => {} : setDuplicateInfo}
					/>

					<FlightPricingSection
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

function FlightSlicesSection({
	form,
	minDate,
	maxDate,
	recommendedDestinationOptions,
	setDuplicateInfo,
}: {
	form: UseFormReturn<FlightFormData>;
	minDate: string;
	maxDate: string;
	recommendedDestinationOptions: LocationOption[];
	setDuplicateInfo: (info: DuplicateInfo | null) => void;
}) {
	const slicesArray = useFieldArray({
		control: form.control,
		name: "slices",
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h4 className="font-semibold text-base text-foreground">
						Rotas e trechos
					</h4>
					<p className="text-sm text-muted-foreground">
						Adicione conexões ou rotas separadas para o mesmo voo.
					</p>
				</div>
				{/** optional info area */}
			</div>

			<div className="space-y-4">
				{slicesArray.fields.map((sliceField, sliceIndex) => (
					<FlightSliceCard
						key={sliceField.id}
						form={form}
						sliceIndex={sliceIndex}
						totalSlices={slicesArray.fields.length}
						removeSlice={(index) => {
							slicesArray.remove(index);
							setDuplicateInfo(null);
						}}
						minDate={minDate}
						maxDate={maxDate}
						recommendedDestinationOptions={recommendedDestinationOptions}
						setDuplicateInfo={setDuplicateInfo}
					/>
				))}
			</div>

			<Button
				type="button"
				variant="outline"
				onClick={() => {
					slicesArray.append(createEmptySlice());
					setDuplicateInfo(null);
				}}
				className="w-full justify-center gap-2"
			>
				<Plus className="h-4 w-4" /> Adicionar rota
			</Button>
		</div>
	);
}

function FlightSliceCard({
	form,
	sliceIndex,
	totalSlices,
	removeSlice,
	minDate,
	maxDate,
	recommendedDestinationOptions,
	setDuplicateInfo,
}: {
	form: UseFormReturn<FlightFormData>;
	sliceIndex: number;
	totalSlices: number;
	removeSlice: (index: number) => void;
	minDate: string;
	maxDate: string;
	recommendedDestinationOptions: LocationOption[];
	setDuplicateInfo: (info: DuplicateInfo | null) => void;
}) {
	const segmentsArray = useFieldArray({
		control: form.control,
		name: `slices.${sliceIndex}.segments` as const,
	});

	const segments = form.watch(
		`slices.${sliceIndex}.segments` as const,
	) as FlightFormData["slices"][number]["segments"];
	const firstSegment = segments?.[0];
	const lastSegment = segments?.[segments.length - 1] ?? firstSegment;

	useEffect(() => {
		if (firstSegment?.originAirport) {
			form.setValue(
				`slices.${sliceIndex}.originAirport` as const,
				firstSegment.originAirport,
				{ shouldDirty: true },
			);
		}
	}, [firstSegment?.originAirport, form, sliceIndex]);

	useEffect(() => {
		if (lastSegment?.destinationAirport) {
			form.setValue(
				`slices.${sliceIndex}.destinationAirport` as const,
				lastSegment.destinationAirport,
				{ shouldDirty: true },
			);
		}
	}, [lastSegment?.destinationAirport, form, sliceIndex]);

	return (
		<div className="rounded-xl border border-border/60 bg-background/70 shadow-sm">
			<div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
				<div className="space-y-1">
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Rota {sliceIndex + 1}
					</p>
					<h5 className="text-lg font-semibold text-foreground">
						{firstSegment?.originAirport || "Origem"} →{" "}
						{lastSegment?.destinationAirport || "Destino"}
					</h5>
				</div>
				{totalSlices > 1 ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => removeSlice(sliceIndex)}
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				) : null}
			</div>
			<div className="space-y-4 p-4">
				{segmentsArray.fields.map((segmentField, segmentIndex) => (
					<FlightSegmentFields
						key={segmentField.id}
						form={form}
						sliceIndex={sliceIndex}
						segmentIndex={segmentIndex}
						minDate={minDate}
						maxDate={maxDate}
						recommendedDestinationOptions={recommendedDestinationOptions}
						canRemove={segmentsArray.fields.length > 1}
						removeSegment={() => segmentsArray.remove(segmentIndex)}
						shouldClearDuplicate={sliceIndex === 0 && segmentIndex === 0}
						setDuplicateInfo={setDuplicateInfo}
					/>
				))}

				<Button
					type="button"
					variant="ghost"
					onClick={() => {
						segmentsArray.append(createEmptySegment());
						setDuplicateInfo(null);
					}}
					className="flex w-full items-center justify-center gap-2"
				>
					<Plus className="h-4 w-4" /> Adicionar trecho
				</Button>
			</div>
		</div>
	);
}

function FlightSegmentFields({
	form,
	sliceIndex,
	segmentIndex,
	minDate,
	maxDate,
	recommendedDestinationOptions,
	canRemove,
	removeSegment,
	shouldClearDuplicate,
	setDuplicateInfo,
}: {
	form: UseFormReturn<FlightFormData>;
	sliceIndex: number;
	segmentIndex: number;
	minDate: string;
	maxDate: string;
	recommendedDestinationOptions: LocationOption[];
	canRemove: boolean;
	removeSegment: () => void;
	shouldClearDuplicate: boolean;
	setDuplicateInfo: (info: DuplicateInfo | null) => void;
}) {
	const [isOriginOpen, setIsOriginOpen] = useState(false);
	const [isDestinationOpen, setIsDestinationOpen] = useState(false);
	const baseName = `slices.${sliceIndex}.segments.${segmentIndex}` as const;
	const departureDate = form.watch(`${baseName}.departureDate` as const);
	const departureTime = form.watch(`${baseName}.departureTime` as const);
	const arrivalDate = form.watch(`${baseName}.arrivalDate` as const);

	const arrivalMinDate = departureDate || minDate;
	const arrivalMinTime =
		arrivalDate && departureDate && arrivalDate === departureDate
			? departureTime || undefined
			: undefined;

	const [originSearch, setOriginSearch] = useState("");
	const [destinationSearch, setDestinationSearch] = useState("");

	const { data: originResults = [] } = useAirportsSearch(
		originSearch,
		10,
		true,
	);
	const originOptions = useMemo(() => {
		const options = originResults.map((airport) => ({
			value: airport.code,
			label: renderAirportName(airport),
		}));
		const map = new Map<string, LocationOption>();
		for (const option of options) {
			if (!map.has(option.value)) {
				map.set(option.value, option);
			}
		}
		return Array.from(map.values());
	}, [originResults]);

	const { data: destinationResults = [] } = useAirportsSearch(
		destinationSearch,
		10,
		true,
	);
	const destinationOptions = useMemo(() => {
		const resultOptions = destinationResults.map((airport) => ({
			value: airport.code,
			label: renderAirportName(airport),
		}));
		const map = new Map<string, LocationOption>();
		const combined =
			destinationSearch.trim().length > 0
				? [...resultOptions, ...recommendedDestinationOptions]
				: [...recommendedDestinationOptions, ...resultOptions];
		for (const option of combined) {
			if (!map.has(option.value)) {
				map.set(option.value, option);
			}
		}
		return Array.from(map.values());
	}, [destinationResults, recommendedDestinationOptions, destinationSearch]);

	const clearDuplicateIfNeeded = () => {
		if (shouldClearDuplicate) {
			setDuplicateInfo(null);
		}
	};

	return (
		<div className="space-y-4 rounded-lg border border-border/50 bg-background p-4">
			<div className="flex items-center justify-between">
				<h6 className="text-sm font-semibold text-foreground">
					Trecho {segmentIndex + 1}
				</h6>
				{canRemove ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							removeSegment();
							setDuplicateInfo(null);
						}}
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				) : null}
			</div>

			<div className="grid grid-cols-1 gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
				<FormField
					control={form.control}
					name={`${baseName}.originAirport` as const}
					render={({ field }) => {
						const selected = field.value
							? [{ value: field.value, label: field.value }]
							: [];
						return (
							<FormItem>
								<FormControl>
									<LocationSelector
										isOpen={isOriginOpen}
										onOpenChange={setIsOriginOpen}
										label="Origem *"
										placeholder="Aeroporto de partida"
										searchPlaceholder="Buscar aeroporto..."
										selectedLabel="Origem selecionada"
										icon={<Plane className="h-4 w-4" />}
										options={originOptions}
										selected={selected}
										onSelectionChange={(selectedOption) => {
											field.onChange(selectedOption[0]?.value || "");
											clearDuplicateIfNeeded();
										}}
										multiple={false}
										searchValue={originSearch}
										onSearchChange={setOriginSearch}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				<FormField
					control={form.control}
					name={`${baseName}.destinationAirport` as const}
					render={({ field }) => {
						const selected = field.value
							? [{ value: field.value, label: field.value }]
							: [];
						return (
							<FormItem>
								<FormControl>
									<LocationSelector
										isOpen={isDestinationOpen}
										onOpenChange={setIsDestinationOpen}
										label="Destino *"
										placeholder="Aeroporto de chegada"
										searchPlaceholder="Buscar aeroporto..."
										selectedLabel="Destino selecionado"
										icon={<Plane className="h-4 w-4" />}
										options={destinationOptions}
										selected={selected}
										onSelectionChange={(selectedOption) => {
											field.onChange(selectedOption[0]?.value || "");
											clearDuplicateIfNeeded();
										}}
										multiple={false}
										searchValue={destinationSearch}
										onSearchChange={setDestinationSearch}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						);
					}}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
				<FormField
					control={form.control}
					name={`${baseName}.departureDate` as const}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Data de partida *</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="date"
									min={minDate}
									max={maxDate}
									onChange={(event) => {
										field.onChange(event.target.value);
										clearDuplicateIfNeeded();
									}}
									className="h-11"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name={`${baseName}.departureTime` as const}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Horário de partida *</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="time"
									onChange={(event) => {
										field.onChange(event.target.value);
										clearDuplicateIfNeeded();
									}}
									className="h-11"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 md:[grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
				<FormField
					control={form.control}
					name={`${baseName}.arrivalDate` as const}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Data de chegada *</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="date"
									min={arrivalMinDate}
									max={maxDate}
									onChange={(event) => {
										field.onChange(event.target.value);
										clearDuplicateIfNeeded();
									}}
									className="h-11"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name={`${baseName}.arrivalTime` as const}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Horário de chegada *</FormLabel>
							<FormControl>
								<Input
									{...field}
									type="time"
									min={arrivalMinTime}
									onChange={(event) => {
										field.onChange(event.target.value);
										clearDuplicateIfNeeded();
									}}
									className="h-11"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</div>
	);
}

function FlightPricingSection({
	setDuplicateInfo,
}: {
	setDuplicateInfo: (info: DuplicateInfo | null) => void;
}) {
	const form = useFormContext<FlightFormData>();
	return (
		<div className="space-y-6">
			<h4 className="font-semibold text-base text-foreground flex items-center gap-2">
				<DollarSign className="h-4 w-4 text-emerald-600" />
				Custos
			</h4>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="md:col-span-2">
					<FormField
						control={form.control}
						name="totalAmount"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Total (valor)
									{form.watch("currency") === "BRL" ? " (R$)" : null}
								</FormLabel>
								<FormControl>
									<div className="relative">
										{form.watch("currency") === "BRL" ? (
											<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
												R$
											</span>
										) : null}
										<Input
											value={formatDecimalStringPtBR(field.value || "")}
											type="text"
											inputMode="numeric"
											placeholder="0,00"
											className={
												form.watch("currency") === "BRL" ? "h-11 pl-8" : "h-11"
											}
											onChange={(event) => {
												const { decimal } = normalizeCurrencyInputPtBR(
													event.target.value,
												);
												if (!decimal) {
													field.onChange("");
													setDuplicateInfo(null);
													return;
												}
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

				<FormField
					control={form.control}
					name="currency"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Moeda</FormLabel>
							<Select
								defaultValue={field.value}
								onValueChange={(value) => {
									field.onChange(value);
									setDuplicateInfo(null);
								}}
							>
								<FormControl>
									<SelectTrigger className="h-11">
										<SelectValue placeholder="Selecione" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="BRL">BRL</SelectItem>
									<SelectItem value="USD">USD</SelectItem>
									<SelectItem value="EUR">EUR</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>
		</div>
	);
}

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
									className="flex items-center space-x-3 rounded-lg border border-border/50 p-3 transition-colors hover:border-border"
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
											<AvatarFallback className="bg-gradient-to-br from-primary/10 to-accent/10 text-xs font-semibold text-primary">
												{member.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</AvatarFallback>
										</Avatar>
										<Label
											htmlFor={member.id}
											className="flex-1 cursor-pointer font-medium"
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

function parseCurrencyInput(value?: string) {
	if (!value) return null;
	const normalized = value.replace(",", ".");
	const parsed = Number.parseFloat(normalized);
	return Number.isNaN(parsed) ? null : parsed;
}

function toOptionalInteger(value?: string) {
	if (value === undefined || value === null || value.trim() === "") {
		return null;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? null : parsed;
}

function emptyToNull(value?: string | undefined) {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function calculateSegmentDurationMinutes(
	departureDate: string,
	departureTime: string,
	arrivalDate: string,
	arrivalTime: string,
) {
	const departure = new Date(`${departureDate}T${departureTime}:00`);
	const arrival = new Date(`${arrivalDate}T${arrivalTime}:00`);

	if (
		Number.isNaN(departure.getTime()) ||
		Number.isNaN(arrival.getTime()) ||
		arrival.getTime() <= departure.getTime()
	) {
		return null;
	}

	return Math.round((arrival.getTime() - departure.getTime()) / 60000);
}

function calculateSliceDurationMinutes(
	segments: FlightFormData["slices"][number]["segments"],
) {
	const first = segments[0];
	const last = segments[segments.length - 1] ?? first;
	if (!first || !last) {
		return null;
	}
	return calculateSegmentDurationMinutes(
		first.departureDate,
		first.departureTime,
		last.arrivalDate,
		last.arrivalTime,
	);
}

function formatDateForInput(date: Date) {
	return date.toISOString().split("T")[0];
}

function addDaysToDate(date: Date, days: number) {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

const renderAirportName = (airport: Airport) => {
	return match(airport.type)
		.with("city_group", () => `${airport.city} - ${airport.stateCode}`)
		.with("state_group", () => `${airport.state}`)
		.with("country_group", () => `${airport.country}`)
		.otherwise(() => `${airport.city} - ${airport.code}`);
};
