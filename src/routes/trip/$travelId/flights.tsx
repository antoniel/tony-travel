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

export const Route = createFileRoute("/trip/$travelId/flights")({
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
	cost: number | null;
	travelId: string;
	createdAt: Date;
	updatedAt: Date;
	participants: FlightParticipant[];
}

interface Member {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

interface FlightGroup {
	originAirport: string;
	flights: FlightWithParticipants[];
}

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

	// Fetch flights grouped by airport
	const flightsQuery = useQuery(
		orpc.flightRoutes.getFlightsByTravel.queryOptions({ input: { travelId } }),
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

	const isLoading = flightsQuery.isLoading || membersQuery.isLoading;
	const flightGroups = flightsQuery.data || [];
	const members =
		membersQuery.data?.map((member) => ({
			id: member.user.id,
			name: member.user.name,
			email: member.user.email,
			image: member.user.image,
		})) || [];

	// Calculate stats
	const allFlights = flightGroups.flatMap((group) => group.flights);
	const totalFlights = allFlights.length;
	const flightsWithoutParticipants = allFlights.filter(
		(f) => f.participants.length === 0,
	);
	const flightsWithoutCost = allFlights.filter((f) => !f.cost);

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

	// Handle edit flight
	const handleEditFlight = (flight: FlightWithParticipants) => {
		setEditingFlight(flight);
		setIsEditFlightOpen(true);
	};

	// Handle delete flight
	const handleDeleteFlight = async (flightId: string) => {
		if (confirm("Tem certeza que deseja excluir este voo?")) {
			try {
				await deleteFlightMutation.mutateAsync({ id: flightId });
				// Refresh flights data
				queryClient.invalidateQueries(
					orpc.flightRoutes.getFlightsByTravel.queryOptions({
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

			<FlightsList
				totalFlights={totalFlights}
				flightGroups={flightGroups}
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
						<div className="flex flex-1 flex-col overflow-hidden">
							<AddOrEditFlightForm
								flight={editingFlight}
								travelId={travelId}
								members={members}
								onClose={() => {
									setIsEditFlightOpen(false);
									setEditingFlight(null);
								}}
							/>
						</div>
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

function FlightGroupHeader({
	group,
	isOpen,
	onToggle,
}: { group: FlightGroup; isOpen: boolean; onToggle: () => void }) {
	const totalPassengers = group.flights.reduce(
		(total, flight) => total + flight.participants.length,
		0,
	);

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
							{group.flights.length === 1 ? "voo" : "voos"} • {totalPassengers}{" "}
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

function FlightsList({
	totalFlights,
	flightGroups,
	formatDate,
	formatTime,
	onAddFlight,
	onEditFlight,
	onDeleteFlight,
	canWrite,
}: {
	totalFlights: number;
	flightGroups: FlightGroup[];
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
	onAddFlight: () => void;
	onEditFlight: (flight: FlightWithParticipants) => void;
	onDeleteFlight: (flightId: string) => void;
	canWrite: boolean;
}) {
	// State to track which groups are open (all open by default)
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

	// Initialize openGroups when flightGroups change
	useEffect(() => {
		setOpenGroups((prevOpenGroups) => {
			const initialState = flightGroups.reduce(
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
	}, [flightGroups]);

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
			{flightGroups.map((group) => (
				<Collapsible
					key={group.originAirport}
					open={openGroups[group.originAirport]}
					onOpenChange={(open) =>
						setOpenGroups((prev) => ({ ...prev, [group.originAirport]: open }))
					}
				>
					<div className="space-y-6">
						<FlightGroupHeader
							group={group}
							isOpen={openGroups[group.originAirport]}
							onToggle={() => toggleGroup(group.originAirport)}
						/>

						<CollapsibleContent className="space-y-4 pl-4">
							{group.flights.map((flight) => (
								<FlightCard
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

function FlightCard({
	flight,
	formatDate,
	formatTime,
	onEdit,
	onDelete,
	canWrite,
}: {
	flight: FlightWithParticipants;
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
	onEdit: (flight: FlightWithParticipants) => void;
	onDelete: (flightId: string) => void;
	canWrite: boolean;
}) {
	const hasParticipants = flight.participants.length > 0;
	const hasCost = flight.cost !== null && flight.cost !== undefined;

	return (
		<Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-background via-background to-muted/20">
			{/* Animated background gradient */}
			<div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

			{/* Status indicator bar */}
			<div
				className={`absolute top-0 left-0 right-0 h-1 ${
					!hasParticipants
						? "bg-gradient-to-r from-orange-400 to-orange-600"
						: !hasCost
							? "bg-gradient-to-r from-amber-400 to-amber-600"
							: "bg-gradient-to-r from-emerald-400 via-blue-500 to-purple-600"
				}`}
			/>

			<CardContent className="relative p-0">
				{/* Header with participants and actions */}
				<div className="flex items-center justify-between p-6 pb-4">
					<div className="flex items-center gap-4">
						{hasParticipants ? (
							<div className="flex items-center gap-3">
								<div className="flex -space-x-2">
									{flight.participants.slice(0, 4).map((participant) => (
										<TooltipProvider key={participant.id}>
											<Tooltip>
												<TooltipTrigger asChild>
													<Avatar className="h-9 w-9 border-2 border-background ring-1 ring-border hover:ring-primary transition-all duration-200">
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
										<div className="h-9 w-9 rounded-full bg-gradient-to-br from-muted to-muted/80 border-2 border-background ring-1 ring-border flex items-center justify-center">
											<span className="text-xs font-bold text-muted-foreground">
												+{flight.participants.length - 4}
											</span>
										</div>
									)}
								</div>
								<div className="text-sm text-muted-foreground font-medium">
									{flight.participants.length}{" "}
									{flight.participants.length === 1 ? "pessoa" : "pessoas"}
								</div>
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

					{/* Actions (members only) */}
					{canWrite ? (
						<div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
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
					) : null}
				</div>

				{/* Main flight route */}
				<div className="px-6 pb-6">
					<div className="relative">
						{/* Flight route container */}
						<div className="flex items-center justify-between">
							{/* Departure */}
							<div className="flex-1 max-w-[140px]">
								<div className="text-center space-y-2">
									<div className="text-3xl font-bold text-foreground tracking-tight">
										{formatTime(flight.departureTime)}
									</div>
									<div className="space-y-1">
										<div className="text-2xl font-bold text-primary tracking-wide">
											{flight.originAirport}
										</div>
										<div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
											<Calendar className="w-3 h-3" />
											{formatDate(flight.departureDate)}
										</div>
									</div>
								</div>
							</div>

							{/* Flight path */}
							<div className="flex-1 flex items-center justify-center px-8 py-4">
								<div className="relative flex items-center w-full">
									{/* Animated flight path */}
									<div className="flex-1 h-0.5 bg-gradient-to-r from-primary via-accent to-primary relative overflow-hidden">
										<div className="absolute inset-0 bg-gradient-to-r from-transparent via-background to-transparent animate-pulse" />
									</div>

									{/* Plane icon */}
									<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
										<Plane className="w-4 h-4 text-primary-foreground rotate-90" />
									</div>
								</div>
							</div>

							{/* Arrival */}
							<div className="flex-1 max-w-[140px]">
								<div className="text-center space-y-2">
									<div className="text-3xl font-bold text-foreground tracking-tight">
										{formatTime(flight.arrivalTime)}
									</div>
									<div className="space-y-1">
										<div className="text-2xl font-bold text-accent tracking-wide">
											{flight.destinationAirport}
										</div>
										<div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
											<Calendar className="w-3 h-3" />
											{formatDate(flight.arrivalDate)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Cost and additional info */}
					<div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
						<div className="flex items-center gap-4">
							{hasCost ? (
								<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
									<DollarSign className="w-4 h-4 text-emerald-600" />
									<span className="text-sm font-bold text-emerald-700">
										R${" "}
										{flight.cost?.toLocaleString("pt-BR", {
											minimumFractionDigits: 2,
										})}
									</span>
								</div>
							) : (
								<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
									<Info className="w-4 h-4 text-amber-600" />
									<span className="text-sm font-medium text-amber-700">
										Preço não informado
									</span>
								</div>
							)}
						</div>

						{/* Quick stats */}
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Users className="w-3 h-3" />
							<span>{flight.participants.length}</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
