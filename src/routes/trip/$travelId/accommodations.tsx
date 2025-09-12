import { AccommodationModal } from "@/components/accommodation-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Home, MapPin, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/trip/$travelId/accommodations")({
	component: AccommodationsPage,
});

function AccommodationsPage() {
	const { travelId } = Route.useParams();
	const [isModalOpen, setIsModalOpen] = useState(false);

	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);

	const accommodationsQuery = useQuery(
		orpc.accommodationRoutes.getAccommodationsByTravel.queryOptions({
			input: { travelId },
		}),
	);
	const accommodations = accommodationsQuery.data || [];

	const isLoading = travelQuery.isLoading || accommodationsQuery.isLoading;
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

	const formatCurrency = (amount: number | null, currency: string | null) => {
		if (!amount) return null;

		const formatter = new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: currency || "BRL",
		});

		return formatter.format(amount);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-10">
			{/* Header with Stats */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
				<div className="space-y-3">
					<h1 className="text-3xl font-bold tracking-tight">Acomodações</h1>
					<p className="text-lg text-muted-foreground">
						Organize onde você vai se hospedar durante a viagem
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3">
					{/* Quick stats */}
					{accommodations.length > 0 && (
						<div className="flex gap-4 text-sm">
							<Badge variant="secondary" className="gap-2">
								<Home className="w-4 h-4" />
								<span>
									{accommodations.length} local
									{accommodations.length !== 1 ? "ais" : ""}
								</span>
							</Badge>
							{totalNights > 0 && (
								<Badge variant="outline" className="gap-2">
									<Calendar className="w-4 h-4" />
									<span>
										{totalNights} noite{totalNights !== 1 ? "s" : ""}
									</span>
								</Badge>
							)}
						</div>
					)}

					<Button className="shadow-sm" onClick={() => setIsModalOpen(true)}>
						<Plus className="w-4 h-4 mr-2" />
						<span className="hidden sm:inline">Adicionar Acomodação</span>
						<span className="sm:hidden">Adicionar</span>
					</Button>
				</div>
			</div>

			{accommodations.length > 0 ? (
				<div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
					{accommodations.map((accommodation) => {
						const nights =
							accommodation.startDate && accommodation.endDate
								? calculateNights(
										new Date(accommodation.startDate),
										new Date(accommodation.endDate),
									)
								: 0;

						return (
							<Card
								key={accommodation.id}
								className="group hover:shadow-xl transition-all duration-300 overflow-hidden"
							>
								<CardHeader className="pb-6">
									<div className="flex items-start justify-between">
										<div className="space-y-1 flex-1">
											<CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
												<span className="text-2xl">
													{getAccommodationTypeIcon(accommodation.type)}
												</span>
												<span className="truncate">{accommodation.name}</span>
											</CardTitle>
											<Badge variant="outline" className="w-fit">
												{getAccommodationTypeLabel(accommodation.type)}
											</Badge>
										</div>
									</div>
								</CardHeader>

								<CardContent className="space-y-6">
									{accommodation.address && (
										<div className="flex items-start gap-3">
											<MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												{accommodation.address}
											</span>
										</div>
									)}

									{accommodation.startDate && accommodation.endDate && (
										<div className="space-y-3">
											<div className="flex items-center gap-3">
												<Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
												<div className="text-sm space-y-1">
													<div className="flex items-center gap-2">
														<span className="font-medium">Check-in:</span>
														<span>
															{new Date(
																accommodation.startDate,
															).toLocaleDateString("pt-BR", {
																day: "2-digit",
																month: "short",
																year: "numeric",
															})}
														</span>
													</div>
													<div className="flex items-center gap-2">
														<span className="font-medium">Check-out:</span>
														<span>
															{new Date(
																accommodation.endDate,
															).toLocaleDateString("pt-BR", {
																day: "2-digit",
																month: "short",
																year: "numeric",
															})}
														</span>
													</div>
												</div>
											</div>
											{nights > 0 && (
												<div className="px-3 py-2 bg-muted/50 rounded-lg">
													<span className="text-sm font-medium">
														{nights} noite{nights !== 1 ? "s" : ""}
													</span>
												</div>
											)}
										</div>
									)}

									{/* Rating and Price */}
									<div className="flex items-center justify-between pt-2">
										<div className="flex items-center gap-4">
											{accommodation.rating && (
												<div className="flex items-center gap-1">
													<span className="text-sm">⭐</span>
													<span className="text-sm font-medium">
														{accommodation.rating}
													</span>
												</div>
											)}
											{accommodation.price && (
												<div className="text-sm font-semibold text-primary">
													{formatCurrency(
														accommodation.price,
														accommodation.currency,
													)}
													{nights > 0 && (
														<span className="text-muted-foreground font-normal">
															/{nights}n
														</span>
													)}
												</div>
											)}
										</div>
									</div>

									{/* Actions */}
									<div className="flex gap-2 pt-2">
										<Button variant="outline" size="sm" className="flex-1">
											Editar
										</Button>
										<Button variant="outline" size="sm">
											<MapPin className="w-4 h-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			) : (
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
							<Button
								size="lg"
								className="shadow-sm px-8 py-3 text-base"
								onClick={() => setIsModalOpen(true)}
							>
								<Plus className="w-5 h-5 mr-2" />
								Adicionar Primeira Acomodação
							</Button>
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
			)}

			{/* Tips Section */}
			{accommodations.length === 0 && (
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
									Escolha acomodações próximas aos pontos turísticos principais
									ou com bom acesso ao transporte público.
								</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-medium">💰 Orçamento</h4>
								<p className="text-sm text-muted-foreground">
									Compare preços entre diferentes tipos de acomodação e
									considere a relação custo-benefício.
								</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-medium">⭐ Avaliações</h4>
								<p className="text-sm text-muted-foreground">
									Verifique as avaliações de outros hóspedes para ter uma ideia
									da qualidade do local.
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
			)}

			<AccommodationModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				travelId={travelId}
			/>
		</div>
	);
}
