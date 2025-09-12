import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import {
	Link,
	Outlet,
	createFileRoute,
	useLocation,
} from "@tanstack/react-router";
import { Calendar, Clock, Home, MapPin, Plane, Users } from "lucide-react";

export const Route = createFileRoute("/trip/$travelId")({
	component: TripLayout,
});

function TripLayout() {
	const { travelId } = Route.useParams();
	const location = useLocation();

	const travelQuery = useQuery(
		orpc.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;

	const tabRoutes = [
		{
			value: "itinerary",
			path: `/trip/${travelId}`,
			label: "Itinerário",
			icon: Clock,
		},
		{
			value: "flights",
			path: `/trip/${travelId}/flights`,
			label: "Voos",
			icon: Plane,
		},
		{
			value: "accommodations",
			path: `/trip/${travelId}/accommodations`,
			label: "Acomodações",
			icon: Home,
		},
		{
			value: "locations",
			path: `/trip/${travelId}/locations`,
			label: "Locais",
			icon: MapPin,
		},
		{
			value: "members",
			path: `/trip/${travelId}/members`,
			label: "Membros",
			icon: Users,
		},
	];

	const formatTravelDates = (startDate?: Date, endDate?: Date) => {
		if (!startDate || !endDate) return null;

		const start = startDate.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
		});
		const end = endDate.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});

		return `${start} - ${end}`;
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Travel Header */}
			<header className="bg-background border-b sticky top-0 z-40">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="pt-6 space-y-4">
						{/* Travel Title and Info */}
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="space-y-2">
								<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
									{travel?.name || "Carregando..."}
								</h1>
								{travel && (
									<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
										<div className="flex items-center gap-2">
											<MapPin className="w-4 h-4" />
											<span>{travel.destination}</span>
										</div>
										{travel.startDate && travel.endDate && (
											<div className="flex items-center gap-2">
												<Calendar className="w-4 h-4" />
												<span>
													{formatTravelDates(travel.startDate, travel.endDate)}
												</span>
											</div>
										)}
										<div className="flex items-center gap-2">
											<Plane className="w-4 h-4" />
											<span>
												{Math.ceil(
													(new Date(travel.endDate).getTime() -
														new Date(travel.startDate).getTime()) /
														(1000 * 60 * 60 * 24),
												)}{" "}
												dias
											</span>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Navigation Tabs */}
						<div className="border-b">
							<nav className="flex overflow-x-auto scrollbar-hide -mb-px">
								{tabRoutes.map((tab) => {
									const Icon = tab.icon;
									const isActive = location.pathname === tab.path;
									return (
										<Link
											key={tab.value}
											to={tab.path}
											className={`flex items-center gap-3 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-fit ${
												isActive
													? "border-primary text-primary"
													: "border-transparent hover:border-primary/50 text-muted-foreground hover:text-foreground"
											}`}
										>
											<Icon className="w-4 h-4 flex-shrink-0" />
											<span>{tab.label}</span>
										</Link>
									);
								})}
							</nav>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="py-8 lg:py-12">
					<div className="mx-auto">
						<Outlet />
					</div>
				</div>
			</main>
		</div>
	);
}
