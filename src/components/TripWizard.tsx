import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { orpc } from "@/orpc/client";
import type {
	Airport,
	InsertFullTravel,
} from "@/orpc/modules/travel/travel.model";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	DollarSign,
	Loader2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// Types and schemas for the wizard
const TripWizardSchema = z.object({
	name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
	description: z.string().max(1000, "Descrição muito longa").optional(),
	tripType: z.string().optional(),
	destinations: z
		.array(z.object({ value: z.string(), label: z.string() }))
		.optional(),
	dateRange: z
		.object({
			from: z.date(),
			to: z.date(),
		})
		.nullable()
		.optional(),
	people: z.number().optional(),
	budget: z.number().optional(),
	departureAirports: z.array(z.any()).optional(),
});

type TripWizardData = z.infer<typeof TripWizardSchema>;

interface WizardStep {
	id: string;
	title: string;
	description: string;
	isValid: (data: TripWizardData) => boolean;
}

const STEPS: WizardStep[] = [
	{
		id: "name",
		title: "Como você quer chamar esta viagem?",
		description:
			"Escolha um nome que te inspire e identifique facilmente sua aventura",
		isValid: (data) => Boolean(data.name && data.name.length >= 2),
	},
	{
		id: "summary",
		title: "Perfeito! Vamos criar sua viagem",
		description: "Revise os detalhes da sua aventura antes de continuar",
		isValid: () => true,
	},
];

interface StepProps {
	form: ReturnType<typeof useForm<TripWizardData>>;
}

interface TripWizardProps {
	initialData?: {
		destinations: Array<{ value: string; label: string }>;
		dateRange: { from: Date; to: Date } | null;
		people: number;
		budget: number;
		departureAirports: Array<Airport>;
	};
}

export default function TripWizard({ initialData }: TripWizardProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [currentStep, setCurrentStep] = useState(0);

	// Form setup with react-hook-form + Zod
	const form = useForm<TripWizardData>({
		resolver: zodResolver(TripWizardSchema),
		defaultValues: {
			name: "",
			description: "",
			tripType: "",
			destinations: initialData?.destinations || [],
			dateRange: initialData?.dateRange || null,
			people: initialData?.people || 2,
			budget: initialData?.budget || 1500,
			departureAirports: initialData?.departureAirports || [],
		},
		mode: "onChange",
	});

	// Watch form values for validation and display
	const watchedData = useWatch({ control: form.control });

	// Save travel mutation
	const saveTravelMutation = useMutation({
		...orpc.travelRoutes.saveTravel.mutationOptions(),
		onSuccess: (data) => {
			toast.success("Viagem criada com sucesso!", {
				description: "Redirecionando para sua nova viagem...",
			});
			// Invalidate travels query to refresh list
			queryClient.invalidateQueries({ queryKey: ["travels"] });
			navigate({ to: "/trip/$travelId", params: { travelId: data.id } });
		},
		onError: (error) => {
			console.error("Failed to create travel:", error);
			toast.error("Erro ao criar viagem", {
				description: "Tente novamente em alguns instantes.",
			});
		},
	});

	const canGoNext = () => {
		const step = STEPS[currentStep];
		return step.isValid(watchedData as TripWizardData);
	};

	const handleNext = () => {
		if (canGoNext() && currentStep < STEPS.length - 1) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handlePrev = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleFinish = form.handleSubmit(async (data) => {
		if (!data.dateRange?.from || !data.dateRange?.to) {
			toast.error("Erro nos dados", {
				description: "Verifique se todas as informações estão preenchidas.",
			});
			return;
		}

		// Transform form data into InsertFullTravel format
		const travelData: InsertFullTravel = {
			name: data.name,
			description: data.description?.trim()
				? data.description.trim()
				: undefined,
			destination:
				data.destinations?.map((d) => d.label).join(", ") ||
				"Destino não especificado",
			startDate: data.dateRange?.from || new Date(),
			endDate: data.dateRange?.to || new Date(),
			accommodations: [], // Will be added later by user
			events: [], // Will be added later by user
		};

		saveTravelMutation.mutate({ travel: travelData });
	});

	const getDurationInDays = () => {
		if (!watchedData.dateRange?.from || !watchedData.dateRange?.to) return 0;
		const diffTime = Math.abs(
			watchedData.dateRange.to.getTime() - watchedData.dateRange.from.getTime(),
		);
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	const renderStep = () => {
		const step = STEPS[currentStep];

		switch (step.id) {
			case "name":
				return <NameStep form={form} />;
			case "summary":
				return (
					<SummaryStep
						data={watchedData as TripWizardData}
						getDurationInDays={getDurationInDays}
					/>
				);
			default:
				return null;
		}
	};

	const currentStepData = STEPS[currentStep];
	const progress = ((currentStep + 1) / STEPS.length) * 100;

	return (
		<div className="relative h-full bg-gradient-to-b from-primary/10 via-background to-background">
			<div className="relative isolate min-h-screen pb-6 inset-0">
				<div className="w-full pointer-events-none absolute inset-0 -z-10 overflow-hidden top-0 left-0">
					<div className="aurora aurora-a" aria-hidden />
					<div className="aurora aurora-b" aria-hidden />
					<div className="bg-grid-fade" aria-hidden />
				</div>

				<div className="container relative isolate mx-auto px-4 pt-12 max-w-4xl">
					{/* Progress Bar */}
					<div className="mb-8">
						<div className="flex items-center justify-between mb-4">
							<span className="text-sm font-medium text-muted-foreground">
								Etapa {currentStep + 1} de {STEPS.length}
							</span>
							<span className="text-sm font-medium text-muted-foreground">
								{Math.round(progress)}% concluído
							</span>
						</div>
						<div className="w-full bg-secondary/50 rounded-full h-2">
							<div
								className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>

					{/* Step Content */}
					<div className="relative max-w-3xl mx-auto mb-8 rounded-2xl p-[1.5px] bg-gradient-to-r from-primary/40 via-accent/30 to-chart-4/40 animate-gradient-x [background-size:200%_200%]">
						<Card className="travel-card rounded-2xl ring-1 ring-border/60 min-h-[500px]">
							<CardContent className="px-8 py-8">
								{/* Header */}
								<div className="text-center mb-8">
									<h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
										{currentStepData.title}
									</h1>
									<p className="text-muted-foreground text-lg">
										{currentStepData.description}
									</p>
								</div>

								{/* Step Content */}
								<Form {...form}>
									<div className="mb-8">{renderStep()}</div>
								</Form>
							</CardContent>
						</Card>
					</div>

					{/* Navigation */}
					<div className="flex justify-between items-center max-w-3xl mx-auto">
						<Button
							variant="outline"
							onClick={handlePrev}
							disabled={currentStep === 0}
							className="h-12 px-6"
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Anterior
						</Button>

						<div className="flex gap-2">
							{STEPS.map((step, index) => (
								<div
									key={step.id}
									className={cn(
										"w-2 h-2 rounded-full transition-all duration-200",
										index < currentStep
											? "bg-primary"
											: index === currentStep
												? "bg-primary/70"
												: "bg-secondary",
									)}
								/>
							))}
						</div>

						{currentStep === STEPS.length - 1 ? (
							<Button
								onClick={handleFinish}
								disabled={!canGoNext() || saveTravelMutation.isPending}
								className="h-12 px-6 travel-button-primary"
							>
								{saveTravelMutation.isPending ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Check className="h-4 w-4 mr-2" />
								)}
								{saveTravelMutation.isPending ? "Criando..." : "Criar Viagem"}
							</Button>
						) : (
							<Button
								onClick={handleNext}
								disabled={!canGoNext()}
								className="h-12 px-6"
							>
								Próxima
								<ArrowRight className="h-4 w-4 ml-2" />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// Individual Step Components using react-hook-form
function NameStep({ form }: StepProps) {
	return (
		<div className="space-y-6 mx-auto">
			<FormField
				control={form.control}
				name="name"
				render={({ field, fieldState }) => (
					<FormItem>
						<FormLabel className="text-base font-medium">
							Nome da viagem
						</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="text"
								placeholder="Ex: Aventura em Paris, Escapada no Rio..."
								className="h-12 text-base"
								autoFocus
								aria-invalid={!!fieldState.error}
							/>
						</FormControl>
						<FormDescription>
							Escolha um nome memorável para sua viagem
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="description"
				render={({ field, fieldState }) => (
					<FormItem>
						<FormLabel className="text-base font-medium">
							Descrição da viagem
						</FormLabel>
						<FormControl>
							<Textarea
								{...field}
								placeholder="Descreva objetivos, atividades planejadas, anotações para o grupo..."
								className="text-base"
								aria-invalid={!!fieldState.error}
							/>
						</FormControl>
						<FormDescription>Opcional, até 1000 caracteres</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

function SummaryStep({
	data,
	getDurationInDays,
}: { data: TripWizardData; getDurationInDays: () => number }) {
	return (
		<div className="space-y-6 mx-auto">
			<div className="grid gap-6">
				{/* Trip Name */}
				<div className="flex items-center justify-between py-3 border-b border-border/50">
					<span className="text-muted-foreground">Nome da viagem:</span>
					<span className="font-medium">{data.name}</span>
				</div>

				{/* Description */}
				{data.description && data.description.trim().length > 0 && (
					<div className="py-3 border-b border-border/50">
						<span className="text-muted-foreground block mb-1">Descrição:</span>
						<span className="whitespace-pre-wrap">{data.description}</span>
					</div>
				)}

				{/* Trip Type */}
				{data.tripType && (
					<div className="flex items-center justify-between py-3 border-b border-border/50">
						<span className="text-muted-foreground">Tipo de viagem:</span>
						<Badge variant="outline" className="capitalize">
							{data.tripType.replace(/([a-z])([A-Z])/g, "$1 $2")}
						</Badge>
					</div>
				)}

				{/* Arrivals (Destinations) */}
				{data.destinations && data.destinations.length > 0 && (
					<div className="flex items-start justify-between py-3 border-b border-border/50">
						<span className="text-muted-foreground">Chegada(s):</span>
						<div className="text-right flex flex-wrap justify-end">
							{data.destinations.map((dest) => (
								<Badge
									key={dest.value}
									variant="secondary"
									className="ml-1 mb-1"
								>
									{dest.label}
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* Dates */}
				{data.dateRange?.from && data.dateRange?.to && (
					<div className="flex items-center justify-between py-3 border-b border-border/50">
						<span className="text-muted-foreground">Datas:</span>
						<div className="text-right">
							<div className="font-medium">
								{format(data.dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
								{" até "}
								{format(data.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
							</div>
							<Badge variant="outline" className="mt-1">
								{getDurationInDays()} dias
							</Badge>
						</div>
					</div>
				)}

				{/* People */}
				{data.people && (
					<div className="flex items-center justify-between py-3 border-b border-border/50">
						<span className="text-muted-foreground">Viajantes:</span>
						<div className="flex items-center gap-2">
							<Users className="h-4 w-4" />
							<span className="font-medium">{data.people} pessoas</span>
						</div>
					</div>
				)}

				{/* Budget */}
				{data.budget && (
					<div className="flex items-center justify-between py-3 border-b border-border/50">
						<span className="text-muted-foreground">Orçamento:</span>
						<div className="flex items-center gap-2">
							<DollarSign className="h-4 w-4" />
							<span className="font-medium">
								R${" "}
								{data.budget.toLocaleString("pt-BR", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</span>
						</div>
					</div>
				)}

				{/* Departures */}
				{data.departureAirports && data.departureAirports.length > 0 && (
					<div className="flex items-start justify-between py-3">
						<span className="text-muted-foreground">Saída(s):</span>
						<div className="text-right flex flex-wrap justify-end">
							{data.departureAirports.map((airport: Airport) => (
								<Badge
									key={airport.code}
									variant="secondary"
									className="ml-1 mb-1"
								>
									{renderAirportName(airport)}
								</Badge>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Helper function
const renderAirportName = (airport: Airport) => {
	switch (airport.type) {
		case "city_group":
			return `${airport.city} - ${airport.stateCode}`;
		case "state_group":
			return `${airport.state}`;
		case "country_group":
			return `${airport.country}`;
		default:
			return `${airport.city} - ${airport.code}`;
	}
};
