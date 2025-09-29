import { FloatingConciergeToggle } from "@/routes/trip/$travelId/-components/FloatingConciergeToggle";
import {
	ConciergeChatProvider,
	useConciergeChatContext,
} from "@/routes/trip/$travelId/concierge/-components/concierge-chat-context";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import {
	Link,
	Outlet,
	createFileRoute,
	useLocation,
} from "@tanstack/react-router";
import {
	Calendar,
	Clock,
	ConciergeBell,
	DollarSign,
	Home,
	MapPin,
	Plane,
	Settings,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/trip/$travelId")({
	component: TripLayout,
});

function formatTravelDates(startDate?: Date, endDate?: Date) {
	if (!startDate || !endDate) return null;

	const start = startDate.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		timeZone: "UTC",
	});
	const end = endDate.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	});

	return `${start} - ${end}`;
}

function calculateTripDaysUTC(startDate: Date, endDate: Date) {
	const startUTC = Date.UTC(
		startDate.getUTCFullYear(),
		startDate.getUTCMonth(),
		startDate.getUTCDate(),
	);
	const endUTC = Date.UTC(
		endDate.getUTCFullYear(),
		endDate.getUTCMonth(),
		endDate.getUTCDate(),
	);
	return Math.ceil((endUTC - startUTC) / (1000 * 60 * 60 * 24));
}

interface TripLayoutMinimalTravel {
	name?: string | null;
	destination?: string | null;
	startDate?: Date;
	endDate?: Date;
	userMembership?: {
		role: "owner" | "member";
	} | null;
}

function TripLayout() {
	const { travelId } = Route.useParams();
	const { pathname } = useLocation();

	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data as TripLayoutMinimalTravel | undefined;

	return (
		<ConciergeChatProvider
			travelId={travelId}
			travelName={travel?.name ?? undefined}
		>
			<TripLayoutContent
				travelId={travelId}
				travel={travel}
				pathname={pathname}
			/>
		</ConciergeChatProvider>
	);
}

interface TripLayoutContentProps {
	travelId: string;
	travel: TripLayoutMinimalTravel | undefined;
	pathname: string;
}

function TripLayoutContent({
	travelId,
	travel,
	pathname,
}: TripLayoutContentProps) {
	const tabRoutes = [
		{
			value: "concierge",
			path: `/trip/${travelId}/concierge`,
			label: "Concierge",
			icon: ConciergeBell,
		},
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
		{
			value: "financial",
			path: `/trip/${travelId}/financial`,
			label: "Financeiro",
			icon: DollarSign,
		},
		{
			value: "settings",
			path: `/trip/${travelId}/settings`,
			label: "Configurações",
			icon: Settings,
		},
	];

	const navRef = useRef<HTMLElement | null>(null);
	const [showRightFade, setShowRightFade] = useState(false);
	const { pendingSummary, isPendingIssuesLoading } = useConciergeChatContext();
	const hasPendingIssues = pendingSummary?.hasIssues ?? false;
	const hasCriticalPending = pendingSummary?.hasCritical ?? false;
	const showPendingIndicator = !isPendingIssuesLoading && hasPendingIssues;
	const indicatorPulseClass = hasCriticalPending
		? "bg-destructive/60"
		: "bg-amber-400/70";
	const indicatorDotClass = hasCriticalPending
		? "bg-destructive"
		: "bg-amber-500";

	useEffect(() => {
		const el = navRef.current;
		if (!el) return;

		const updateFade = () => {
			const { scrollWidth, clientWidth, scrollLeft } = el;
			const hasOverflow = scrollWidth > clientWidth + 1;
			const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
			setShowRightFade(hasOverflow && !atEnd);
		};

		updateFade();
		const handleScroll: EventListener = () => updateFade();
		el.addEventListener("scroll", handleScroll, {
			passive: true,
		} as AddEventListenerOptions);
		window.addEventListener("resize", updateFade);
		return () => {
			el.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", updateFade);
		};
	}, []);

	useEffect(() => {
		const el = navRef.current;
		if (!el) return;
		const active = el.querySelector<HTMLAnchorElement>("a[data-active='true']");
		if (!active) return;
		const desiredLeft =
			active.offsetLeft - (el.clientWidth - active.clientWidth) / 2;
		const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth);
		const nextLeft = Math.max(0, Math.min(desiredLeft, maxLeft));
		el.scrollTo({ left: nextLeft, behavior: "auto" });
		const { scrollWidth, clientWidth, scrollLeft } = el;
		const hasOverflow = scrollWidth > clientWidth + 1;
		const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
		setShowRightFade(hasOverflow && !atEnd);
	}, []);

	const visibleTabs = tabRoutes.filter((tab) => {
		if (tab.value === "concierge") {
			return !!travel?.userMembership;
		}
		if (tab.value === "members") {
			return !!travel?.userMembership;
		}
		if (tab.value === "settings") {
			return travel?.userMembership?.role === "owner";
		}
		if (tab.value === "financial") {
			return travel?.userMembership !== null;
		}
		return true;
	});

	const isConciergePath = pathname.startsWith(`/trip/${travelId}/concierge`);
	const canAccessConcierge = !!travel?.userMembership;

	return (
		<div className="bg-background">
		{/* Travel Header */}
		<header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 sm:sticky sm:top-16 z-30">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="space-y-4">
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
											{travel.startDate && travel.endDate
												? `${calculateTripDaysUTC(new Date(travel.startDate), new Date(travel.endDate))} dias`
												: ""}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="sticky top-16 z-30 bg-transparent border-b border-border/50 sm:static">
						<nav
							ref={navRef}
							className="flex overflow-x-auto scrollbar-hide -mb-px"
						>
							{visibleTabs.map((tab) => {
								const Icon = tab.icon;
								const isActive = pathname === tab.path;
								const renderIndicator = tab.value === "concierge" && showPendingIndicator;
								return (
									<Link
										key={tab.value}
										to={tab.path}
										data-active={isActive ? "true" : undefined}
										className={`flex items-center gap-3 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-fit ${
											isActive
												? "border-primary text-primary"
												: "border-transparent hover:border-primary/50 text-muted-foreground hover:text-foreground"
										}`}
									>
										<Icon className="w-4 h-4 flex-shrink-0" />
										<span className="flex items-center gap-2">
											{tab.label}
											{renderIndicator ? (
												<span className="relative inline-flex h-2 w-2 items-center justify-center">
													<span
														aria-hidden="true"
														className={`absolute inline-flex h-full w-full rounded-full ${indicatorPulseClass} animate-ping`}
													/>
													<span
														aria-hidden="true"
														className={`relative inline-flex h-2 w-2 rounded-full ${indicatorDotClass}`}
													/>
													<span className="sr-only">Pendências ativas</span>
												</span>
											) : null}
										</span>
									</Link>
								);
							})}
						</nav>
						{showRightFade ? (
							<div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:hidden bg-gradient-to-l from-background to-transparent" />
						) : null}
					</div>
				</div>
			</div>
		</header>

		<main className="container mx-auto px-4 sm:px-6 lg:px-8">
			<div className="pb-8 pt-4 lg:pb-12 lg:pt-8">
				<div className="mx-auto">
					<Outlet />
				</div>
			</div>
		</main>
		{canAccessConcierge && !isConciergePath ? <FloatingConciergeToggle /> : null}
	</div>
	);
}
