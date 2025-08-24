import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import type { Travel } from "@/lib/types";
import {
	Bed,
	Building,
	Calendar,
	ChevronDown,
	Clock,
	DollarSign,
	Download,
	Lightbulb,
	MapPin,
	Mountain,
	Phone,
	Plane,
	UtensilsCrossed,
} from "lucide-react";
import WeatherWidget from "./WeatherWidget";
import { Button } from "./ui/button";

interface TravelInfoSidebarProps {
	travel?: Travel;
	className?: string;
}

export default function TravelInfoSidebar({
	travel,
	className = "",
}: TravelInfoSidebarProps) {
	const activityCategories = [
		{
			title: "Food Tours & Markets",
			description:
				"Explore local cuisine through guided market tours and street food experiences",
			color: "text-chart-3",
			icon: UtensilsCrossed,
		},
		{
			title: "Cultural Sites",
			description:
				"Visit historical landmarks and museums showcasing local heritage",
			color: "text-chart-1",
			icon: Building,
		},
		{
			title: "Adventure Activities",
			description: "Sandboarding, dune buggy rides, and desert exploration",
			color: "text-chart-5",
			icon: Mountain,
		},
	];

	// Use travel data if provided, otherwise use defaults
	const locationInfo = travel?.locationInfo || {
		destination: "Peru",
		country: "Peru",
		climate: "Desert coastal with mild temperatures",
		currency: "Peruvian Sol (PEN)",
		language: "Spanish",
		timeZone: "GMT-5",
		bestTimeToVisit: "December to April",
	};

	const visaInfo = travel?.visaInfo || {
		required: false,
		stayDuration: "90 days tourist visa on arrival",
		documents: [
			"Valid passport (6+ months)",
			"Return ticket",
			"Proof of accommodation",
		],
		vaccinations: ["Yellow fever (recommended)", "Hepatitis A/B"],
	};

	const accommodations = travel?.accommodation || [];

	// Calculate travel statistics
	const totalDays = travel
		? Math.ceil(
				(travel.endDate.getTime() - travel.startDate.getTime()) /
					(1000 * 60 * 60 * 24),
			)
		: 0;
	const totalEvents = travel?.events.length || 0;
	const totalAccommodations = accommodations.length;
	const totalCost = accommodations.reduce((sum, acc) => {
		if (acc.price && acc.currency === "USD") {
			const nights = Math.ceil(
				(acc.endDate.getTime() - acc.startDate.getTime()) /
					(1000 * 60 * 60 * 24),
			);
			return sum + acc.price * nights;
		}
		return sum;
	}, 0);

	const handleExportItinerary = () => {
		if (!travel) return;

		// Create a simple text export of the itinerary
		const itinerary = [
			`${travel.name}`,
			`${travel.destination} • ${travel.startDate.toLocaleDateString()} - ${travel.endDate.toLocaleDateString()}`,
			"",
			"ACCOMMODATIONS:",
			...accommodations.map(
				(acc) =>
					`• ${acc.name} (${acc.startDate.toLocaleDateString()} - ${acc.endDate.toLocaleDateString()})`,
			),
			"",
			"EVENTS:",
			...travel.events
				.slice(0, 10)
				.map(
					(event) =>
						`• ${event.startDate.toLocaleDateString()} ${event.startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${event.title}`,
				),
			...(travel.events.length > 10 ? ["  ... and more events"] : []),
		].join("\n");

		// Create and download file
		const blob = new Blob([itinerary], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${travel.name.replace(/\s+/g, "_")}_itinerary.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<div
			className={`w-80 bg-card border-l h-full overflow-y-auto ${className}`}
		>
			<div className="p-6">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold">Travel Information</h2>
					{travel && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleExportItinerary}
							className="flex items-center gap-2"
						>
							<Download className="h-4 w-4" />
							Export
						</Button>
					)}
				</div>

				{/* Travel Statistics */}
				{travel && (
					<div className="mb-6">
						<div className="grid grid-cols-2 gap-3 mb-4">
							<Card className="p-3">
								<div className="flex items-center gap-2">
									<Calendar className="h-4 w-4 text-chart-1" />
									<div>
										<div className="text-lg font-bold">{totalDays}</div>
										<div className="text-xs text-muted-foreground">Days</div>
									</div>
								</div>
							</Card>

							<Card className="p-3">
								<div className="flex items-center gap-2">
									<Clock className="h-4 w-4 text-chart-3" />
									<div>
										<div className="text-lg font-bold">{totalEvents}</div>
										<div className="text-xs text-muted-foreground">Events</div>
									</div>
								</div>
							</Card>

							<Card className="p-3">
								<div className="flex items-center gap-2">
									<Bed className="h-4 w-4 text-chart-4" />
									<div>
										<div className="text-lg font-bold">
											{totalAccommodations}
										</div>
										<div className="text-xs text-muted-foreground">Hotels</div>
									</div>
								</div>
							</Card>

							<Card className="p-3">
								<div className="flex items-center gap-2">
									<DollarSign className="h-4 w-4 text-chart-2" />
									<div>
										<div className="text-lg font-bold">${totalCost}</div>
										<div className="text-xs text-muted-foreground">Lodging</div>
									</div>
								</div>
							</Card>
						</div>
					</div>
				)}

				{/* Weather Widget */}
				{travel && <WeatherWidget destination={travel.destination} />}

				{/* Activities Overview */}
				<div className="mb-6">
					<div className="flex items-center gap-2 mb-4">
						<MapPin className="h-5 w-5 text-muted-foreground" />
						<h3 className="text-lg font-semibold">Activities Overview</h3>
						<ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
					</div>

					<div className="space-y-4">
						{activityCategories.map((category) => {
							const IconComponent = category.icon;
							return (
								<Card
									key={category.title}
									className="border-l-4 border-l-primary/20"
								>
									<CardContent className="p-4">
										<div className="flex items-start gap-3">
											<IconComponent
												className={`h-5 w-5 ${category.color} mt-0.5`}
											/>
											<div className="flex-1">
												<h4 className="font-semibold text-sm mb-1">
													{category.title}
												</h4>
												<p className="text-xs text-muted-foreground leading-relaxed">
													{category.description}
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>

				<Separator className="my-6" />

				{/* Accommodation Details */}
				<Collapsible className="mb-6">
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg">
						<div className="flex items-center gap-2">
							<Bed className="h-5 w-5 text-muted-foreground" />
							<h3 className="text-lg font-semibold">Accommodation Details</h3>
						</div>
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					</CollapsibleTrigger>

					<CollapsibleContent className="mt-4">
						<div className="space-y-3">
							{accommodations.length > 0 ? (
								accommodations.map((accommodation) => (
									<Card key={accommodation.id}>
										<CardHeader className="pb-3">
											<CardTitle className="text-base">
												{accommodation.name}
											</CardTitle>
											{accommodation.address && (
												<p className="text-sm text-muted-foreground">
													{accommodation.address}
												</p>
											)}
										</CardHeader>
										<CardContent className="pt-0">
											<div className="space-y-3 text-sm">
												<div className="flex justify-between">
													<span className="text-muted-foreground">
														Check-in:
													</span>
													<span>
														{accommodation.startDate.toLocaleDateString()}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">
														Check-out:
													</span>
													<span>
														{accommodation.endDate.toLocaleDateString()}
													</span>
												</div>
												<div className="flex justify-between">
													<span className="text-muted-foreground">
														Duration:
													</span>
													<span>
														{Math.ceil(
															(accommodation.endDate.getTime() -
																accommodation.startDate.getTime()) /
																(1000 * 60 * 60 * 24),
														)}{" "}
														nights
													</span>
												</div>
												<div className="flex justify-between items-center">
													<span className="text-muted-foreground">Type:</span>
													<Badge variant="secondary" className="capitalize">
														{accommodation.type}
													</Badge>
												</div>
												{accommodation.rating && (
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Rating:
														</span>
														<span>{accommodation.rating}/5 ⭐</span>
													</div>
												)}
												{accommodation.price && (
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Price/night:
														</span>
														<span>
															{accommodation.currency} {accommodation.price}
														</span>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								))
							) : (
								<Card>
									<CardContent className="p-4">
										<p className="text-sm text-muted-foreground">
											No accommodation details available
										</p>
									</CardContent>
								</Card>
							)}
						</div>
					</CollapsibleContent>
				</Collapsible>

				{/* Location Information */}
				<Collapsible className="mb-6">
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg">
						<div className="flex items-center gap-2">
							<MapPin className="h-5 w-5 text-muted-foreground" />
							<h3 className="text-lg font-semibold">Location Information</h3>
						</div>
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					</CollapsibleTrigger>

					<CollapsibleContent className="mt-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">
									{locationInfo.destination}
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-0">
								<div className="space-y-3 text-sm">
									<div>
										<span className="text-muted-foreground block mb-1">
											Climate:
										</span>
										<span>{locationInfo.climate}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Currency:</span>
										<span>{locationInfo.currency}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Language:</span>
										<span>{locationInfo.language}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">Time Zone:</span>
										<span>{locationInfo.timeZone}</span>
									</div>
									<div>
										<span className="text-muted-foreground block mb-1">
											Best time to visit:
										</span>
										<span>{locationInfo.bestTimeToVisit}</span>
									</div>

									{locationInfo.emergencyNumbers && (
										<div className="mt-4 pt-3 border-t">
											<div className="flex items-center gap-2 mb-2">
												<Phone className="h-4 w-4 text-destructive" />
												<span className="text-sm font-semibold text-destructive">
													Emergency Contacts
												</span>
											</div>
											<div className="space-y-2 text-xs">
												{locationInfo.emergencyNumbers.police && (
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Police:
														</span>
														<span className="font-mono">
															{locationInfo.emergencyNumbers.police}
														</span>
													</div>
												)}
												{locationInfo.emergencyNumbers.medical && (
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Medical:
														</span>
														<span className="font-mono">
															{locationInfo.emergencyNumbers.medical}
														</span>
													</div>
												)}
												{locationInfo.emergencyNumbers.embassy && (
													<div className="flex justify-between">
														<span className="text-muted-foreground">
															Embassy:
														</span>
														<span className="font-mono text-xs">
															{locationInfo.emergencyNumbers.embassy}
														</span>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</CollapsibleContent>
				</Collapsible>

				{/* Visa & Entry Requirements */}
				<Collapsible>
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg">
						<div className="flex items-center gap-2">
							<Plane className="h-5 w-5 text-muted-foreground" />
							<h3 className="text-lg font-semibold">
								Visa & Entry Requirements
							</h3>
						</div>
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					</CollapsibleTrigger>

					<CollapsibleContent className="mt-4">
						<Card>
							<CardContent className="p-4">
								<div className="space-y-4 text-sm">
									<div className="flex justify-between items-center">
										<span className="text-muted-foreground">
											Visa Required:
										</span>
										<Badge
											variant={visaInfo.required ? "destructive" : "secondary"}
										>
											{visaInfo.required ? "Yes" : "No"}
										</Badge>
									</div>

									<div>
										<span className="text-muted-foreground block mb-2">
											Stay Duration:
										</span>
										<span>{visaInfo.stayDuration}</span>
									</div>

									<div>
										<span className="text-muted-foreground block mb-2">
											Required Documents:
										</span>
										<ul className="space-y-1">
											{visaInfo.documents.map((doc) => (
												<li key={doc} className="flex items-center gap-2">
													<div className="w-1.5 h-1.5 bg-primary rounded-full" />
													<span className="text-xs">{doc}</span>
												</li>
											))}
										</ul>
									</div>

									<div>
										<span className="text-muted-foreground block mb-2">
											Recommended Vaccinations:
										</span>
										<ul className="space-y-1">
											{visaInfo.vaccinations.map((vaccine) => (
												<li key={vaccine} className="flex items-center gap-2">
													<div className="w-1.5 h-1.5 bg-chart-3 rounded-full" />
													<span className="text-xs">{vaccine}</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							</CardContent>
						</Card>
					</CollapsibleContent>
				</Collapsible>

				{/* Travel Tips */}
				<Collapsible className="mt-6">
					<CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted rounded-lg">
						<div className="flex items-center gap-2">
							<Lightbulb className="h-5 w-5 text-muted-foreground" />
							<h3 className="text-lg font-semibold">Travel Tips</h3>
						</div>
						<ChevronDown className="h-4 w-4 text-muted-foreground" />
					</CollapsibleTrigger>

					<CollapsibleContent className="mt-4">
						<Card>
							<CardContent className="p-4">
								<div className="space-y-3 text-sm">
									<div className="flex items-start gap-3">
										<div className="w-2 h-2 bg-chart-1 rounded-full mt-1.5 flex-shrink-0" />
										<div>
											<strong>Altitude Sickness:</strong> Take it easy your
											first day in Cusco (3,400m). Drink coca tea and avoid
											alcohol.
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="w-2 h-2 bg-chart-3 rounded-full mt-1.5 flex-shrink-0" />
										<div>
											<strong>Currency:</strong> Bring USD cash for better
											exchange rates. ATMs are widely available in cities.
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="w-2 h-2 bg-chart-2 rounded-full mt-1.5 flex-shrink-0" />
										<div>
											<strong>Food Safety:</strong> Stick to bottled water and
											well-cooked food. Street food is generally safe in tourist
											areas.
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="w-2 h-2 bg-chart-4 rounded-full mt-1.5 flex-shrink-0" />
										<div>
											<strong>Transportation:</strong> Book buses in advance for
											popular routes. Uber is available in Lima and Cusco.
										</div>
									</div>

									<div className="flex items-start gap-3">
										<div className="w-2 h-2 bg-destructive rounded-full mt-1.5 flex-shrink-0" />
										<div>
											<strong>Safety:</strong> Keep copies of important
											documents. Avoid displaying expensive items in public.
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</CollapsibleContent>
				</Collapsible>
			</div>
		</div>
	);
}
