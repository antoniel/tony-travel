import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Star, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/trip/$travelId/locations")({
	component: LocationsPage,
});

function LocationsPage() {
	const { travelId } = Route.useParams();

	const travelQuery = useQuery(
		orpc.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;
	const isLoading = travelQuery.isLoading;

	// Para esta demonstração, vamos usar os eventos que têm location
	const locationsFromEvents = travel?.events?.filter(event => event.location) || [];
	
	// Group locations by type/category for better organization
	const locationsByCategory = locationsFromEvents.reduce((acc, event) => {
		const category = event.type || 'other';
		if (!acc[category]) {
			acc[category] = [];
		}
		acc[category].push(event);
		return acc;
	}, {} as Record<string, typeof locationsFromEvents>);

	const getLocationTypeIcon = (type: string) => {
		switch (type?.toLowerCase()) {
			case 'restaurant':
				return '🍽️';
			case 'hotel':
				return '🏨';
			case 'attraction':
				return '🎭';
			case 'museum':
				return '🏛️';
			case 'park':
				return '🌳';
			case 'shopping':
				return '🛍️';
			case 'nightlife':
				return '🌙';
			default:
				return '📍';
		}
	};

	// Mock data for demonstration - in real app, this would come from the backend
	const mockLocations = [
		{
			id: '1',
			name: 'Cristo Redentor',
			type: 'attraction',
			rating: 4.8,
			category: 'Ponto Turístico',
			estimatedTime: '2-3 horas',
			price: 'R$ 25',
			address: 'Parque Nacional da Tijuca - Alto da Boa Vista, Rio de Janeiro',
			description: 'Uma das Sete Maravilhas do Mundo Moderno, localizada no topo do Corcovado.',
			imageUrl: null,
		},
		{
			id: '2', 
			name: 'Pão de Açúcar',
			type: 'attraction',
			rating: 4.7,
			category: 'Ponto Turístico',
			estimatedTime: '3-4 horas',
			price: 'R$ 85',
			address: 'Av. Pasteur, 520 - Urca, Rio de Janeiro',
			description: 'Complexo de morros que oferece uma vista panorâmica única da cidade.',
			imageUrl: null,
		},
		{
			id: '3',
			name: 'Aprazível',
			type: 'restaurant',
			rating: 4.6,
			category: 'Restaurante',
			estimatedTime: '1-2 horas',
			price: 'R$ 120',
			address: 'R. Aprazível, 62 - Santa Teresa, Rio de Janeiro',
			description: 'Restaurante charmoso com vista da cidade e culinária brasileira contemporânea.',
			imageUrl: null,
		},
	];

	// Define proper types for all locations
	type Location = {
		id: string;
		name: string;
		type: string;
		rating?: number;
		category: string;
		estimatedTime?: string;
		price?: string | number;
		address?: string | null;
		description?: string;
		imageUrl?: string | null;
	};

	const allLocations: Location[] = [
		...locationsFromEvents.map(event => ({
			id: event.id,
			name: event.location || event.title,
			type: event.type,
			category: event.type === 'food' ? 'Restaurante' : event.type === 'activity' ? 'Atividade' : 'Transporte',
			address: event.location,
			description: undefined,
			rating: undefined,
			estimatedTime: undefined,
			price: event.estimatedCost || undefined,
			imageUrl: event.imageUrl,
		})), 
		...mockLocations
	];

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
					<h1 className="text-3xl font-bold tracking-tight">Pontos de Interesse</h1>
					<p className="text-lg text-muted-foreground">
						Descubra e organize os locais que você quer visitar
					</p>
				</div>
				
				<div className="flex flex-col sm:flex-row gap-3">
					{/* Quick stats */}
					{allLocations.length > 0 && (
						<div className="flex gap-4 text-sm">
							<Badge variant="secondary" className="gap-2">
								<MapPin className="w-4 h-4" />
								<span>{allLocations.length} local{allLocations.length !== 1 ? 'ais' : ''}</span>
							</Badge>
							{Object.keys(locationsByCategory).length > 0 && (
								<Badge variant="outline" className="gap-2">
									<span>🏷️</span>
									<span>{Object.keys(locationsByCategory).length} categoria{Object.keys(locationsByCategory).length !== 1 ? 's' : ''}</span>
								</Badge>
							)}
						</div>
					)}

					<Button className="shadow-sm">
						<Plus className="w-4 h-4 mr-2" />
						<span className="hidden sm:inline">Adicionar Local</span>
						<span className="sm:hidden">Adicionar</span>
					</Button>
				</div>
			</div>

			{allLocations.length > 0 ? (
				<div className="space-y-12">
					{/* Location Cards */}
					<div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
						{allLocations.map((location) => (
							<Card key={location.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
								<CardHeader className="pb-6">
									<div className="flex items-start justify-between">
										<div className="space-y-2 flex-1">
											<CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
												<span className="text-2xl">{getLocationTypeIcon(location.type)}</span>
												<span className="truncate">{location.name}</span>
											</CardTitle>
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="w-fit text-xs">
													{location.category}
												</Badge>
												{location.rating && (
													<div className="flex items-center gap-1">
														<Star className="w-3 h-3 text-yellow-500 fill-current" />
														<span className="text-xs font-medium">{location.rating}</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								
								<CardContent className="space-y-6">
									{location.address && (
										<div className="flex items-start gap-3">
											<MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
											<span className="text-sm text-muted-foreground leading-relaxed">
												{location.address}
											</span>
										</div>
									)}
									
									{location.description && (
										<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
											{location.description}
										</p>
									)}

									{/* Additional Info */}
									<div className="grid grid-cols-2 gap-3 text-sm">
										{location.estimatedTime && (
											<div className="flex items-center gap-2">
												<span className="text-muted-foreground">⏱️</span>
												<span className="font-medium">{location.estimatedTime}</span>
											</div>
										)}
										{location.price && (
											<div className="flex items-center gap-2">
												<span className="text-muted-foreground">💰</span>
												<span className="font-medium text-primary">{location.price}</span>
											</div>
										)}
									</div>

									{/* Actions */}
									<div className="flex gap-2 pt-2">
										<Button variant="outline" size="sm" className="flex-1">
											<ExternalLink className="w-4 h-4 mr-1" />
											Detalhes
										</Button>
										<Button variant="outline" size="sm">
											<MapPin className="w-4 h-4" />
										</Button>
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{/* Interactive Map Section */}
					<Card className="overflow-hidden">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<MapPin className="w-5 h-5" />
									Visualização no Mapa
								</CardTitle>
								<div className="flex gap-2">
									<Button variant="outline" size="sm">
										<Plus className="w-4 h-4 mr-1" />
										Rota
									</Button>
									<Button variant="outline" size="sm">
										Filtros
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							<div className="h-80 bg-muted/30 flex items-center justify-center border-t">
								<div className="text-center space-y-4 p-8">
									<div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
										<MapPin className="w-8 h-8 text-primary" />
									</div>
									<div className="space-y-2">
										<h3 className="font-semibold text-lg">Mapa Interativo</h3>
										<p className="text-muted-foreground max-w-sm">
											Visualize todos os seus locais de interesse plotados no mapa com rotas otimizadas.
										</p>
									</div>
									<div className="flex flex-wrap justify-center gap-2 text-sm">
										<Badge variant="secondary">📍 {allLocations.length} locais</Badge>
										<Badge variant="secondary">🗺️ Vista satélite</Badge>
										<Badge variant="secondary">🚗 Rotas otimizadas</Badge>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			) : (
				<div className="text-center py-24">
					<div className="max-w-lg mx-auto space-y-8">
						<div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
							<MapPin className="w-16 h-16 text-primary/60" />
						</div>
						<div className="space-y-4">
							<h3 className="text-2xl font-semibold">Descubra locais incríveis</h3>
							<p className="text-muted-foreground leading-relaxed text-lg max-w-md mx-auto">
								Adicione pontos turísticos, restaurantes, museus e outros locais interessantes para criar o roteiro perfeito da sua viagem.
							</p>
						</div>
						<div className="space-y-6">
							<Button size="lg" className="shadow-sm px-8 py-3 text-base">
								<Plus className="w-5 h-5 mr-2" />
								Adicionar Primeiro Local
							</Button>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-md mx-auto">
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🎭</span>
									<span className="text-sm font-medium">Atrações</span>
								</div>
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🍽️</span>
									<span className="text-sm font-medium">Restaurantes</span>
								</div>
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🏛️</span>
									<span className="text-sm font-medium">Museus</span>
								</div>
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🌳</span>
									<span className="text-sm font-medium">Parques</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Discovery Section - Only show when no locations */}
			{allLocations.length === 0 && (
				<Card className="border-2 border-dashed">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Star className="w-5 h-5" />
							Como Descobrir Locais Incríveis
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									<span>🔍</span> Pesquise por Categoria
								</h4>
								<p className="text-sm text-muted-foreground">
									Use filtros por tipo: restaurantes, pontos turísticos, museus, parques, compras, vida noturna.
								</p>
							</div>
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									<span>⭐</span> Confira Avaliações
								</h4>
								<p className="text-sm text-muted-foreground">
									Veja as avaliações de outros viajantes para escolher os melhores locais.
								</p>
							</div>
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									<span>📍</span> Considere a Localização
								</h4>
								<p className="text-sm text-muted-foreground">
									Agrupe locais por região para otimizar seu tempo e reduzir deslocamentos.
								</p>
							</div>
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									<span>💡</span> Dicas Locais
								</h4>
								<p className="text-sm text-muted-foreground">
									Procure por experiências autênticas e locais frequentados pelos moradores.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}