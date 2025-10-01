import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LocationSelector } from "@/components/ui/location-selector";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAirportsSearch } from "@/hooks/useAirportsSearch";
import type { Travel } from "@/lib/db/schema";
import { orpc } from "@/orpc/client";
import type {
	Airport,
	LocationOption,
} from "@/orpc/modules/travel/travel.model";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plane, Trash2 } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import * as m from "@/paraglide/messages";

export const Route = createFileRoute("/trip/$travelId/settings/")({
	component: () => (
		<Suspense fallback={<TripSettingsSkeleton />}>
			<TripSettingsPage />
		</Suspense>
	),
});

// Form validation schema
const TravelSettingsSchema = z
	.object({
		name: z
			.string()
			.min(1, m["validation.required_field"]())
			.max(255, m["validation.max_length"]({ max: 255 })),
		startDate: z.date({ message: m["validation.required_field"]() }),
		endDate: z.date({ message: m["validation.required_field"]() }),
		description: z
			.string()
			.max(1000, m["validation.max_length"]({ max: 1000 }))
			.optional(),
		destinationAirports: z
			.array(
				z.object({
					value: z.string(),
					label: z.string(),
				}),
			)
			.min(1, m["validation.required_field"]()),
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: m["validation.end_date_after_start"](),
		path: ["endDate"],
	})

type TravelSettingsFormData = z.infer<typeof TravelSettingsSchema>;

// Delete confirmation schema
const DeleteConfirmationSchema = z.object({
	confirmationName: z
		.string()
		.min(1, m["trip.settings.delete_name_hint"]()),
});

type DeleteConfirmationData = z.infer<typeof DeleteConfirmationSchema>;

function TripSettingsPage() {
	const { travelId } = Route.useParams();

	// Check if user is owner
	const { data: travel } = useSuspenseQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	)

	// Redirect if not owner
	const navigate = useNavigate();
	useEffect(() => {
		if (travel && travel.userMembership?.role !== "owner") {
			navigate({ to: `/trip/${travelId}` });
		}
	}, [travel, travelId, navigate]);

	if (!travel || travel.userMembership?.role !== "owner") {
		return (
			<div className="space-y-4">
				<h1 className="text-2xl font-bold text-destructive">
					{m["membership.access_denied_title"]()}
				</h1>
				<p className="text-muted-foreground">
					{m["membership.access_denied_description"]()}
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">
					{m["trip.settings.page_title"]()}
				</h1>
				<p className="text-muted-foreground">
					{m["trip.settings.page_description"]()}
				</p>
			</div>

			<TravelSettingsForm travel={travel} />
			<Separator />
			<DangerZone travel={travel} />
		</div>
	)
}

function TravelSettingsForm({
	travel,
}: {
	travel: Pick<
		Travel,
		| "id"
		| "name"
		| "startDate"
		| "endDate"
		| "description"
		| "destinationAirports"
		| "destination"
	>
}) {
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [destinationSearch, setDestinationSearch] = useState("");
	const [isDestinationOpen, setIsDestinationOpen] = useState(false);

	const { data: destinationResults = [] } = useAirportsSearch(
		destinationSearch,
		15,
		true,
	)

	const destinationQueryString = useMemo(() => {
		const raw = travel.destination?.split(",")[0]?.trim();
		if (!raw) return "";
		return raw.replace(/\s+-\s+Todos os aeroportos$/i, "").trim();
	}, [travel.destination]);

	const { data: recommendedDestinationAirports = [] } = useSuspenseQuery({
		...orpc.travelRoutes.searchAirports.queryOptions({
			input: {
				query: destinationQueryString,
				limit: 25,
				expandGroups: true,
			},
		}),
		staleTime: 5 * 60 * 1000,
	})

	const form = useForm<TravelSettingsFormData>({
		resolver: zodResolver(TravelSettingsSchema),
		defaultValues: {
			name: travel.name || "",
			startDate: travel.startDate ? new Date(travel.startDate) : new Date(),
			endDate: travel.endDate ? new Date(travel.endDate) : new Date(),
			description: travel.description || "",
			destinationAirports:
				travel.destinationAirports && travel.destinationAirports.length > 0
					? travel.destinationAirports
					: [
							{
								value: travel.destination,
								label: travel.destination,
							},
						],
		},
	})

	const currentDestinationAirports =
		(form.watch("destinationAirports") as LocationOption[] | undefined) || [];

	const recommendedOptions = recommendedDestinationAirports.map((airport) => ({
		value: airport.code,
		label: formatAirportLabel(airport),
	}));

	const destinationOptions = useMemo(() => {
		const mappedResults = destinationResults.map((airport) => ({
			value: airport.code,
			label: formatAirportLabel(airport),
		}))
		const merged = new Map<string, LocationOption>();
		for (const option of [
			...currentDestinationAirports,
			...recommendedOptions,
			...mappedResults,
		]) {
			if (!merged.has(option.value)) {
				merged.set(option.value, option);
			}
		}
		return Array.from(merged.values());
	}, [destinationResults, recommendedOptions, currentDestinationAirports]);

	const updateTravelMutation = useMutation({
		...orpc.travelRoutes.updateTravel.mutationOptions(),
		onSuccess: () => {
			toast.success(m["trip.settings.update_success"]());
			queryClient.invalidateQueries({
				queryKey: orpc.travelRoutes.getTravel.queryKey({
					input: { id: travel.id },
				}),
			})
		},
		onError: (error) => {
			toast.error(m["trip.settings.update_error"]());
			console.error("Update error:", error);
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	})

	const onSubmit = (data: TravelSettingsFormData) => {
		setIsSubmitting(true);
		// Convert form data to match backend UpdateTravelSchema expectations
		const updateData = {
			name: data.name,
			description: data.description || null,
			startDate: data.startDate,
			endDate: data.endDate,
			destination: data.destinationAirports
				.map((airport) => airport.label)
				.join(", "),
			destinationAirports: data.destinationAirports,
		}
		updateTravelMutation.mutate({
			travelId: travel.id,
			updateData,
		})
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-lg font-semibold">
					{m["trip.settings.details_section_title"]()}
				</h2>
				<p className="text-sm text-muted-foreground">
					{m["trip.settings.details_section_description"]()}
				</p>
			</div>

			<div className="rounded-lg border bg-card p-6">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{m["trip.settings.name_label"]()}</FormLabel>
									<FormControl>
										<Input placeholder={m["trip.name_placeholder"]()} {...field} />
									</FormControl>
									<FormDescription>
										{m["trip.settings.name_description"]()}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="startDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{m["trip.settings.start_label"]()}</FormLabel>
									<FormControl>
											<Input
												type="date"
												{...field}
												value={
													field.value instanceof Date
														? field.value.toISOString().split("T")[0]
														: field.value
												}
												onChange={(e) =>
													field.onChange(new Date(e.target.value))
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

						<FormField
							control={form.control}
							name="endDate"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{m["trip.settings.end_label"]()}</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
												value={
													field.value instanceof Date
														? field.value.toISOString().split("T")[0]
														: field.value
												}
												onChange={(e) =>
													field.onChange(new Date(e.target.value))
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="destinationAirports"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{m["trip.settings.destinations_label"]()}</FormLabel>
									<FormDescription>
										{m["trip.settings.destinations_description"]()}
									</FormDescription>
									<FormControl>
										<LocationSelector
											label={m["trip.settings.destinations_label"]()}
											placeholder={m["trip.settings.destinations_placeholder"]()}
											searchPlaceholder={m["trip.search_city_airport"]()}
											selectedLabel={m["trip.selected_airports"]()}
											icon={<Plane className="h-4 w-4" />}
											options={destinationOptions}
											selected={(field.value as LocationOption[]) ?? []}
											onSelectionChange={(selected) => field.onChange(selected)}
											multiple
											searchValue={destinationSearch}
											onSearchChange={setDestinationSearch}
											isOpen={isDestinationOpen}
											onOpenChange={setIsDestinationOpen}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{m["trip.settings.description_label"]()}</FormLabel>
									<FormControl>
										<Textarea
											placeholder={m["trip.description_placeholder"]()}
											className="min-h-[100px]"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										{m["trip.settings.description_help"]()}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={isSubmitting || !form.formState.isDirty}
							>
								{isSubmitting
									? m["trip.settings.submitting"]()
									: m["trip.settings.submit"]()}
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	)
}

const formatAirportLabel = (airport: Airport) => {
	if (airport.type === "city_group") {
		return `${airport.city} - ${airport.stateCode}`;
	}
	if (airport.type === "state_group") {
		return `${airport.state}`;
	}
	if (airport.type === "country_group") {
		return `${airport.country}`;
	}
	return `${airport.city} - ${airport.code}`;
};

function DangerZone({ travel }: { travel: Pick<Travel, "id" | "name"> }) {
	const navigate = useNavigate();
	const [isDeleting, setIsDeleting] = useState(false);
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	const deleteForm = useForm<DeleteConfirmationData>({
		resolver: zodResolver(
			DeleteConfirmationSchema.refine(
				(data) => data.confirmationName === travel.name,
				{
					message: m["trip.settings.delete_name_mismatch"](),
					path: ["confirmationName"],
				},
			),
		),
		defaultValues: {
			confirmationName: "",
		},
	})

	const deleteTravelMutation = useMutation({
		...orpc.travelRoutes.deleteTravel.mutationOptions(),
		onSuccess: () => {
			toast.success(m["trip.settings.delete_toast_success"]());
			navigate({ to: "/" });
		},
		onError: (error) => {
			toast.error(m["trip.settings.delete_toast_error"]());
			console.error("Delete error:", error);
		},
		onSettled: () => {
			setIsDeleting(false);
			setIsConfirmOpen(false);
		},
	})

	const onDelete = () => {
		if (deleteForm.getValues().confirmationName === travel.name) {
			setIsDeleting(true);
			deleteTravelMutation.mutate({
				travelId: travel.id,
				confirmationName: travel.name,
			})
		}
	}

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-lg font-semibold text-destructive">
					{m["trip.settings.danger_zone_title"]()}
				</h2>
				<p className="text-sm text-muted-foreground">
					{m["trip.settings.danger_zone_description"]()}
				</p>
			</div>

			<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-4">
				<div className="space-y-2">
					<h3 className="text-base font-medium text-destructive">
						{m["trip.settings.delete_title"]()}
					</h3>
					<p className="text-sm text-muted-foreground">
						{m["trip.settings.delete_description"]()}
					</p>
				</div>

				<AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" size="sm" className="gap-2">
							<Trash2 className="w-4 h-4" />
							{m["trip.settings.delete_button"]()}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent className="max-w-md">
						<AlertDialogHeader>
							<AlertDialogTitle>
								{m["trip.settings.delete_dialog_title"]()}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{m["trip.settings.delete_dialog_description"]()}
								<br />
								<strong>"{travel.name}"</strong>
							</AlertDialogDescription>
						</AlertDialogHeader>

						<Form {...deleteForm}>
							<form className="space-y-4">
							<FormField
								control={deleteForm.control}
								name="confirmationName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m["trip.settings.delete_name_label"]()}</FormLabel>
											<FormControl>
												<Input placeholder={travel.name} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</form>
						</Form>

						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleting}>
								{m["common.cancel"]()}
							</AlertDialogCancel>
							<AlertDialogAction
								disabled={
									isDeleting ||
									deleteForm.watch("confirmationName") !== travel.name
								}
								onClick={onDelete}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isDeleting
									? m["trip.settings.delete_confirming"]()
									: m["trip.settings.delete_button"]()}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	)
}

function TripSettingsSkeleton() {
	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
			</div>
			<div className="border rounded-xl p-6 space-y-6">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-24 w-full rounded-md" />
				</div>
				<div className="space-y-4">
					<Skeleton className="h-4 w-44" />
					<div className="grid gap-3 md:grid-cols-2">
						<Skeleton className="h-10 w-full rounded-md" />
						<Skeleton className="h-10 w-full rounded-md" />
					</div>
				</div>
				<div className="flex justify-end">
					<Skeleton className="h-10 w-32 rounded-md" />
				</div>
			</div>
			<div className="border rounded-xl p-6 space-y-4">
				<Skeleton className="h-5 w-48" />
				<Skeleton className="h-4 w-72" />
				<div className="flex justify-end">
					<Skeleton className="h-10 w-40 rounded-md" />
				</div>
			</div>
		</div>
	)
}
