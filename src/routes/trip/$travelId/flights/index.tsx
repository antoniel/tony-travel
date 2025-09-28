import { AddOrEditFlightForm } from "@/components/flights/add-or-edit-flight-form";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTravelMembership } from "@/hooks/useTravelMembership";
import { orpc } from "@/orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	ChevronDown,
	ChevronUp,
	DollarSign,
	Edit2,
	Info,
	Plane,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/trip/$travelId/flights/")({
	component: FlightsPage,
});

interface FlightParticipant {
	id: string;
	user: {
		id: string;
		name: string;
		image?: string | null;
	};
}

interface FlightWithParticipants {
	id: string;
	originAirport: string;
	destinationAirport: string;
	departureDate: Date;
	departureTime: string;
	arrivalDate: Date;
	arrivalTime: string;
	totalAmount: number | null;
	currency: string | null;
	travelId: string;
	createdAt: Date;
	updatedAt: Date;
	slices: FlightSliceWithSegments[];
	participants: FlightParticipant[];
}

interface FlightSliceWithSegments {
	id: string;
	originAirport: string;
	destinationAirport: string;
	durationMinutes: number | null;
	cabinClass?: string | null;
	segments: FlightSegment[];
}

interface FlightSegment {
	id: string;
	originAirport: string;
	destinationAirport: string;
	departureDate: Date;
	departureTime: string;
	arrivalDate: Date;
	arrivalTime: string;
	marketingFlightNumber?: string | null;
	operatingCarrierCode?: string | null;
	aircraftName?: string | null;
	aircraftType?: string | null;
	distanceMeters?: number | null;
	durationMinutes?: number | null;
}

interface Member {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

// Flight chain information interface
interface FlightChainInfo {
	chainId: string;
	chainPosition: number;
	totalInChain: number;
	chainType: "round_trip" | "multi_city" | "one_way";
	relatedFlightIds: string[];
}

// New hierarchical interfaces for better UX
interface FlightWithSlices {
	id: string;
	originAirport: string;
	destinationAirport: string;
	departureDate: Date;
	departureTime: string;
	arrivalDate: Date;
	arrivalTime: string;
	totalAmount: number | null;
	currency: string | null;
	travelId: string;
	createdAt: Date;
	updatedAt: Date;
	participants: FlightParticipant[];
	slices: FlightSliceWithSegments[];
	// Computed properties
	isMultiSlice: boolean;
	totalDuration: number | null;
	totalSegments: number;
	// Chain information for visual linking
	chainInfo: FlightChainInfo | null;
}

interface HierarchicalFlightGroup {
	originAirport: string;
	flights: FlightWithSlices[];
}

// Utility functions for hierarchical flights
const getFlightCostValue = (flight: FlightWithSlices) =>
	flight.totalAmount ?? null;

const getFlightCurrency = (flight: FlightWithSlices) =>
	flight.currency || "BRL";

const getFlightRoute = (flight: FlightWithSlices) => {
	if (flight.isMultiSlice) {
		const origins = flight.slices.map((slice) => slice.originAirport);
		const lastDestination =
			flight.slices[flight.slices.length - 1]?.destinationAirport;
		return `${origins.join(" → ")} → ${lastDestination}`;
	}
	return `${flight.originAirport} → ${flight.destinationAirport}`;
};

const formatDuration = (minutes: number | null) => {
	if (!minutes || Number.isNaN(minutes)) {
		return null;
	}
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	const parts = [] as string[];
	if (hours > 0) {
		parts.push(`${hours}h`);
	}
	if (remainingMinutes > 0) {
		parts.push(`${remainingMinutes}min`);
	}
	return parts.length > 0 ? parts.join(" ") : `${minutes}min`;
};

// Chain utility functions for visual linking
const CHAIN_COLORS = [
	"from-blue-400 to-blue-600",
	"from-emerald-400 to-emerald-600",
	"from-purple-400 to-purple-600",
	"from-orange-400 to-orange-600",
	"from-pink-400 to-pink-600",
	"from-cyan-400 to-cyan-600",
	"from-red-400 to-red-600",
	"from-indigo-400 to-indigo-600",
] as const;

const getChainColor = (chainId: string): string => {
	// Create a simple hash from chainId to pick a consistent color
	let hash = 0;
	for (let i = 0; i < chainId.length; i++) {
		hash = chainId.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % CHAIN_COLORS.length;
	return CHAIN_COLORS[index];
};

const getChainTypeLabel = (chainType: FlightChainInfo["chainType"]): string => {
	switch (chainType) {
		case "round_trip":
			return "ida e volta";
		case "multi_city":
			return "múltiplas cidades";
		case "one_way":
			return "só ida";
		default:
			return "";
	}
};

const getSmartCostDisplay = (flight: FlightWithSlices) => {
	const costValue = getFlightCostValue(flight);
	const currency = getFlightCurrency(flight);
	const currencyLabel = currency === "BRL" ? "R$" : currency;

	if (!costValue) {
		return { display: "Sem preço definido", hasValue: false };
	}

	const chainInfo = flight.chainInfo;
	const isPartOfChain = chainInfo && chainInfo.totalInChain > 1;

	if (isPartOfChain) {
		const chainTypeLabel = getChainTypeLabel(chainInfo.chainType);
		return {
			display: `${currencyLabel} ${costValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${chainTypeLabel})`,
			hasValue: true,
			isChainTotal: true,
		};
	}

	return {
		display: `${currencyLabel} ${costValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
		hasValue: true,
		isChainTotal: false,
	};
};

function FlightWarnings({
	flightsWithoutParticipants,
	flightsWithoutCost,
}: {
	flightsWithoutParticipants: number;
	flightsWithoutCost: number;
}) {
	if (flightsWithoutParticipants === 0 && flightsWithoutCost === 0) {
		return null;
	}

	return (
		<div className="space-y-4">
			{flightsWithoutParticipants > 0 && (
				<Alert>
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						{flightsWithoutParticipants} voo(s) sem participantes. Adicione
						pessoas aos voos para melhor organização.
					</AlertDescription>
				</Alert>
			)}
			{flightsWithoutCost > 0 && (
				<Alert variant="default" className="border-orange-200 bg-orange-50/50">
					<Info className="h-4 w-4 text-orange-600" />
					<AlertDescription className="text-orange-800">
						{flightsWithoutCost} voo(s) sem preço informado.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}

function FlightPageHeader({
	isAddFlightOpen,
	setIsAddFlightOpen,
	travelId,
	members,
	canWrite,
}: {
	isAddFlightOpen: boolean;
	setIsAddFlightOpen: (open: boolean) => void;
	travelId: string;
	members: Member[];
	canWrite: boolean;
}) {
	return (
		<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
			<div className="space-y-3">
				<h1 className="text-3xl font-bold tracking-tight">Voos da Viagem</h1>
				<p className="text-lg text-muted-foreground">
					Gerencie os voos de todos os membros da viagem
				</p>
			</div>
			{canWrite ? (
				<ResponsiveModal
					open={isAddFlightOpen}
					onOpenChange={setIsAddFlightOpen}
					trigger={
						<Button className="flex items-center gap-2">
							<Plus className="w-4 h-4" />
							Adicionar Voo
						</Button>
					}
					desktopClassName="sm:max-w-2xl"
					contentClassName="gap-0"
				>
					<DialogHeader className="border-b px-6 py-4">
						<DialogTitle className="text-left">Adicionar Novo Voo</DialogTitle>
					</DialogHeader>
					<div className="flex flex-1 flex-col overflow-hidden">
						<AddOrEditFlightForm
							travelId={travelId}
							members={members}
							onClose={() => setIsAddFlightOpen(false)}
						/>
					</div>
				</ResponsiveModal>
			) : null}
		</div>
	);
}

function FlightsPage() {
	const { travelId } = Route.useParams();
	const [isAddFlightOpen, setIsAddFlightOpen] = useState(false);
	const [isEditFlightOpen, setIsEditFlightOpen] = useState(false);
	const [editingFlight, setEditingFlight] =
		useState<FlightWithParticipants | null>(null);
	const queryClient = useQueryClient();

	// Check membership for write permissions
	const travelMembershipQuery = useTravelMembership(travelId);
	const canWrite = !!travelMembershipQuery.data?.userMembership;

	// Fetch hierarchical flights for better UX
	const hierarchicalFlightsQuery = useQuery(
		orpc.flightRoutes.getHierarchicalFlightsByTravel.queryOptions({
			input: { travelId },
		}),
	);

	// Fetch travel members (only if member)
	const membersQuery = useQuery({
		...orpc.invitationRoutes.getTravelMembers.queryOptions({
			input: { travelId },
		}),
		enabled: canWrite,
	});

	// Delete flight mutation
	const deleteFlightMutation = useMutation(
		orpc.flightRoutes.deleteFlight.mutationOptions(),
	);

	const isLoading =
		hierarchicalFlightsQuery.isLoading || membersQuery.isLoading;
	const hierarchicalFlightGroups = hierarchicalFlightsQuery.data || [];
	const members =
		membersQuery.data?.map((member) => ({
			id: member.user.id,
			name: member.user.name,
			email: member.user.email,
			image: member.user.image,
		})) || [];

	// Calculate stats based on hierarchical flights
	const allHierarchicalFlights = hierarchicalFlightGroups.flatMap(
		(group) => group.flights,
	);
	const totalFlights = allHierarchicalFlights.length;
	const flightsWithoutParticipants = allHierarchicalFlights.filter(
		(f) => f.participants.length === 0,
	);
	const flightsWithoutCost = allHierarchicalFlights.filter(
		(f) => getFlightCostValue(f) === null,
	);

	const formatDate = (date: Date) => {
		// Datas de voo são "date-only" (sem horário); formatamos em UTC para
		// evitar recuo de um dia por conta do fuso local.
		return new Date(date).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
			timeZone: "UTC",
		});
	};

	const formatTime = (time: string) => {
		return time.slice(0, 5); // Remove seconds if present
	};

	// Handle edit flight - direct edit since we have the complete flight data
	const handleEditFlight = (flight: FlightWithSlices) => {
		// Convert to the expected format for the edit form
		const editFlight: FlightWithParticipants = {
			...flight,
			// The edit form expects the original structure
		};
		setEditingFlight(editFlight);
		setIsEditFlightOpen(true);
	};

	// Handle delete flight
	const handleDeleteFlight = async (flightId: string) => {
		if (
			confirm(
				"Tem certeza que deseja excluir este voo? Isso removerá todos os trechos deste voo.",
			)
		) {
			try {
				await deleteFlightMutation.mutateAsync({ id: flightId });
				// Refresh flights data
				queryClient.invalidateQueries(
					orpc.flightRoutes.getHierarchicalFlightsByTravel.queryOptions({
						input: { travelId },
					}),
				);
				queryClient.invalidateQueries(
					orpc.flightRoutes.getSliceFlightsByTravel.queryOptions({
						input: { travelId },
					}),
				);
			} catch (error) {
				console.error("Error deleting flight:", error);
			}
		}
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
			<FlightPageHeader
				isAddFlightOpen={isAddFlightOpen}
				setIsAddFlightOpen={setIsAddFlightOpen}
				travelId={travelId}
				members={members}
				canWrite={canWrite}
			/>

			<FlightWarnings
				flightsWithoutParticipants={flightsWithoutParticipants.length}
				flightsWithoutCost={flightsWithoutCost.length}
			/>

			<HierarchicalFlightsList
				totalFlights={totalFlights}
				hierarchicalFlightGroups={hierarchicalFlightGroups}
				formatDate={formatDate}
				formatTime={formatTime}
				onAddFlight={() => setIsAddFlightOpen(true)}
				onEditFlight={handleEditFlight}
				onDeleteFlight={handleDeleteFlight}
				canWrite={canWrite}
			/>

			{/* Edit Flight Dialog (members only) */}
			{canWrite ? (
				<ResponsiveModal
					open={isEditFlightOpen}
					onOpenChange={(open) => {
						setIsEditFlightOpen(open);
						if (!open) {
							setEditingFlight(null);
						}
					}}
					desktopClassName="sm:max-w-2xl"
					contentClassName="gap-0"
				>
					<DialogHeader className="border-b px-6 py-4">
						<DialogTitle className="text-left">Editar Voo</DialogTitle>
					</DialogHeader>
					{editingFlight ? (
						<AddOrEditFlightForm
							flight={editingFlight}
							travelId={travelId}
							members={members}
							onClose={() => {
								setIsEditFlightOpen(false);
								setEditingFlight(null);
							}}
						/>
					) : null}
				</ResponsiveModal>
			) : null}
		</div>
	);
}

function EmptyFlightState({
	onAddFlight,
	canWrite,
}: { onAddFlight: () => void; canWrite: boolean }) {
	return (
		<Card className="relative overflow-hidden border-dashed border-2 border-border/50 bg-gradient-to-br from-background via-muted/20 to-background">
			<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
			<CardContent className="relative p-16 text-center">
				<div className="space-y-8">
					<div className="relative mx-auto">
						<div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shadow-lg">
							<div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
								<Plane className="w-10 h-10 text-primary animate-pulse" />
							</div>
						</div>
						<div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce" />
						<div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full animate-bounce delay-100" />
					</div>

					<div className="space-y-4">
						<h3 className="text-2xl font-bold text-foreground tracking-tight">
							Nenhum voo cadastrado
						</h3>
						<p className="text-lg text-muted-foreground max-w-md mx-auto">
							Comece adicionando os primeiros voos da sua viagem para organizar
							todos os deslocamentos
						</p>
					</div>

					{canWrite ? (
						<div className="pt-4">
							<Button
								onClick={onAddFlight}
								className="px-8 py-3 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-200"
							>
								<Plus className="w-5 h-5 mr-2" />
								Adicionar Primeiro Voo
							</Button>
						</div>
					) : null}
				</div>
			</CardContent>
		</Card>
	);
}

function HierarchicalFlightGroupHeader({
	group,
	isOpen,
	onToggle,
}: { group: HierarchicalFlightGroup; isOpen: boolean; onToggle: () => void }) {
	const totalPassengers = group.flights.reduce(
		(total, flight) => total + flight.participants.length,
		0,
	);
	const totalSlices = group.flights.reduce(
		(total, flight) => total + flight.slices.length,
		0,
	);
	const multiSliceFlights = group.flights.filter((f) => f.isMultiSlice).length;

	return (
		<div className="relative">
			<CollapsibleTrigger asChild>
				<button
					type="button"
					onClick={onToggle}
					className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-border/50 hover:border-border transition-colors cursor-pointer"
				>
					<div className="relative">
						<div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-sm">
							<Plane className="w-6 h-6 text-primary" />
						</div>
						<div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-green-400 to-green-600 rounded-full shadow-sm" />
					</div>
					<div className="flex-1 text-left">
						<h2 className="text-xl font-bold text-foreground tracking-tight">
							Partindo de {group.originAirport}
						</h2>
						<p className="text-sm text-muted-foreground font-medium">
							{group.flights.length}{" "}
							{group.flights.length === 1 ? "voo" : "voos"} • {totalSlices}{" "}
							{totalSlices === 1 ? "trecho" : "trechos"} • {totalPassengers}{" "}
							{totalPassengers === 1 ? "passageiro" : "passageiros"}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<div className="px-3 py-1 rounded-full bg-background/80 border border-border/50">
							<span className="text-xs font-semibold text-primary">
								{group.flights.length} voos
							</span>
						</div>
						{isOpen ? (
							<ChevronUp className="w-5 h-5 text-muted-foreground" />
						) : (
							<ChevronDown className="w-5 h-5 text-muted-foreground" />
						)}
					</div>
				</button>
			</CollapsibleTrigger>
		</div>
	);
}

// Legacy component

function HierarchicalFlightsList({
	totalFlights,
	hierarchicalFlightGroups,
	formatDate,
	formatTime,
	onAddFlight,
	onEditFlight,
	onDeleteFlight,
	canWrite,
}: {
	totalFlights: number;
	hierarchicalFlightGroups: HierarchicalFlightGroup[];
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
	onAddFlight: () => void;
	onEditFlight: (flight: FlightWithSlices) => void;
	onDeleteFlight: (flightId: string) => void;
	canWrite: boolean;
}) {
	// State to track which groups are open (all open by default)
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

	// Initialize openGroups when hierarchicalFlightGroups change
	useEffect(() => {
		setOpenGroups((prevOpenGroups) => {
			const initialState = hierarchicalFlightGroups.reduce(
				(acc, group) => {
					// Keep existing state if it exists, otherwise default to open
					acc[group.originAirport] =
						prevOpenGroups[group.originAirport] ?? true;
					return acc;
				},
				{} as Record<string, boolean>,
			);

			return initialState;
		});
	}, [hierarchicalFlightGroups]);

	const toggleGroup = (originAirport: string) => {
		setOpenGroups((prev) => ({
			...prev,
			[originAirport]: !prev[originAirport],
		}));
	};

	if (totalFlights === 0) {
		return <EmptyFlightState onAddFlight={onAddFlight} canWrite={canWrite} />;
	}

	return (
		<div className="space-y-8">
			{hierarchicalFlightGroups.map((group) => (
				<Collapsible
					key={group.originAirport}
					open={openGroups[group.originAirport]}
					onOpenChange={(open) =>
						setOpenGroups((prev) => ({ ...prev, [group.originAirport]: open }))
					}
				>
					<div className="space-y-6">
						<HierarchicalFlightGroupHeader
							group={group}
							isOpen={openGroups[group.originAirport]}
							onToggle={() => toggleGroup(group.originAirport)}
						/>

						<CollapsibleContent className="space-y-6">
							{group.flights.map((flight) => (
								<FlightContainer
									key={flight.id}
									flight={flight}
									formatDate={formatDate}
									formatTime={formatTime}
									onEdit={onEditFlight}
									onDelete={onDeleteFlight}
									canWrite={canWrite}
								/>
							))}
						</CollapsibleContent>
					</div>
				</Collapsible>
			))}
		</div>
	);
}

function FlightContainer({
	flight,
	formatDate,
	formatTime,
	onEdit,
	onDelete,
	canWrite,
}: {
	flight: FlightWithSlices;
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
	onEdit: (flight: FlightWithSlices) => void;
	onDelete: (flightId: string) => void;
	canWrite: boolean;
}) {
	const hasParticipants = flight.participants.length > 0;
	const flightRoute = getFlightRoute(flight);

	// Chain information
	const chainInfo = flight.chainInfo;
	const isPartOfChain = chainInfo && chainInfo.totalInChain > 1;
	const chainColor = chainInfo ? getChainColor(chainInfo.chainId) : null;

	// Smart cost display
	const costDisplay = getSmartCostDisplay(flight);

	return (
		<Card className="group relative overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-background via-background to-muted/10">
			{/* Status indicator bar with chain colors */}
			<div
				className={`absolute top-0 left-0 right-0 h-1 ${
					!hasParticipants
						? "bg-gradient-to-r from-orange-400 to-orange-600"
						: !costDisplay.hasValue
							? "bg-gradient-to-r from-amber-400 to-amber-600"
							: chainColor
								? `bg-gradient-to-r ${chainColor}`
								: flight.isMultiSlice
									? "bg-gradient-to-r from-purple-400 via-blue-500 to-green-500"
									: "bg-gradient-to-r from-emerald-400 to-blue-500"
				}`}
			/>

			<CardContent className="p-6">
				{/* Header Section */}
				<div className="flex items-start justify-between mb-6">
					<div className="flex-1">
						<div className="flex items-center gap-3 mb-2">
							<div className="flex items-center gap-2">
								<Plane className="w-5 h-5 text-primary" />
								<h3 className="text-lg font-bold text-foreground">
									{flightRoute}
								</h3>
							</div>
							{isPartOfChain && (
								<span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
									{chainInfo.chainPosition} de {chainInfo.totalInChain}
								</span>
							)}
						</div>

						{/* Flight Details */}
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<div className="flex items-center gap-1">
								<Calendar className="w-3 h-3" />
								<span>{formatDate(flight.departureDate)}</span>
							</div>
							<div className="flex items-center gap-1">
								<span>
									{formatTime(flight.departureTime)} →{" "}
									{formatTime(flight.arrivalTime)}
								</span>
							</div>
							{flight.totalDuration && (
								<div className="flex items-center gap-1">
									<span>{formatDuration(flight.totalDuration)}</span>
								</div>
							)}
						</div>
					</div>

					{/* Actions */}
					{canWrite && (
						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 rounded-full hover:bg-primary/10"
								onClick={() => onEdit(flight)}
							>
								<Edit2 className="w-4 h-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
								onClick={() => onDelete(flight.id)}
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</div>
					)}
				</div>

				{/* Main Content Area */}
				{flight.isMultiSlice ? (
					<MultiSliceFlightView
						flight={flight}
						formatDate={formatDate}
						formatTime={formatTime}
					/>
				) : (
					<SingleSliceFlightView
						flight={flight}
						formatDate={formatDate}
						formatTime={formatTime}
					/>
				)}

				{/* Footer Section */}
				<div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
					<div className="flex items-center gap-4">
						{/* Smart Cost Display */}
						{costDisplay.hasValue ? (
							<div
								className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
									costDisplay.isChainTotal
										? "bg-blue-50 border border-blue-200"
										: "bg-emerald-50 border border-emerald-200"
								}`}
							>
								<DollarSign
									className={`w-4 h-4 ${
										costDisplay.isChainTotal
											? "text-blue-600"
											: "text-emerald-600"
									}`}
								/>
								<span
									className={`text-sm font-bold ${
										costDisplay.isChainTotal
											? "text-blue-700"
											: "text-emerald-700"
									}`}
								>
									{costDisplay.display}
								</span>
							</div>
						) : (
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
								<Info className="w-4 h-4 text-amber-600" />
								<span className="text-sm font-medium text-amber-700">
									{costDisplay.display}
								</span>
							</div>
						)}

						{/* Participants */}
						{hasParticipants ? (
							<div className="flex items-center gap-3">
								<div className="flex -space-x-2">
									{flight.participants.slice(0, 4).map((participant) => (
										<TooltipProvider key={participant.id}>
											<Tooltip>
												<TooltipTrigger asChild>
													<Avatar className="h-8 w-8 border-2 border-background ring-1 ring-border">
														<AvatarImage
															src={participant.user.image || undefined}
														/>
														<AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-accent/10 text-primary font-semibold">
															{participant.user.name
																.split(" ")
																.map((n) => n[0])
																.join("")}
														</AvatarFallback>
													</Avatar>
												</TooltipTrigger>
												<TooltipContent side="top">
													<p className="font-medium">{participant.user.name}</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									))}
									{flight.participants.length > 4 && (
										<div className="h-8 w-8 rounded-full bg-muted border-2 border-background ring-1 ring-border flex items-center justify-center">
											<span className="text-xs font-bold text-muted-foreground">
												+{flight.participants.length - 4}
											</span>
										</div>
									)}
								</div>
								<span className="text-sm text-muted-foreground">
									{flight.participants.length}{" "}
									{flight.participants.length === 1 ? "pessoa" : "pessoas"}
								</span>
							</div>
						) : (
							<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
								<AlertTriangle className="w-4 h-4 text-orange-600" />
								<span className="text-sm font-medium text-orange-700">
									Sem participantes
								</span>
							</div>
						)}
					</div>

					{/* Stats */}
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Users className="w-3 h-3" />
						<span>{flight.participants.length}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function SingleSliceFlightView({
	flight,
	formatDate,
	formatTime,
}: {
	flight: FlightWithSlices;
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
}) {
	const slice = flight.slices[0];
	if (!slice) return null;

	return (
		<div className="py-4">
			{/* Flight route visualization */}
			<div className="flex items-center justify-between">
				{/* Departure */}
				<div className="flex-1 max-w-[140px]">
					<div className="text-center space-y-2">
						<div className="text-2xl font-bold text-foreground tracking-tight">
							{formatTime(flight.departureTime)}
						</div>
						<div className="space-y-1">
							<div className="text-xl font-bold text-primary tracking-wide">
								{slice.originAirport}
							</div>
							<div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
								<Calendar className="w-3 h-3" />
								{formatDate(flight.departureDate)}
							</div>
						</div>
					</div>
				</div>

				{/* Flight path */}
				<div className="flex-1 flex items-center justify-center px-8 py-4">
					<div className="relative flex items-center w-full">
						<div className="flex-1 h-0.5 bg-gradient-to-r from-primary to-accent relative overflow-hidden">
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-background to-transparent animate-pulse" />
						</div>
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
							<Plane className="w-3 h-3 text-primary-foreground rotate-90" />
						</div>
					</div>
				</div>

				{/* Arrival */}
				<div className="flex-1 max-w-[140px]">
					<div className="text-center space-y-2">
						<div className="text-2xl font-bold text-foreground tracking-tight">
							{formatTime(flight.arrivalTime)}
						</div>
						<div className="space-y-1">
							<div className="text-xl font-bold text-accent tracking-wide">
								{slice.destinationAirport}
							</div>
							<div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
								<Calendar className="w-3 h-3" />
								{formatDate(flight.arrivalDate)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Segments details if more than one */}
			{slice.segments.length > 1 && (
				<div className="mt-4 p-3 bg-muted/20 rounded-lg">
					<div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
						{slice.segments.length} Conexões
					</div>
					<div className="space-y-2">
						{slice.segments.map((segment, index) => (
							<div key={segment.id} className="flex items-center gap-2 text-sm">
								<span className="w-4 h-4 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
									{index + 1}
								</span>
								<span>
									{segment.originAirport} → {segment.destinationAirport}
								</span>
								<span className="text-muted-foreground">
									{formatTime(segment.departureTime)} -{" "}
									{formatTime(segment.arrivalTime)}
								</span>
								{segment.marketingFlightNumber && (
									<span className="text-xs bg-muted px-2 py-1 rounded">
										{segment.marketingFlightNumber}
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function MultiSliceFlightView({
	flight,
	formatDate,
	formatTime,
}: {
	flight: FlightWithSlices;
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
}) {
	return (
		<div className="space-y-4">
			<div className="grid gap-3">
				{flight.slices.map((slice, index) => (
					<SliceCard
						key={slice.id}
						slice={slice}
						sliceIndex={index}
						totalSlices={flight.slices.length}
						formatDate={formatDate}
						formatTime={formatTime}
					/>
				))}
			</div>
		</div>
	);
}

function SliceCard({
	slice,
	sliceIndex,
	totalSlices,
	formatDate,
	formatTime,
}: {
	slice: FlightSliceWithSegments;
	sliceIndex: number;
	totalSlices: number;
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
}) {
	const [isExpanded, setIsExpanded] = useState(true); // Default to open
	const hasConnections = slice.segments.length > 1;
	const firstSegment = slice.segments[0];
	const lastSegment = slice.segments[slice.segments.length - 1];

	if (!firstSegment || !lastSegment) return null;

	return (
		<div className="relative">
			<div className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg border border-border/50">
				{/* Slice indicator */}
				<div className="flex flex-col items-center">
					<div className="w-8 h-8 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-bold">
						{sliceIndex + 1}
					</div>
					<span className="text-xs text-muted-foreground mt-1">
						de {totalSlices}
					</span>
				</div>

				{/* Route */}
				<div className="flex-1">
					<div className="flex items-center justify-between">
						{/* Departure */}
						<div className="text-center">
							<div className="text-lg font-bold text-foreground">
								{formatTime(firstSegment.departureTime)}
							</div>
							<div className="text-sm font-bold text-primary">
								{slice.originAirport}
							</div>
							<div className="text-xs text-muted-foreground">
								{formatDate(firstSegment.departureDate)}
							</div>
						</div>

						{/* Arrow and duration */}
						<div className="flex flex-col items-center px-4">
							<div className="flex items-center">
								<div className="h-0.5 w-12 bg-primary/50" />
								<Plane className="w-3 h-3 text-primary mx-2 rotate-90" />
								<div className="h-0.5 w-12 bg-primary/50" />
							</div>
							{slice.durationMinutes && (
								<span className="text-xs text-muted-foreground mt-1">
									{formatDuration(slice.durationMinutes)}
								</span>
							)}
							{hasConnections && (
								<span className="text-xs text-amber-600 mt-1">
									{slice.segments.length - 1} conexão
									{slice.segments.length > 2 ? "ões" : ""}
								</span>
							)}
						</div>

						{/* Arrival */}
						<div className="text-center">
							<div className="text-lg font-bold text-foreground">
								{formatTime(lastSegment.arrivalTime)}
							</div>
							<div className="text-sm font-bold text-accent">
								{slice.destinationAirport}
							</div>
							<div className="text-xs text-muted-foreground">
								{formatDate(lastSegment.arrivalDate)}
							</div>
						</div>
					</div>

					{/* Detailed segments (when expanded and has connections) */}
					{isExpanded && hasConnections && (
						<div className="mt-3 p-3 bg-background/60 rounded border border-border/30">
							<div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
								Segmentos do Trecho
							</div>
							<div className="space-y-2">
								{slice.segments.map((segment, index) => (
									<div
										key={segment.id}
										className="flex items-center gap-2 text-sm"
									>
										<span className="w-4 h-4 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
											{index + 1}
										</span>
										<span>
											{segment.originAirport} → {segment.destinationAirport}
										</span>
										<span className="text-muted-foreground">
											{formatTime(segment.departureTime)} -{" "}
											{formatTime(segment.arrivalTime)}
										</span>
										{segment.marketingFlightNumber && (
											<span className="text-xs bg-muted px-2 py-1 rounded">
												{segment.marketingFlightNumber}
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Toggle button (only for slices with connections) */}
				{hasConnections && (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 rounded-full hover:bg-primary/10"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						{isExpanded ? (
							<ChevronUp className="w-4 h-4" />
						) : (
							<ChevronDown className="w-4 h-4" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
