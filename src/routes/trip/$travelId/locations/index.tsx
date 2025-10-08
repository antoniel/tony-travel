import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MapPin, Plus, Star } from "lucide-react";

export const Route = createFileRoute("/trip/$travelId/locations/")({
	component: LocationsPage,
});

function LocationsPage() {
	const { travelId } = Route.useParams();

	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;
	const isLoading = travelQuery.isLoading;

	// Para esta demonstração, vamos usar os eventos que têm location
	const locationsFromEvents =
		travel?.events?.filter((event) => event.location) || [];

	// Group locations by type/category for better organization
	const locationsByCategory = locationsFromEvents.reduce(
		(acc, event) => {
			const category = event.type || "other";
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(event);
			return acc;
		},
		{} as Record<string, typeof locationsFromEvents>,
	);

	const getLocationTypeIcon = (type: string) => {
		switch (type?.toLowerCase()) {
			case "restaurant":
				return "🍽️";
			case "hotel":
				return "🏨";
			case "attraction":
				return "🎭";
			case "museum":
				return "🏛️";
			case "park":
				return "🌳";
			case "shopping":
				return "🛍️";
			case "nightlife":
				return "🌙";
			default:
				return "📍";
		}
	};

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
		...locationsFromEvents.map((event) => ({
			id: event.id,
			name: event.location || event.title,
			type: event.type,
			category:
				event.type === "food"
					? m["locations.category_restaurant"]()
					: event.type === "activity"
						? m["locations.category_activity"]()
						: m["locations.category_transport"](),
			address: event.location,
			description: undefined,
			rating: undefined,
			estimatedTime: undefined,
			price: event.cost || event.estimatedCost || undefined,
			imageUrl: event.imageUrl,
		})),
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
					<h1 className="text-3xl font-bold tracking-tight">
						{m["locations.page_title"]()}
					</h1>
					<p className="text-lg text-muted-foreground">
						{m["locations.page_description"]()}
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3">
					{/* Quick stats */}
					{allLocations.length > 0 && (
						<div className="flex gap-4 text-sm">
							<Badge variant="secondary" className="gap-2">
								<MapPin className="w-4 h-4" />
								<span>
									{allLocations.length === 1
										? m["locations.locations_count"]({ count: "1" })
										: m["locations.locations_count_plural"]({
												count: allLocations.length.toString(),
											})}
								</span>
							</Badge>
							{Object.keys(locationsByCategory).length > 0 && (
								<Badge variant="outline" className="gap-2">
									<span>🏷️</span>
									<span>
										{Object.keys(locationsByCategory).length === 1
											? m["locations.categories_count"]({ count: "1" })
											: m["locations.categories_count_plural"]({
													count:
														Object.keys(locationsByCategory).length.toString(),
												})}
									</span>
								</Badge>
							)}
						</div>
					)}

					<Button className="shadow-sm">
						<Plus className="w-4 h-4 mr-2" />
						<span className="hidden sm:inline">
							{m["locations.add_location"]()}
						</span>
						<span className="sm:hidden">{m["common.add"]()}</span>
					</Button>
				</div>
			</div>

			{allLocations.length > 0 ? (
				<div className="space-y-12">
					{/* Interactive Map Section - Moved to top */}
					<Card className="overflow-hidden">
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<MapPin className="w-5 h-5" />
									{m["locations.map_view"]()}
								</CardTitle>
								<div className="flex gap-2">
									<Button variant="outline" size="sm">
										<Plus className="w-4 h-4 mr-1" />
										{m["locations.add_route"]()}
									</Button>
									<Button variant="outline" size="sm">
										{m["locations.filters"]()}
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
										<h3 className="font-semibold text-lg">
											{m["locations.interactive_map"]()}
										</h3>
										<p className="text-muted-foreground max-w-sm">
											{m["locations.map_description"]()}
										</p>
									</div>
									<div className="flex flex-wrap justify-center gap-2 text-sm">
										<Badge variant="secondary">
											📍{" "}
											{allLocations.length === 1
												? m["locations.locations_count"]({ count: "1" })
												: m["locations.locations_count_plural"]({
														count: allLocations.length.toString(),
													})}
										</Badge>
										<Badge variant="secondary">
											{m["locations.satellite_view"]()}
										</Badge>
										<Badge variant="secondary">
											{m["locations.optimized_routes"]()}
										</Badge>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Location Cards - Moved below map */}
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold">
								{m["locations.locations_list"]()}
							</h2>
							<div className="flex gap-2">
								<Button variant="outline" size="sm">
									{m["locations.sort"]()}
								</Button>
								<Button variant="outline" size="sm">
									{m["locations.filter"]()}
								</Button>
							</div>
						</div>

						<div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
							{allLocations.map((location) => (
								<Card
									key={location.id}
									className="group hover:shadow-xl transition-all duration-300 overflow-hidden"
								>
									<CardHeader className="pb-6">
										<div className="flex items-start justify-between">
											<div className="space-y-2 flex-1">
												<CardTitle className="flex items-center gap-3 text-lg group-hover:text-primary transition-colors">
													<span className="text-2xl">
														{getLocationTypeIcon(location.type)}
													</span>
													<span className="truncate">{location.name}</span>
												</CardTitle>
												<div className="flex items-center gap-2">
													<Badge variant="outline" className="w-fit text-xs">
														{location.category}
													</Badge>
													{location.rating && (
														<div className="flex items-center gap-1">
															<Star className="w-3 h-3 text-yellow-500 fill-current" />
															<span className="text-xs font-medium">
																{location.rating}
															</span>
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
													<span className="font-medium">
														{location.estimatedTime}
													</span>
												</div>
											)}
											{location.price && (
												<div className="flex items-center gap-2">
													<span className="text-muted-foreground">💰</span>
													<span className="font-medium text-primary">
														{location.price}
													</span>
												</div>
											)}
										</div>

										{/* Actions */}
										<div className="flex gap-2 pt-2">
											<Button variant="outline" size="sm" className="flex-1">
												<ExternalLink className="w-4 h-4 mr-1" />
												{m["locations.details"]()}
											</Button>
											<Button variant="outline" size="sm">
												<MapPin className="w-4 h-4" />
											</Button>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</div>
			) : (
				<div className="text-center py-24">
					<div className="max-w-lg mx-auto space-y-8">
						<div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
							<MapPin className="w-16 h-16 text-primary/60" />
						</div>
						<div className="space-y-4">
							<h3 className="text-2xl font-semibold">
								{m["locations.no_locations"]()}
							</h3>
							<p className="text-muted-foreground leading-relaxed text-lg max-w-md mx-auto">
								{m["locations.no_locations_description"]()}
							</p>
						</div>
						<div className="space-y-6">
							<Button size="lg" className="shadow-sm px-8 py-3 text-base">
								<Plus className="w-5 h-5 mr-2" />
								{m["locations.add_first"]()}
							</Button>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-md mx-auto">
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🎭</span>
									<span className="text-sm font-medium">
										{m["locations.category_attractions"]()}
									</span>
								</div>
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🍽️</span>
									<span className="text-sm font-medium">
										{m["locations.category_restaurants"]()}
									</span>
								</div>
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🏛️</span>
									<span className="text-sm font-medium">
										{m["locations.category_museums"]()}
									</span>
								</div>
								<div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg">
									<span className="text-2xl">🌳</span>
									<span className="text-sm font-medium">
										{m["locations.category_parks"]()}
									</span>
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
							{m["locations.discovery_title"]()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									{m["locations.discovery_search_title"]()}
								</h4>
								<p className="text-sm text-muted-foreground">
									{m["locations.discovery_search_description"]()}
								</p>
							</div>
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									{m["locations.discovery_reviews_title"]()}
								</h4>
								<p className="text-sm text-muted-foreground">
									{m["locations.discovery_reviews_description"]()}
								</p>
							</div>
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									{m["locations.discovery_location_title"]()}
								</h4>
								<p className="text-sm text-muted-foreground">
									{m["locations.discovery_location_description"]()}
								</p>
							</div>
							<div className="space-y-3">
								<h4 className="font-medium flex items-center gap-2">
									{m["locations.discovery_tips_title"]()}
								</h4>
								<p className="text-sm text-muted-foreground">
									{m["locations.discovery_tips_description"]()}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
