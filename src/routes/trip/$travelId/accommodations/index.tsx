import { AccommodationModal } from "@/components/accommodation-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Accommodation } from "@/lib/db/schema";
import { orpc } from "@/orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Edit, Home, MapPin, Plus } from "lucide-react";
import { Suspense, useState } from "react";

export const Route = createFileRoute("/trip/$travelId/accommodations/")({
	component: () => (
		<Suspense fallback={<AccommodationsPageSkeleton />}>
			<AccommodationsPage />
		</Suspense>
	),
});

interface AccommodationCardProps {
	accommodation: Accommodation;
	onEdit: (accommodation: Accommodation) => void;
	canWrite: boolean;
}

function AccommodationCard({
	accommodation,
	onEdit,
	canWrite,
}: AccommodationCardProps) {
	const getAccommodationTypeIcon = (type: string) => {
		switch (type?.toLowerCase()) {
			case "hotel":
				return "🏨";
			case "hostel":
				return "🏠";
			case "airbnb":
				return "🏡";
			case "resort":
				return "🏖️";
			default:
				return "🏨";
		}
	};

	const getAccommodationTypeLabel = (type: string) => {
		switch (type?.toLowerCase()) {
			case "hotel":
				return "Hotel";
			case "hostel":
				return "Hostel";
			case "airbnb":
				return "Airbnb";
			case "resort":
				return "Resort";
			default:
				return "Hotel";
		}
	};

	const calculateNights = (startDate: Date, endDate: Date) => {
		const nights = Math.ceil(
			(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		return Math.max(0, nights);
	};

	const formatCurrency = (amount: number | null) => {
		if (!amount) return null;

		const formatter = new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		});

		return formatter.format(amount);
	};

	const nights =
		accommodation.startDate && accommodation.endDate
			? calculateNights(
					new Date(accommodation.startDate),
					new Date(accommodation.endDate),
				)
			: 0;

	return (
		<Card className="gap-0 justify-between group hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-border/50 hover:border-primary/20 backdrop-blur-sm bg-card/90">
			<CardHeader className="pb-4">
				<div className="flex items-start justify-between">
					<div className="space-y-2 flex-1">
						<div className="flex items-center gap-3">
							<span className="text-3xl drop-shadow-sm">
								{getAccommodationTypeIcon(accommodation.type)}
							</span>
							<div className="flex-1">
								<CardTitle className="text-xl group-hover:text-primary transition-colors duration-200 leading-tight">
									{accommodation.name}
								</CardTitle>
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="mt-1">
										{getAccommodationTypeLabel(accommodation.type)}
									</Badge>
									{nights > 0 && (
										<div className="text-center ">
											<Badge variant="secondary" className="font-medium">
												{nights} noite{nights !== 1 ? "s" : ""}
											</Badge>
										</div>
									)}
								</div>
							</div>
						</div>
						{accommodation.price && (
							<div className="flex items-center gap-4 mt-2">
								{accommodation.price && (
									<div className="text-lg font-bold text-primary">
										{formatCurrency(accommodation.price)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{accommodation.address && (
					<div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/30">
						<MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
						<span className="text-sm text-muted-foreground leading-relaxed">
							{accommodation.address}
						</span>
					</div>
				)}

				{accommodation.startDate && accommodation.endDate && (
					<div className="space-y-3">
						<div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
							<Calendar className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
							<div className="text-sm space-y-2">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<span className="font-medium text-primary block mb-1">
											Check-in
										</span>
										<span className="text-foreground">
											{new Date(accommodation.startDate).toLocaleDateString(
												"pt-BR",
												{
													day: "2-digit",
													month: "short",
													year: "numeric",
												},
											)}
										</span>
									</div>
									<div>
										<span className="font-medium text-primary block mb-1">
											Check-out
										</span>
										<span className="text-foreground">
											{new Date(accommodation.endDate).toLocaleDateString(
												"pt-BR",
												{
													day: "2-digit",
													month: "short",
													year: "numeric",
												},
											)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
			<CardFooter>
				<div className="flex gap-2 pt-2">
					{canWrite ? (
						<Button
							variant="outline"
							size="sm"
							className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
							onClick={() => onEdit(accommodation)}
						>
							<Edit className="w-4 h-4 mr-2" />
							Editar
						</Button>
					) : null}
					<Button
						variant="outline"
						size="sm"
						className="hover:bg-muted transition-colors duration-200"
					>
						<MapPin className="w-4 h-4" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

interface AccommodationStatsProps {
	accommodations: Accommodation[];
	totalNights: number;
}

function AccommodationStats({
	accommodations,
	totalNights,
}: AccommodationStatsProps) {
	if (accommodations.length === 0) return null;

	return (
		<div className="flex gap-3 text-sm">
			<Badge variant="secondary" className="gap-2 px-3 py-1">
				<Home className="w-4 h-4" />
				<span>
					{accommodations.length} local
					{accommodations.length !== 1 ? "ais" : ""}
				</span>
			</Badge>
			{totalNights > 0 && (
				<Badge variant="outline" className="gap-2 px-3 py-1">
					<Calendar className="w-4 h-4" />
					<span>
						{totalNights} noite{totalNights !== 1 ? "s" : ""}
					</span>
				</Badge>
			)}
		</div>
	);
}

function PageHeader({
	onAddAccommodation,
	accommodations,
	totalNights,
	canWrite,
}: {
	onAddAccommodation: () => void;
	accommodations: Accommodation[];
	totalNights: number;
	canWrite: boolean;
}) {
	return (
		<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
			<div className="space-y-3">
				<h1 className="text-3xl font-bold tracking-tight">Acomodações</h1>
				<p className="text-lg text-muted-foreground">
					Organize onde você vai se hospedar durante a viagem
				</p>
			</div>

			<div className="flex flex-col sm:flex-row gap-4 sm:items-center">
				<AccommodationStats
					accommodations={accommodations}
					totalNights={totalNights}
				/>
				{canWrite ? (
					<Button
						className="shadow-lg hover:shadow-xl transition-all duration-200"
						onClick={onAddAccommodation}
					>
						<Plus className="w-4 h-4 mr-2" />
						<span className="hidden sm:inline">Adicionar Acomodação</span>
						<span className="sm:hidden">Adicionar</span>
					</Button>
				) : null}
			</div>
		</div>
	);
}

function EmptyAccommodationsState({
	onAddAccommodation,
	canWrite,
}: { onAddAccommodation: () => void; canWrite: boolean }) {
	return (
		<>
			<div className="text-center py-24">
				<div className="max-w-lg mx-auto space-y-8">
					<div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
						<Home className="w-16 h-16 text-primary/60" />
					</div>
					<div className="space-y-4">
						<h3 className="text-2xl font-semibold">Ainda sem acomodações</h3>
						<p className="text-muted-foreground leading-relaxed text-lg max-w-md mx-auto">
							Adicione hotéis, hostels, Airbnbs ou outras acomodações para
							organizar onde você vai se hospedar durante a viagem.
						</p>
					</div>
					<div className="space-y-6">
						{canWrite ? (
							<Button
								size="lg"
								className="shadow-sm px-8 py-3 text-base"
								onClick={onAddAccommodation}
							>
								<Plus className="w-5 h-5 mr-2" />
								Adicionar Primeira Acomodação
							</Button>
						) : null}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-sm mx-auto">
							<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
								<span className="text-2xl">🏨</span>
								<span className="text-sm font-medium">Hotéis</span>
							</div>
							<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
								<span className="text-2xl">🏡</span>
								<span className="text-sm font-medium">Airbnb</span>
							</div>
							<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
								<span className="text-2xl">🏠</span>
								<span className="text-sm font-medium">Hostels</span>
							</div>
							<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
								<span className="text-2xl">🏖️</span>
								<span className="text-sm font-medium">Resorts</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Card className="border-2 border-dashed">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Home className="w-5 h-5" />
						Dicas para Escolher Acomodações
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<h4 className="font-medium">📍 Localização</h4>
							<p className="text-sm text-muted-foreground">
								Escolha acomodações próximas aos pontos turísticos principais ou
								com bom acesso ao transporte público.
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">💰 Orçamento</h4>
							<p className="text-sm text-muted-foreground">
								Compare preços entre diferentes tipos de acomodação e considere
								a relação custo-benefício.
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">⭐ Avaliações</h4>
							<p className="text-sm text-muted-foreground">
								Verifique as avaliações de outros hóspedes para ter uma ideia da
								qualidade do local.
							</p>
						</div>
						<div className="space-y-2">
							<h4 className="font-medium">🛏️ Comodidades</h4>
							<p className="text-sm text-muted-foreground">
								Considere as comodidades oferecidas como Wi-Fi, café da manhã,
								academia, piscina, etc.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
}

function AccommodationsPage() {
	const { travelId } = Route.useParams();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingAccommodation, setEditingAccommodation] =
		useState<Accommodation | null>(null);

	const { data: travel } = useSuspenseQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);

	const { data: accommodations = [] } = useSuspenseQuery(
		orpc.accommodationRoutes.getAccommodationsByTravel.queryOptions({
			input: { travelId },
		}),
	);
	const totalNights = accommodations.reduce((total, acc) => {
		if (acc.startDate && acc.endDate) {
			const nights = Math.ceil(
				(new Date(acc.endDate).getTime() - new Date(acc.startDate).getTime()) /
					(1000 * 60 * 60 * 24),
			);
			return total + Math.max(0, nights);
		}
		return total;
	}, 0);

	const handleEdit = (accommodation: Accommodation) => {
		setEditingAccommodation(accommodation);
		setIsModalOpen(true);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setEditingAccommodation(null);
	};

	const handleAddAccommodation = () => {
		setEditingAccommodation(null);
		setIsModalOpen(true);
	};

	if (!travel) {
		return (
			<div className="text-center py-12">
				<Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
				<h3 className="text-lg font-medium mb-2">Viagem não encontrada</h3>
				<p className="text-muted-foreground">
					A viagem selecionada não está disponível.
				</p>
			</div>
		);
	}

	const canWrite = !!travel.userMembership;

	return (
		<div className="space-y-10">
			<PageHeader
				onAddAccommodation={handleAddAccommodation}
				accommodations={accommodations}
				totalNights={totalNights}
				canWrite={canWrite}
			/>

			{accommodations.length > 0 ? (
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					{accommodations.map((accommodation) => (
						<AccommodationCard
							key={accommodation.id}
							accommodation={accommodation}
							onEdit={handleEdit}
							canWrite={canWrite}
						/>
					))}
				</div>
			) : (
				<EmptyAccommodationsState
					onAddAccommodation={handleAddAccommodation}
					canWrite={canWrite}
				/>
			)}

			{canWrite ? (
				<AccommodationModal
					open={isModalOpen}
					onOpenChange={handleModalClose}
					travelId={travelId}
					travelData={travel}
					editingAccommodation={editingAccommodation}
				/>
			) : null}
		</div>
	);
}

function AccommodationsPageSkeleton() {
	return (
		<div className="space-y-10">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
				<div className="space-y-3">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="flex flex-col sm:flex-row gap-3 sm:items-center">
					<div className="flex gap-2">
						<Skeleton className="h-7 w-28 rounded-full" />
						<Skeleton className="h-7 w-28 rounded-full" />
					</div>
					<Skeleton className="h-10 w-48 rounded-md" />
				</div>
			</div>
			<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={`accommodation-card-${
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							index
						}`}
						className="border rounded-xl p-6 space-y-4"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="space-y-2 flex-1">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="h-8 w-16 rounded-md" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-48" />
							<Skeleton className="h-4 w-32" />
						</div>
						<div className="grid gap-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-full rounded-md" />
							<Skeleton className="h-9 w-10 rounded-md" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
