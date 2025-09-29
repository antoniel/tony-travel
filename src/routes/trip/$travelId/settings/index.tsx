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
			.min(1, "Nome da viagem é obrigatório")
			.max(255, "Nome muito longo"),
		startDate: z.date({ message: "Data de início é obrigatória" }),
		endDate: z.date({ message: "Data de fim é obrigatória" }),
		description: z.string().max(1000, "Descrição muito longa").optional(),
		destinationAirports: z
			.array(
				z.object({
					value: z.string(),
					label: z.string(),
				}),
			)
			.min(1, "Selecione ao menos um aeroporto de destino"),
	})
	.refine((data) => data.endDate >= data.startDate, {
		message: "Data de fim deve ser posterior à data de início",
		path: ["endDate"],
	});

type TravelSettingsFormData = z.infer<typeof TravelSettingsSchema>;

// Delete confirmation schema
const DeleteConfirmationSchema = z.object({
	confirmationName: z.string().min(1, "Digite o nome da viagem para confirmar"),
});

type DeleteConfirmationData = z.infer<typeof DeleteConfirmationSchema>;

function TripSettingsPage() {
	const { travelId } = Route.useParams();

	// Check if user is owner
	const { data: travel } = useSuspenseQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);

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
				<h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
				<p className="text-muted-foreground">
					Apenas proprietários da viagem podem acessar as configurações.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">
					Configurações da Viagem
				</h1>
				<p className="text-muted-foreground">
					Gerencie as configurações e detalhes da sua viagem.
				</p>
			</div>

			<TravelSettingsForm travel={travel} />
			<Separator />
			<DangerZone travel={travel} />
		</div>
	);
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
	>;
}) {
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [destinationSearch, setDestinationSearch] = useState("");
	const [isDestinationOpen, setIsDestinationOpen] = useState(false);

	const { data: destinationResults = [] } = useAirportsSearch(
		destinationSearch,
		15,
		true,
	);

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
	});

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
	});

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
		}));
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
			toast.success("Configurações da viagem atualizadas com sucesso!");
			queryClient.invalidateQueries({
				queryKey: orpc.travelRoutes.getTravel.queryKey({
					input: { id: travel.id },
				}),
			});
		},
		onError: (error) => {
			toast.error("Erro ao atualizar configurações da viagem");
			console.error("Update error:", error);
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

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
		};
		updateTravelMutation.mutate({
			travelId: travel.id,
			updateData,
		});
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-lg font-semibold">Detalhes da Viagem</h2>
				<p className="text-sm text-muted-foreground">
					Atualize as informações básicas da sua viagem.
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
									<FormLabel>Nome da Viagem</FormLabel>
									<FormControl>
										<Input placeholder="Ex: Viagem para Paris" {...field} />
									</FormControl>
									<FormDescription>
										O nome que identifica sua viagem.
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
										<FormLabel>Data de Início</FormLabel>
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
										<FormLabel>Data de Fim</FormLabel>
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
									<FormLabel>Aeroportos de Destino</FormLabel>
									<FormDescription>
										Selecione todos os aeroportos possíveis para a chegada desta
										viagem.
									</FormDescription>
									<FormControl>
										<LocationSelector
											label="Aeroportos de Destino"
											placeholder="Selecione aeroporto(s) de destino"
											searchPlaceholder="Buscar por cidade, aeroporto ou código..."
											selectedLabel="Aeroportos selecionados"
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
									<FormLabel>Descrição (Opcional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Descreva sua viagem, objetivos, atividades planejadas..."
											className="min-h-[100px]"
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Adicione detalhes sobre sua viagem que podem ser úteis para
										outros membros.
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
								{isSubmitting ? "Salvando..." : "Salvar Alterações"}
							</Button>
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
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
					message: "O nome digitado não confere com o nome da viagem",
					path: ["confirmationName"],
				},
			),
		),
		defaultValues: {
			confirmationName: "",
		},
	});

	const deleteTravelMutation = useMutation({
		...orpc.travelRoutes.deleteTravel.mutationOptions(),
		onSuccess: () => {
			toast.success("Viagem excluída com sucesso");
			navigate({ to: "/" });
		},
		onError: (error) => {
			toast.error("Erro ao excluir viagem");
			console.error("Delete error:", error);
		},
		onSettled: () => {
			setIsDeleting(false);
			setIsConfirmOpen(false);
		},
	});

	const onDelete = () => {
		if (deleteForm.getValues().confirmationName === travel.name) {
			setIsDeleting(true);
			deleteTravelMutation.mutate({
				travelId: travel.id,
				confirmationName: travel.name,
			});
		}
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h2 className="text-lg font-semibold text-destructive">
					Zona de Perigo
				</h2>
				<p className="text-sm text-muted-foreground">
					Ações irreversíveis que afetam permanentemente sua viagem.
				</p>
			</div>

			<div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 space-y-4">
				<div className="space-y-2">
					<h3 className="text-base font-medium text-destructive">
						Excluir Viagem
					</h3>
					<p className="text-sm text-muted-foreground">
						Esta ação não pode ser desfeita. Todos os dados da viagem
						(acomodações, voos, eventos e membros) serão permanentemente
						removidos.
					</p>
				</div>

				<AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
					<AlertDialogTrigger asChild>
						<Button variant="destructive" size="sm" className="gap-2">
							<Trash2 className="w-4 h-4" />
							Excluir Viagem
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent className="max-w-md">
						<AlertDialogHeader>
							<AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
							<AlertDialogDescription>
								Esta ação é irreversível. Para confirmar, digite o nome exato da
								viagem abaixo:
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
											<FormLabel>Nome da viagem</FormLabel>
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
								Cancelar
							</AlertDialogCancel>
							<AlertDialogAction
								disabled={
									isDeleting ||
									deleteForm.getValues().confirmationName !== travel.name
								}
								onClick={onDelete}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isDeleting ? "Excluindo..." : "Excluir Viagem"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
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
	);
}
