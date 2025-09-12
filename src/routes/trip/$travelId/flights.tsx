import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
	Plane,
	Plus,
	MapPin,
	Calendar,
	Edit2,
	Trash2,
	DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/trip/$travelId/flights")({
	component: FlightsPage,
});

interface Flight {
	id: string;
	memberId: string;
	memberName: string;
	flightNumber?: string;
	departureAirport: string;
	arrivalAirport: string;
	departureDate: string;
	departureTime: string;
	arrivalDate: string;
	arrivalTime: string;
	cost?: number;
	status: "confirmado" | "pendente" | "cancelado";
}

// Mock data - em produção virá do backend
const mockFlights: Flight[] = [
	{
		id: "1",
		memberId: "user1",
		memberName: "João Silva",
		flightNumber: "JJ3052",
		departureAirport: "GRU",
		arrivalAirport: "SDU",
		departureDate: "2024-03-15",
		departureTime: "08:30",
		arrivalDate: "2024-03-15",
		arrivalTime: "09:45",
		cost: 450.00,
		status: "confirmado",
	},
	{
		id: "2",
		memberId: "user2",
		memberName: "Maria Santos",
		departureAirport: "CGH",
		arrivalAirport: "SDU",
		departureDate: "2024-03-15",
		departureTime: "10:15",
		arrivalDate: "2024-03-15",
		arrivalTime: "11:30",
		cost: 380.00,
		status: "confirmado",
	},
];

function FlightsPage() {
	const [flights, setFlights] = useState<Flight[]>(mockFlights);
	const [isAddFlightOpen, setIsAddFlightOpen] = useState(false);

	const getStatusBadgeVariant = (status: Flight["status"]) => {
		switch (status) {
			case "confirmado":
				return "default";
			case "pendente":
				return "secondary";
			case "cancelado":
				return "destructive";
			default:
				return "secondary";
		}
	};

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
		});
	};

	const totalCost = flights
		.filter(f => f.cost)
		.reduce((sum, flight) => sum + (flight.cost || 0), 0);

	return (
		<div className="space-y-10">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
				<div className="space-y-3">
					<h1 className="text-3xl font-bold tracking-tight">
						Voos da Viagem
					</h1>
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
						<AddFlightForm onClose={() => setIsAddFlightOpen(false)} />
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
								<p className="text-2xl font-bold">
									{flights.length}
								</p>
								<p className="text-sm text-muted-foreground">
									Total de voos
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-green-100 rounded-lg">
								<Badge className="w-6 h-6 text-green-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									{
										flights.filter((f) => f.status === "confirmado")
											.length
									}
								</p>
								<p className="text-sm text-muted-foreground">
									Confirmados
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-orange-100 rounded-lg">
								<Badge className="w-6 h-6 text-orange-600" />
							</div>
							<div>
								<p className="text-2xl font-bold">
									{
										flights.filter((f) => f.status === "pendente")
											.length
									}
								</p>
								<p className="text-sm text-muted-foreground">
									Pendentes
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
									R$ {totalCost.toLocaleString('pt-BR')}
								</p>
								<p className="text-sm text-muted-foreground">
									Total gasto
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Flights List */}
			<div className="space-y-6">
				{flights.length === 0 ? (
					<Card className="p-12 text-center">
						<div className="space-y-4">
							<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
								<Plane className="w-8 h-8 text-muted-foreground" />
							</div>
							<div>
								<h3 className="text-lg font-medium">
									Nenhum voo cadastrado
								</h3>
								<p className="text-muted-foreground">
									Adicione o primeiro voo da viagem para começar
								</p>
							</div>
							<Button
								onClick={() => setIsAddFlightOpen(true)}
								className="mt-4"
							>
								<Plus className="w-4 h-4 mr-2" />
								Adicionar Primeiro Voo
							</Button>
						</div>
					</Card>
				) : (
					<div className="space-y-4">
						{flights.map((flight) => (
							<Card key={flight.id} className="overflow-hidden">
								<CardContent className="p-6">
									<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
										{/* Flight Info */}
										<div className="flex-1 space-y-4">
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
												<div className="space-y-1">
													<div className="flex items-center gap-3">
														<h3 className="text-lg font-semibold">
															{flight.memberName}
														</h3>
														<Badge
															variant={getStatusBadgeVariant(
																flight.status,
															)}
														>
															{flight.status === "confirmado"
																? "Confirmado"
																: flight.status === "pendente"
																  ? "Pendente"
																  : "Cancelado"}
														</Badge>
													</div>
													{flight.flightNumber && (
														<p className="text-sm text-muted-foreground">
															Voo: {flight.flightNumber}
														</p>
													)}
													{flight.cost && (
														<p className="text-sm font-medium text-green-600">
															R$ {flight.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
														</p>
													)}
												</div>
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
															{flight.departureTime}
														</div>
														<div className="text-sm text-muted-foreground">
															{flight.departureAirport}
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
															{flight.arrivalTime}
														</div>
														<div className="text-sm text-muted-foreground">
															{flight.arrivalAirport}
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function AddFlightForm({ onClose }: { onClose: () => void }) {
	const [formData, setFormData] = useState({
		memberId: "",
		flightNumber: "",
		departureAirport: "",
		arrivalAirport: "",
		departureDate: "",
		departureTime: "",
		arrivalDate: "",
		arrivalTime: "",
		cost: "",
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Aqui integraria com a API para criar o voo
		console.log("Flight data:", formData);
		onClose();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="member">Membro *</Label>
					<Select
						value={formData.memberId}
						onValueChange={(value) =>
							setFormData({ ...formData, memberId: value })
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Selecione o membro" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="user1">João Silva</SelectItem>
							<SelectItem value="user2">Maria Santos</SelectItem>
							<SelectItem value="user3">Pedro Costa</SelectItem>
						</SelectContent>
					</Select>
				</div>

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
			</div>

			{/* Departure */}
			<div className="space-y-4">
				<h4 className="font-medium text-sm">Partida</h4>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label htmlFor="departureAirport">Aeroporto *</Label>
						<Input
							id="departureAirport"
							value={formData.departureAirport}
							onChange={(e) =>
								setFormData({
									...formData,
									departureAirport: e.target.value,
								})
							}
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
						<Label htmlFor="arrivalAirport">Aeroporto *</Label>
						<Input
							id="arrivalAirport"
							value={formData.arrivalAirport}
							onChange={(e) =>
								setFormData({
									...formData,
									arrivalAirport: e.target.value,
								})
							}
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
							onChange={(e) =>
								setFormData({ ...formData, cost: e.target.value })
							}
							placeholder="450.00"
						/>
					</div>
				</div>
			</div>

			<div className="flex justify-end gap-4">
				<Button type="button" variant="outline" onClick={onClose}>
					Cancelar
				</Button>
				<Button type="submit">Adicionar Voo</Button>
			</div>
		</form>
	);
}