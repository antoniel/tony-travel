import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { orpc } from "@/orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Calendar,
	DollarSign,
	Edit2,
	Info,
	Plane,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/trip/$travelId/flights")({
	component: FlightsPage,
});

interface FlightParticipant {
	id: string;
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
	};
}

interface FlightWithParticipants {
	id: string;
	flightNumber: string | null;
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

interface DuplicateInfo {
	isDuplicate: boolean;
	existingFlightId: string | null;
	message?: string;
}

function FlightsPage() {
	const { travelId } = Route.useParams();
	const [isAddFlightOpen, setIsAddFlightOpen] = useState(false);

	// Fetch flights grouped by airport
	const flightsQuery = useQuery(
		orpc.getFlightsByTravel.queryOptions({ input: { travelId } }),
	);

	// Mock members data - in real app this would come from travel members API
	const mockMembers = [
		{ id: "user1", name: "João Silva", email: "joao@email.com", image: null },
		{
			id: "user2",
			name: "Maria Santos",
			email: "maria@email.com",
			image: null,
		},
		{ id: "user3", name: "Pedro Costa", email: "pedro@email.com", image: null },
	];

	const isLoading = flightsQuery.isLoading;
	const flightGroups = flightsQuery.data || [];

	// Calculate stats
	const allFlights = flightGroups.flatMap((group) => group.flights);
	const totalFlights = allFlights.length;
	const flightsWithCost = allFlights.filter((f) => f.cost);
	const totalCost = flightsWithCost.reduce(
		(sum, flight) => sum + (flight.cost || 0),
		0,
	);
	const flightsWithoutParticipants = allFlights.filter(
		(f) => f.participants.length === 0,
	);
	const flightsWithoutCost = allFlights.filter((f) => !f.cost);

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
		});
	};

	const formatTime = (time: string) => {
		return time.slice(0, 5); // Remove seconds if present
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
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
				<div className="space-y-3">
					<h1 className="text-3xl font-bold tracking-tight">Voos da Viagem</h1>
					<p className="text-lg text-muted-foreground">
						Gerencie os voos de todos os membros da viagem
					</p>
				</div>
				<Dialog open={isAddFlightOpen} onOpenChange={setIsAddFlightOpen}>
					<DialogTrigger asChild>
						<Button className="flex items-center gap-2">
							<Plus className="w-4 h-4" />
							Adicionar Voo
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Adicionar Novo Voo</DialogTitle>
						</DialogHeader>
						<AddFlightForm
							travelId={travelId}
							members={mockMembers}
							onClose={() => setIsAddFlightOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-primary/10 rounded-lg">
								<Plane className="w-6 h-6 text-primary" />
							</div>
							<div>
								<p className="text-2xl font-bold">{totalFlights}</p>
								<p className="text-sm text-muted-foreground">Total de voos</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-blue-100 rounded-lg">
								<Users className="w-6 h-6 text-blue-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">{flightGroups.length}</p>
								<p className="text-sm text-muted-foreground">
									Aeroportos de origem
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-orange-100 rounded-lg">
								<AlertTriangle className="w-6 h-6 text-orange-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									{flightsWithoutParticipants.length}
								</p>
								<p className="text-sm text-muted-foreground">
									Sem participantes
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-green-50 rounded-lg">
								<DollarSign className="w-6 h-6 text-green-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									R$ {totalCost.toLocaleString("pt-BR")}
								</p>
								<p className="text-sm text-muted-foreground">Total gasto</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Warnings */}
			{(flightsWithoutParticipants.length > 0 ||
				flightsWithoutCost.length > 0) && (
				<div className="space-y-4">
					{flightsWithoutParticipants.length > 0 && (
						<Alert>
							<AlertTriangle className="h-4 w-4" />
							<AlertDescription>
								{flightsWithoutParticipants.length} voo(s) sem participantes.
								Adicione pessoas aos voos para melhor organização.
							</AlertDescription>
						</Alert>
					)}
					{flightsWithoutCost.length > 0 && (
						<Alert
							variant="default"
							className="border-orange-200 bg-orange-50/50"
						>
							<Info className="h-4 w-4 text-orange-600" />
							<AlertDescription className="text-orange-800">
								{flightsWithoutCost.length} voo(s) sem preço informado.
							</AlertDescription>
						</Alert>
					)}
				</div>
			)}

			{/* Flights List Grouped by Airport */}
			<div className="space-y-8">
				{totalFlights === 0 ? (
					<Card className="p-12 text-center">
						<div className="space-y-4">
							<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
								<Plane className="w-8 h-8 text-muted-foreground" />
							</div>
							<div>
								<h3 className="text-lg font-medium">Nenhum voo cadastrado</h3>
								<p className="text-muted-foreground">
									Adicione o primeiro voo da viagem para começar
								</p>
							</div>
							<Button onClick={() => setIsAddFlightOpen(true)} className="mt-4">
								<Plus className="w-4 h-4 mr-2" />
								Adicionar Primeiro Voo
							</Button>
						</div>
					</Card>
				) : (
					flightGroups.map((group) => (
						<div key={group.originAirport} className="space-y-4">
							{/* Airport Group Header */}
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 rounded-lg">
									<Plane className="w-5 h-5 text-blue-600" />
								</div>
								<div>
									<h2 className="text-lg font-semibold">
										Partindo de {group.originAirport}
									</h2>
									<p className="text-sm text-muted-foreground">
										{group.flights.length} voo(s)
									</p>
								</div>
							</div>

							{/* Flights in this group */}
							<div className="space-y-3 pl-10">
								{group.flights.map((flight) => (
									<FlightCard
										key={flight.id}
										flight={flight}
										formatDate={formatDate}
										formatTime={formatTime}
									/>
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}

function FlightCard({
	flight,
	formatDate,
	formatTime,
}: {
	flight: FlightWithParticipants;
	formatDate: (date: Date) => string;
	formatTime: (time: string) => string;
}) {
	const hasParticipants = flight.participants.length > 0;
	const hasCost = flight.cost !== null && flight.cost !== undefined;

	return (
		<Card className="overflow-hidden hover:shadow-md transition-shadow">
			<CardContent className="p-6">
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
					{/* Flight Info */}
					<div className="flex-1 space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
							<div className="space-y-2">
								{/* Participants */}
								<div className="flex items-center gap-3">
									{hasParticipants ? (
										<div className="flex items-center gap-2">
											<div className="flex -space-x-2">
												{flight.participants.slice(0, 3).map((participant) => (
													<TooltipProvider key={participant.id}>
														<Tooltip>
															<TooltipTrigger asChild>
																<Avatar className="h-8 w-8 border-2 border-background">
																	<AvatarImage
																		src={participant.user.image || undefined}
																	/>
																	<AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
																		{participant.user.name
																			.split(" ")
																			.map((n) => n[0])
																			.join("")}
																	</AvatarFallback>
																</Avatar>
															</TooltipTrigger>
															<TooltipContent>
																<p>{participant.user.name}</p>
															</TooltipContent>
														</Tooltip>
													</TooltipProvider>
												))}
												{flight.participants.length > 3 && (
													<div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
														<span className="text-xs font-semibold">
															+{flight.participants.length - 3}
														</span>
													</div>
												)}
											</div>
											<span className="text-sm text-muted-foreground">
												{flight.participants.length} pessoa(s)
											</span>
										</div>
									) : (
										<div className="flex items-center gap-2 text-orange-600">
											<AlertTriangle className="w-4 h-4" />
											<span className="text-sm font-medium">
												Sem participantes
											</span>
										</div>
									)}
								</div>

								{/* Flight Info */}
								<div className="space-y-1">
									{flight.flightNumber && (
										<p className="text-sm text-muted-foreground">
											Voo: {flight.flightNumber}
										</p>
									)}
									{hasCost ? (
										<p className="text-sm font-medium text-green-600">
											R${" "}
											{flight.cost?.toLocaleString("pt-BR", {
												minimumFractionDigits: 2,
											})}
										</p>
									) : (
										<div className="flex items-center gap-1 text-orange-600">
											<Info className="w-3 h-3" />
											<span className="text-xs">Preço não informado</span>
										</div>
									)}
								</div>
							</div>

							{/* Actions */}
							<div className="flex gap-2">
								<Button variant="ghost" size="sm">
									<Edit2 className="w-4 h-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="text-destructive hover:text-destructive"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</div>
						</div>

						{/* Route */}
						<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
							<div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
								{/* Departure */}
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm text-muted-foreground">
											{formatDate(flight.departureDate)}
										</span>
									</div>
									<div className="font-semibold text-lg">
										{formatTime(flight.departureTime)}
									</div>
									<div className="text-sm text-muted-foreground">
										{flight.originAirport}
									</div>
								</div>

								{/* Arrow */}
								<div className="flex justify-center">
									<div className="flex items-center gap-2">
										<div className="h-px bg-border flex-1 min-w-12" />
										<Plane className="w-5 h-5 text-muted-foreground rotate-90" />
										<div className="h-px bg-border flex-1 min-w-12" />
									</div>
								</div>

								{/* Arrival */}
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<Calendar className="w-4 h-4 text-muted-foreground" />
										<span className="text-sm text-muted-foreground">
											{formatDate(flight.arrivalDate)}
										</span>
									</div>
									<div className="font-semibold text-lg">
										{formatTime(flight.arrivalTime)}
									</div>
									<div className="text-sm text-muted-foreground">
										{flight.destinationAirport}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function AddFlightForm({
	travelId,
	members,
	onClose,
}: {
	travelId: string;
	members: Member[];
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		flightNumber: "",
		originAirport: "",
		destinationAirport: "",
		departureDate: "",
		departureTime: "",
		arrivalDate: "",
		arrivalTime: "",
		cost: "",
	});
	const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
		[],
	);
	const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(
		null,
	);

	const createFlightMutation = useMutation(orpc.createFlight.mutationOptions());
	const checkDuplicateMutation = useMutation(
		orpc.checkDuplicateFlight.mutationOptions(),
	);

	const handleParticipantChange = (participantId: string, checked: boolean) => {
		if (checked) {
			setSelectedParticipants((prev) => [...prev, participantId]);
		} else {
			setSelectedParticipants((prev) =>
				prev.filter((id) => id !== participantId),
			);
		}
	};

	const checkForDuplicate = async () => {
		if (formData.originAirport && formData.destinationAirport) {
			try {
				const result = await checkDuplicateMutation.mutateAsync({
					travelId,
					originAirport: formData.originAirport,
					destinationAirport: formData.destinationAirport,
					cost: formData.cost ? Number.parseFloat(formData.cost) : undefined,
				});
				setDuplicateInfo(result);
			} catch (error) {
				console.error("Error checking duplicate:", error);
			}
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const flightData = {
				travelId,
				flight: {
					flightNumber: formData.flightNumber || null,
					originAirport: formData.originAirport,
					destinationAirport: formData.destinationAirport,
					departureDate: new Date(formData.departureDate),
					departureTime: formData.departureTime,
					arrivalDate: new Date(formData.arrivalDate),
					arrivalTime: formData.arrivalTime,
					cost: formData.cost ? Number.parseFloat(formData.cost) : null,
					travelId,
				},
				participantIds: selectedParticipants,
			};

			await createFlightMutation.mutateAsync(flightData);

			// Refresh flights data
			queryClient.invalidateQueries(
				orpc.getFlightsByTravel.queryOptions({ input: { travelId } }),
			);

			onClose();
		} catch (error) {
			console.error("Error creating flight:", error);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Participants Selection */}
			<div className="space-y-3">
				<Label>Participantes</Label>
				<div className="space-y-2">
					{members.map((member) => (
						<div key={member.id} className="flex items-center space-x-3">
							<Checkbox
								id={member.id}
								checked={selectedParticipants.includes(member.id)}
								onCheckedChange={(checked) =>
									handleParticipantChange(member.id, checked as boolean)
								}
							/>
							<div className="flex items-center gap-2">
								<Avatar className="h-6 w-6">
									<AvatarImage src={member.image || undefined} />
									<AvatarFallback className="text-xs">
										{member.name
											.split(" ")
											.map((n) => n[0])
											.join("")}
									</AvatarFallback>
								</Avatar>
								<Label
									htmlFor={member.id}
									className="font-normal cursor-pointer"
								>
									{member.name}
								</Label>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Flight Number */}
			<div className="space-y-2">
				<Label htmlFor="flightNumber">Número do Voo</Label>
				<Input
					id="flightNumber"
					value={formData.flightNumber}
					onChange={(e) =>
						setFormData({
							...formData,
							flightNumber: e.target.value,
						})
					}
					placeholder="Ex: JJ3052 (opcional)"
				/>
			</div>

			{/* Departure */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm">Partida</h4>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="originAirport">Aeroporto *</Label>
						<Input
							id="originAirport"
							value={formData.originAirport}
							onChange={(e) => {
								setFormData({
									...formData,
									originAirport: e.target.value,
								});
								setDuplicateInfo(null);
							}}
							onBlur={checkForDuplicate}
							placeholder="Ex: GRU"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="departureDate">Data *</Label>
						<Input
							id="departureDate"
							type="date"
							value={formData.departureDate}
							onChange={(e) =>
								setFormData({
									...formData,
									departureDate: e.target.value,
								})
							}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="departureTime">Horário *</Label>
						<Input
							id="departureTime"
							type="time"
							value={formData.departureTime}
							onChange={(e) =>
								setFormData({
									...formData,
									departureTime: e.target.value,
								})
							}
							required
						/>
					</div>
				</div>
			</div>

			{/* Arrival */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm">Chegada</h4>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="destinationAirport">Aeroporto *</Label>
						<Input
							id="destinationAirport"
							value={formData.destinationAirport}
							onChange={(e) => {
								setFormData({
									...formData,
									destinationAirport: e.target.value,
								});
								setDuplicateInfo(null);
							}}
							onBlur={checkForDuplicate}
							placeholder="Ex: SDU"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="arrivalDate">Data *</Label>
						<Input
							id="arrivalDate"
							type="date"
							value={formData.arrivalDate}
							onChange={(e) =>
								setFormData({
									...formData,
									arrivalDate: e.target.value,
								})
							}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="arrivalTime">Horário *</Label>
						<Input
							id="arrivalTime"
							type="time"
							value={formData.arrivalTime}
							onChange={(e) =>
								setFormData({
									...formData,
									arrivalTime: e.target.value,
								})
							}
							required
						/>
					</div>
				</div>
			</div>

			{/* Cost */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm">Valor da Passagem</h4>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="cost">Preço (R$)</Label>
						<Input
							id="cost"
							type="number"
							step="0.01"
							value={formData.cost}
							onChange={(e) => {
								setFormData({ ...formData, cost: e.target.value });
								setDuplicateInfo(null);
							}}
							onBlur={checkForDuplicate}
							placeholder="450.00"
						/>
					</div>
				</div>
			</div>

			{/* Duplicate Warning */}
			{duplicateInfo?.isDuplicate && (
				<Alert>
					<Info className="h-4 w-4" />
					<AlertDescription>
						{duplicateInfo.message} Os participantes selecionados serão
						adicionados ao voo existente.
					</AlertDescription>
				</Alert>
			)}

			<div className="flex justify-end gap-4">
				<Button type="button" variant="outline" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="submit" disabled={createFlightMutation.isPending}>
					{createFlightMutation.isPending ? "Adicionando..." : "Adicionar Voo"}
				</Button>
			</div>
		</form>
	);
}
