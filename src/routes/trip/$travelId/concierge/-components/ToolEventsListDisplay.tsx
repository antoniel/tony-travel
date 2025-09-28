import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrencyBRL } from "@/lib/currency";
import { orpc } from "@/orpc/client";
import type { MyConciergeTools } from "@/orpc/modules/concierge/concierge.ai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import {
	Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ToolEventsListDisplayProps {
	eventsData: InferUITools<MyConciergeTools>["listEvents"]["output"];
	travelId: string;
}

const formatDate = (dateStr: string) => {
	const date = new Date(dateStr);
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const eventTypeLabels: Record<string, string> = {
	travel: "Transporte",
	food: "Alimentação",
	activity: "Atividade",
};

const eventTypeVariants: Record<
	string,
	"default" | "secondary" | "outline" | "destructive"
> = {
	travel: "default",
	food: "secondary",
	activity: "outline",
};

const getEventTypeLabel = (type: string) => eventTypeLabels[type] ?? type;

const getEventTypeVariant = (
	type: string,
): "default" | "secondary" | "outline" | "destructive" =>
	eventTypeVariants[type] ?? "default";

export function ToolEventsListDisplay({ eventsData, travelId }: ToolEventsListDisplayProps) {
	const queryClient = useQueryClient();
	const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
	const [deleteDialogState, setDeleteDialogState] = useState<{
		open: boolean;
		ids: string[];
	}>({ open: false, ids: [] });
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteEventMutation = useMutation({
		...orpc.eventRoutes.deleteEvent.mutationOptions(),
		onError: (error) => {
			toast.error(error.message ?? "Erro ao remover evento");
		},
	});

	const eventMap = useMemo(() => {
		return new Map(
			eventsData.success
				? eventsData.events.map((event) => [event.id, event])
				: [],
		);
	}, [eventsData]);

	useEffect(() => {
		setSelectedEventIds((prev) => prev.filter((id) => eventMap.has(id)));
	}, [eventMap]);

	const toggleSelectAll = (checked: boolean) => {
		if (!eventsData.success) return;
		setSelectedEventIds(
			checked ? eventsData.events.map((event) => event.id) : [],
		);
	};

	const toggleSelection = (eventId: string, checked: boolean) => {
		setSelectedEventIds((prev) =>
			checked ? [...prev, eventId] : prev.filter((id) => id !== eventId),
		);
	};

	const deleteEvents = async (ids: string[]) => {
		if (ids.length === 0) return;
		setIsDeleting(true);
		try {
			await Promise.all(
				ids.map((id) => deleteEventMutation.mutateAsync({ id, travelId })),
			);
			setSelectedEventIds((prev) => prev.filter((id) => !ids.includes(id)));
			await queryClient.invalidateQueries({
				queryKey: orpc.eventRoutes.getEventsByTravel.queryKey({
					input: { travelId },
				}),
			});
			toast.success(
				ids.length === 1
					? "Evento removido com sucesso"
					: `${ids.length} eventos removidos com sucesso`,
			);
		} catch (error) {
			toast.error("Não foi possível remover todos os eventos selecionados");
			console.error("Failed to delete events:", error);
		} finally {
			setIsDeleting(false);
			setDeleteDialogState({ open: false, ids: [] });
		}
	};

	const openDeleteDialog = (ids: string[]) => {
		setDeleteDialogState({ open: true, ids });
	};

	const handleDialogChange = (open: boolean) => {
		if (!open && !isDeleting) {
			setDeleteDialogState({ open: false, ids: [] });
		}
	};

	if (!eventsData.success) {
		return (
			<Card className="w-full max-w-2xl mx-auto my-4">
				<CardContent className="p-4">
					<p className="text-destructive">
						Erro ao buscar eventos: {eventsData.message || "Erro desconhecido"}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (eventsData.count === 0) {
		return (
			<Card className="w-full max-w-2xl mx-auto my-4">
				<CardContent className="p-4 text-center">
					<p className="text-muted-foreground">
						Nenhum evento encontrado para esta viagem.
					</p>
				</CardContent>
			</Card>
		);
	}

	const allSelected =
		eventsData.events.length > 0 &&
		selectedEventIds.length === eventsData.events.length;
	const hasSelection = selectedEventIds.length > 0;

	return (
		<Card className="w-full max-w-2xl mx-auto my-4">
			<CardHeader>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle>Eventos da Viagem</CardTitle>
						<CardDescription>
							{eventsData.message} ({eventsData.count} evento
							{eventsData.count !== 1 ? "s" : ""})
						</CardDescription>
					</div>
					<div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
						<div className="flex items-center gap-2">
							<Checkbox
								checked={allSelected}
								onCheckedChange={(checked) => {
									toggleSelectAll(Boolean(checked));
								}}
								aria-label={
									allSelected
										? "Desmarcar todos os eventos"
										: "Selecionar todos os eventos"
								}
							/>
							<span className="text-sm text-muted-foreground">
								Selecionar todos
							</span>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => openDeleteDialog(selectedEventIds)}
							disabled={!hasSelection}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Remover selecionados
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{eventsData.events.map((event) => (
					<div
						key={event.id}
						className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
					>
						<div className="flex flex-1 flex-col gap-2">
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-2">
									<Checkbox
										checked={selectedEventIds.includes(event.id)}
										onCheckedChange={(checked) =>
											toggleSelection(event.id, Boolean(checked))
										}
										aria-label={`Selecionar o evento ${event.title}`}
									/>
									<h4 className="font-medium">{event.title}</h4>
								</div>
								<Badge variant={getEventTypeVariant(event.type)}>
									{getEventTypeLabel(event.type)}
								</Badge>
							</div>
							<div className="text-sm text-muted-foreground">
								<p>📅 {formatDate(event.startDate)}</p>
								{event.location && <p>📍 {event.location}</p>}
								{event.description && <p>💬 {event.description}</p>}
								{event.estimatedCost && (
									<p>💰 {formatCurrencyBRL(event.estimatedCost)}</p>
								)}
								{event.link && (
									<p>
										🔗{" "}
										<a
											href={event.link}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
										>
											{event.link.length > 40
												? `${event.link.substring(0, 40)}...`
												: event.link}
										</a>
									</p>
								)}
							</div>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="self-start text-destructive hover:text-destructive"
							onClick={() => openDeleteDialog([event.id])}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Remover
						</Button>
					</div>
				))}
			</CardContent>
			<AlertDialog
				open={deleteDialogState.open}
				onOpenChange={handleDialogChange}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteDialogState.ids.length === 1
								? `Você tem certeza que deseja remover o evento "${
										eventMap.get(deleteDialogState.ids[0])?.title ??
										deleteDialogState.ids[0]
									}"?`
								: `Você tem certeza que deseja remover ${deleteDialogState.ids.length} eventos selecionados?`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							Cancelar
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteEvents(deleteDialogState.ids)}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "Removendo..." : "Remover"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
}
