import { Action, Actions } from "@/components/ai-elements/actions";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
	Source,
	Sources,
	SourcesContent,
	SourcesTrigger,
} from "@/components/ai-elements/sources";
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
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrencyBRL } from "@/lib/currency";
import { orpc } from "@/orpc/client";
import type {
	MyConciergeTools,
	MyUIMessage,
} from "@/orpc/modules/concierge/concierge.ai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import {
	CheckIcon,
	CopyIcon,
	RefreshCcwIcon,
	Trash2,
	XIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AccommodationPayload = {
	name: string;
	type: "hotel" | "hostel" | "airbnb" | "resort" | "other";
	address: string;
	startDate: Date;
	endDate: Date;
	price: number;
};

type AccommodationUpdatePayload = Partial<AccommodationPayload>;

interface MessagesProps {
	messages: MyUIMessage[];
	status: "submitted" | "streaming" | "idle" | "error" | "ready";
	travelId: string;
	addToolResult: AddToolResultType;
}
export type AddToolResultType = <
	T extends keyof InferUITools<MyConciergeTools>,
>(args: {
	tool: T;
	toolCallId: string;
	output: InferUITools<MyConciergeTools>[T]["output"];
}) => Promise<void>;

export function Messages({
	messages,
	status,
	travelId,
	addToolResult,
}: MessagesProps) {
	return (
		<>
			{messages.map((message) => (
				<div key={message.id}>
					{/* Sources rendering */}
					{message.role === "assistant" &&
						message.parts.filter((part) => part.type === "source-url").length >
							0 && (
							<Sources>
								<SourcesTrigger
									count={
										message.parts.filter((part) => part.type === "source-url")
											.length
									}
								/>
								{message.parts
									.filter((part) => part.type === "source-url")
									.map((part, i) => (
										<SourcesContent key={`${message.id}-${i}`}>
											<Source
												key={`${message.id}-${i}`}
												href={part.url}
												title={part.url}
											/>
										</SourcesContent>
									))}
							</Sources>
						)}

					{/* Message parts rendering */}
					{message.parts.map((part, i) => {
						switch (part.type) {
							case "text":
								return (
									<React.Fragment key={`${message.id}-${i}`}>
										<Message from={message.role}>
											<MessageContent>
												<Response>{part.text}</Response>
											</MessageContent>
										</Message>
										{message.role === "assistant" &&
											i === messages.length - 1 && (
												<Actions className="mt-2">
													<Action onClick={() => {}} label="Retry">
														<RefreshCcwIcon className="size-3" />
													</Action>
													<Action
														onClick={() =>
															navigator.clipboard.writeText(part.text)
														}
														label="Copy"
													>
														<CopyIcon className="size-3" />
													</Action>
												</Actions>
											)}
									</React.Fragment>
								);

							case "reasoning":
								return (
									<Reasoning
										key={`${message.id}-${i}`}
										className="w-full"
										isStreaming={
											status === "streaming" &&
											i === message.parts.length - 1 &&
											message.id === messages.at(-1)?.id
										}
									>
										<ReasoningTrigger />
										<ReasoningContent>{part.text}</ReasoningContent>
									</Reasoning>
								);

							case "tool-requestToCreateEvent":
								if (part.state === "input-available") {
									const eventData = part.input;
									return (
										<EventConfirmationCard
											key={`${message.id}-${i}`}
											eventData={eventData}
											travelId={travelId}
											addToolResult={addToolResult}
											toolCallId={part.toolCallId}
										/>
									);
								}
								return null;

							case "tool-requestToCreateAccommodation":
								if (part.state === "input-available") {
									const accommodationData = part.input;
									return (
										<AccommodationCreateRequestCard
											key={`${message.id}-${i}`}
											input={accommodationData}
											travelId={travelId}
											toolCallId={part.toolCallId}
											addToolResult={addToolResult}
										/>
									);
								}
								return null;

							case "tool-requestToUpdateAccommodation":
								if (part.state === "input-available") {
									const updateData = part.input;
									return (
										<AccommodationUpdateRequestCard
											key={`${message.id}-${i}`}
											input={updateData}
											travelId={travelId}
											toolCallId={part.toolCallId}
											addToolResult={addToolResult}
										/>
									);
								}
								return null;

							case "tool-requestToDeleteAccommodation":
								if (part.state === "input-available") {
									const deleteData = part.input;
									return (
										<AccommodationDeleteRequestCard
											key={`${message.id}-${i}`}
											input={deleteData}
											travelId={travelId}
											toolCallId={part.toolCallId}
											addToolResult={addToolResult}
										/>
									);
								}
								return null;

							case "tool-listEvents":
								if (part.state === "input-available") {
									return (
										<div
											key={`${message.id}-${i}`}
											className="flex items-center gap-2 py-1 px-2 rounded bg-muted/5 border-0"
										>
											<div className="animate-spin rounded-full h-2 w-2 border border-muted-foreground/30 border-t-transparent" />
											<span className="text-xs text-muted-foreground/60">
												Buscando eventos da viagem...
											</span>
										</div>
									);
								}

								if (part.state === "output-available") {
									const eventsData = part.output;

									return (
										<EventsListDisplay
											key={`${message.id}-${i}`}
											eventsData={eventsData}
											travelId={travelId}
										/>
									);
								}

								return null;

							case "tool-getTravelParticipants":
								if (part.state === "input-available") {
									return (
										<div
											key={`${message.id}-${i}`}
											className="flex items-center gap-2 py-1 px-2 rounded bg-muted/5 border-0"
										>
											<div className="animate-spin rounded-full h-2 w-2 border border-muted-foreground/30 border-t-transparent" />
											<span className="text-xs text-muted-foreground/60">
												Buscando participantes da viagem...
											</span>
										</div>
									);
								}
								if (part.state === "output-available") {
									const data = part.output as {
										success: boolean;
										participants: Array<{
											id: string;
											name: string;
											role: string;
										}>;
										count: number;
										message: string;
									};
									return (
										<div
											key={`${message.id}-${i}`}
											className="p-4 border rounded-lg bg-muted/5 border-border"
										>
											<p className="text-sm text-muted-foreground">
												✅ {data.message}
											</p>
										</div>
									);
								}
								return null;

							case "tool-getAccomodations":
								if (part.state === "input-available") {
									return (
										<div
											key={`${message.id}-${i}`}
											className="flex items-center gap-2 py-1 px-2 rounded bg-muted/5 border-0"
										>
											<div className="animate-spin rounded-full h-2 w-2 border border-muted-foreground/30 border-t-transparent" />
											<span className="text-xs text-muted-foreground/60">
												Buscando acomodações disponíveis...
											</span>
										</div>
									);
								}
								if (part.state === "output-available") {
									const data = part.output;

									return (
										<AccommodationsListDisplay
											key={`${message.id}-${i}`}
											report={data}
										/>
									);
								}
								return null;

							default:
								return null;
						}
					})}
				</div>
			))}
		</>
	);
}

interface EventConfirmationCardProps {
	eventData: InferUITools<MyConciergeTools>["requestToCreateEvent"]["input"];
	travelId: string;
	addToolResult: AddToolResultType;
	toolCallId: string;
}

function EventConfirmationCard({
	eventData,
	travelId,
	addToolResult,
	toolCallId,
}: EventConfirmationCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);

	const createEventMutation = useMutation({
		...orpc.eventRoutes.createEvent.mutationOptions(),
		onSuccess: (result) => {
			toast.success("Evento criado com sucesso!");
			queryClient.invalidateQueries({
				queryKey: orpc.eventRoutes.getEventsByTravel.queryKey({
					input: { travelId },
				}),
			});
			addToolResult({
				tool: "requestToCreateEvent",
				toolCallId,
				output: {
					success: true,
					events: [{ eventId: result.eventId ?? "" }],
				},
			});
			setIsProcessed(true);
		},
		onError: (error) => {
			toast.error("Erro ao criar evento");
			console.error("Event creation error:", error);
			addToolResult({
				tool: "getAccomodations",
				toolCallId,
				output: {
					success: false,
					accommodations: [],
					count: 0,
					message: "Viagem não encontrada",
				},
			});
			setIsProcessed(true);
		},
	});

	const handleAccept = () => {
		if (isProcessed) return;

		createEventMutation.mutate({
			travelId,
			title: eventData.title,
			startDate: new Date(eventData.startDate),
			endDate: new Date(eventData.endDate),
			type: eventData.type,
			location: eventData.location,
			estimatedCost: eventData.estimatedCost,
			description: eventData.description,
			link: eventData.link,
		});
	};

	const handleReject = () => {
		if (isProcessed) return;

		toast.info("Sugestão de evento rejeitada");
		addToolResult({
			tool: "requestToCreateEvent",
			toolCallId,
			output: {
				success: false,
				events: [],
			},
		});
		setIsProcessed(true);
	};

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

	const getEventTypeLabel = (type: string) => {
		const labels = {
			travel: "Transporte",
			food: "Alimentação",
			activity: "Atividade",
		};
		return labels[type as keyof typeof labels] || type;
	};

	const getEventTypeVariant = (
		type: string,
	): "default" | "secondary" | "outline" | "destructive" => {
		const variants: Record<
			string,
			"default" | "secondary" | "outline" | "destructive"
		> = {
			travel: "default",
			food: "secondary",
			activity: "outline",
		};
		return variants[type] || "default";
	};

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">{eventData.title}</CardTitle>
					<Badge variant={getEventTypeVariant(eventData.type)}>
						{getEventTypeLabel(eventData.type)}
					</Badge>
				</div>
				<CardDescription>
					O assistente sugere criar este evento na sua viagem
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-1 gap-2 text-sm">
					<div>
						<span className="font-medium text-muted-foreground">Início:</span>{" "}
						{formatDate(eventData.startDate)}
					</div>
					<div>
						<span className="font-medium text-muted-foreground">Fim:</span>{" "}
						{formatDate(eventData.endDate)}
					</div>
					{eventData.location && (
						<div>
							<span className="font-medium text-muted-foreground">Local:</span>{" "}
							{eventData.location}
						</div>
					)}
					{eventData.estimatedCost && (
						<div>
							<span className="font-medium text-muted-foreground">
								Custo estimado:
							</span>{" "}
							{formatCurrencyBRL(eventData.estimatedCost)}
						</div>
					)}
					{eventData.description && (
						<div>
							<span className="font-medium text-muted-foreground">
								Descrição:
							</span>{" "}
							{eventData.description}
						</div>
					)}
					{eventData.link && (
						<div>
							<span className="font-medium text-muted-foreground">Link:</span>{" "}
							<a
								href={eventData.link}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
							>
								{eventData.link.length > 40
									? `${eventData.link.substring(0, 40)}...`
									: eventData.link}
							</a>
						</div>
					)}
				</div>
			</CardContent>
			<CardFooter className="flex gap-2">
				{!isProcessed ? (
					<>
						<Button
							onClick={handleAccept}
							disabled={createEventMutation.isPending}
							className="flex-1"
						>
							<CheckIcon className="w-4 h-4 mr-2" />
							{createEventMutation.isPending ? "Criando..." : "Aceitar"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={createEventMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Recusar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{createEventMutation.isSuccess
							? "✅ Evento criado"
							: "❌ Rejeitado"}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

interface EventsListDisplayProps {
	eventsData: InferUITools<MyConciergeTools>["listEvents"]["output"];
	travelId: string;
}

function EventsListDisplay({ eventsData, travelId }: EventsListDisplayProps) {
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

	const getEventTypeLabel = (type: string) => {
		const labels = {
			travel: "Transporte",
			food: "Alimentação",
			activity: "Atividade",
		};
		return labels[type as keyof typeof labels] || type;
	};

	const getEventTypeVariant = (
		type: string,
	): "default" | "secondary" | "outline" | "destructive" => {
		const variants: Record<
			string,
			"default" | "secondary" | "outline" | "destructive"
		> = {
			travel: "default",
			food: "secondary",
			activity: "outline",
		};
		return variants[type] || "default";
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

interface AccommodationCreateRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToCreateAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

function AccommodationCreateRequestCard({
	input,
	travelId,
	toolCallId,
	addToolResult,
}: AccommodationCreateRequestCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);
	const createAccommodationMutation = useMutation(
		orpc.accommodationRoutes.createAccommodation.mutationOptions({
			onSuccess: async (result) => {
				if (result.validationError) {
					toast.error(result.validationError);
					await addToolResult({
						tool: "requestToCreateAccommodation",
						toolCallId,
						output: {
							success: false,
							message: result.validationError,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.conflictingAccommodation) {
					toast.error(
						`Existe conflito com a acomodação "${result.conflictingAccommodation.name}"`,
					);
					await addToolResult({
						tool: "requestToCreateAccommodation",
						toolCallId,
						output: {
							success: false,
							message: `Conflito com a acomodação "${result.conflictingAccommodation.name}"`,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.id) {
					toast.success("Acomodação criada com sucesso!");
					await queryClient.invalidateQueries({
						queryKey:
							orpc.accommodationRoutes.getAccommodationsByTravel.queryKey({
								input: { travelId },
							}),
					});
					await addToolResult({
						tool: "requestToCreateAccommodation",
						toolCallId,
						output: {
							success: true,
							accommodation: { accommodationId: result.id },
							message: "Acomodação criada pelo usuário",
						},
					});
				}

				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error("Erro ao criar acomodação");
				console.error("Accommodation creation error:", error);
				await addToolResult({
					tool: "requestToCreateAccommodation",
					toolCallId,
					output: {
						success: false,
						message: "Falha ao criar acomodação",
					},
				});
				setIsProcessed(true);
			},
		}),
	);

	const handleAccept = () => {
		if (isProcessed) return;

		const payload: AccommodationPayload = {
			name: input.name,
			type: input.type,
			address: input.address,
			startDate: new Date(input.startDate),
			endDate: new Date(input.endDate),
			price: input.price,
		};

		createAccommodationMutation.mutate({
			travelId,
			accommodation: payload,
		});
	};

	const handleReject = () => {
		if (isProcessed) return;

		toast.info("Solicitação de acomodação rejeitada");
		void addToolResult({
			tool: "requestToCreateAccommodation",
			toolCallId,
			output: {
				success: false,
				message: "Usuário rejeitou a criação da acomodação",
			},
		});
		setIsProcessed(true);
	};

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle className="text-lg">{input.name}</CardTitle>
					<Badge>{getAccommodationTypeLabel(input.type)}</Badge>
				</div>
				<CardDescription>
					O assistente sugere adicionar esta acomodação à viagem
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<AccommodationInfoRow label="Período">
					{formatDateRange(input.startDate, input.endDate)}
				</AccommodationInfoRow>
				<AccommodationInfoRow label="Endereço">
					{input.address}
				</AccommodationInfoRow>
				<AccommodationInfoRow label="Valor estimado">
					{formatCurrencyBRL(input.price)}
				</AccommodationInfoRow>
			</CardContent>
			<CardFooter className="flex gap-2">
				{!isProcessed ? (
					<>
						<Button
							onClick={handleAccept}
							disabled={createAccommodationMutation.isPending}
							className="flex-1"
						>
							<CheckIcon className="w-4 h-4 mr-2" />
							{createAccommodationMutation.isPending ? "Criando..." : "Aceitar"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={createAccommodationMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Recusar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{createAccommodationMutation.isSuccess
							? "✅ Acomodação criada"
							: "❌ Rejeitada ou cancelada"}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

interface AccommodationUpdateRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToUpdateAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

function AccommodationUpdateRequestCard({
	input,
	travelId,
	toolCallId,
	addToolResult,
}: AccommodationUpdateRequestCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);
	const updateAccommodationMutation = useMutation(
		orpc.accommodationRoutes.updateAccommodation.mutationOptions({
			onSuccess: async (result, variables) => {
				if (result.validationError) {
					toast.error(result.validationError);
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: false,
							validationError: result.validationError,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.conflictingAccommodation) {
					toast.error(
						`Existe conflito com a acomodação "${result.conflictingAccommodation.name}"`,
					);
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: false,
							validationError: `Conflito com a acomodação "${result.conflictingAccommodation.name}"`,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.success) {
					toast.success("Acomodação atualizada com sucesso!");
					await queryClient.invalidateQueries({
						queryKey:
							orpc.accommodationRoutes.getAccommodationsByTravel.queryKey({
								input: { travelId },
							}),
					});
					const updatedFields = Object.keys(variables.accommodation ?? {});
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: true,
							accommodation: {
								accommodationId: input.accommodationId,
								updatedFields,
							},
						},
					});
				}

				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error("Erro ao atualizar acomodação");
				console.error("Accommodation update error:", error);
				await addToolResult({
					tool: "requestToUpdateAccommodation",
					toolCallId,
					output: {
						success: false,
						validationError: "Falha ao atualizar acomodação",
					},
				});
				setIsProcessed(true);
			},
		}),
	);

	const normalizedUpdates = React.useMemo<AccommodationUpdatePayload>(() => {
		const updates: AccommodationUpdatePayload = {};
		if (input.updates.name) updates.name = input.updates.name;
		if (input.updates.type) updates.type = input.updates.type;
		if (input.updates.address) updates.address = input.updates.address;
		if (input.updates.startDate)
			updates.startDate = new Date(input.updates.startDate);
		if (input.updates.endDate)
			updates.endDate = new Date(input.updates.endDate);
		if (input.updates.price !== undefined) updates.price = input.updates.price;
		return updates;
	}, [input.updates]);

	const proposedEntries = React.useMemo(
		() =>
			Object.entries(normalizedUpdates) as Array<
				[
					keyof AccommodationUpdatePayload,
					AccommodationUpdatePayload[keyof AccommodationUpdatePayload],
				]
			>,
		[normalizedUpdates],
	);

	const handleAccept = () => {
		if (isProcessed || proposedEntries.length === 0) {
			if (proposedEntries.length === 0) {
				toast.info("Nenhuma alteração foi proposta para aplicar");
			}
			return;
		}

		updateAccommodationMutation.mutate({
			id: input.accommodationId,
			accommodation: normalizedUpdates,
		});
	};

	const handleReject = () => {
		if (isProcessed) return;

		toast.info("Solicitação de atualização rejeitada");
		void addToolResult({
			tool: "requestToUpdateAccommodation",
			toolCallId,
			output: {
				success: false,
				validationError: "Usuário rejeitou a atualização",
			},
		});
		setIsProcessed(true);
	};

	const pending = updateAccommodationMutation.isPending;

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle className="text-lg">
						Atualizar acomodação {input.accommodationId}
					</CardTitle>
					<Badge variant="outline">Atualização</Badge>
				</div>
				<CardDescription>
					Revise e confirme as alterações sugeridas antes de aplicar
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				{proposedEntries.length === 0 ? (
					<p className="text-muted-foreground">
						Nenhuma alteração foi proposta para esta acomodação.
					</p>
				) : (
					<ul className="space-y-2">
						{proposedEntries.map(([fieldKey, value]) => (
							<li
								key={fieldKey as string}
								className="rounded border bg-muted/10 p-2"
							>
								<span className="font-medium text-muted-foreground">
									{getAccommodationFieldLabel(fieldKey as string)}:
								</span>{" "}
								{renderAccommodationFieldValue(fieldKey, value)}
							</li>
						))}
					</ul>
				)}
			</CardContent>
			<CardFooter className="flex gap-2">
				{!isProcessed ? (
					<>
						<Button
							onClick={handleAccept}
							disabled={pending || proposedEntries.length === 0}
							className="flex-1"
						>
							<CheckIcon className="w-4 h-4 mr-2" />
							{pending ? "Aplicando..." : "Aplicar alterações"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={pending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Recusar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{updateAccommodationMutation.isSuccess
							? "✅ Alterações aplicadas"
							: "❌ Rejeitada ou cancelada"}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

interface AccommodationDeleteRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToDeleteAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

function AccommodationDeleteRequestCard({
	input,
	travelId,
	toolCallId,
	addToolResult,
}: AccommodationDeleteRequestCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);
	const deleteAccommodationMutation = useMutation(
		orpc.accommodationRoutes.deleteAccommodation.mutationOptions({
			onSuccess: async () => {
				toast.success("Acomodação removida com sucesso!");
				await queryClient.invalidateQueries({
					queryKey: orpc.accommodationRoutes.getAccommodationsByTravel.queryKey(
						{
							input: { travelId },
						},
					),
				});
				await addToolResult({
					tool: "requestToDeleteAccommodation",
					toolCallId,
					output: {
						success: true,
						message: "Acomodação excluída pelo usuário",
					},
				});
				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error("Erro ao excluir acomodação");
				console.error("Accommodation delete error:", error);
				await addToolResult({
					tool: "requestToDeleteAccommodation",
					toolCallId,
					output: {
						success: false,
						message: "Falha ao excluir acomodação",
					},
				});
				setIsProcessed(true);
			},
		}),
	);

	const handleAccept = () => {
		if (isProcessed) return;

		if (!input.confirm) {
			toast.error(
				"Confirmação ausente. Peça ao assistente para confirmar a remoção antes de prosseguir.",
			);
			return;
		}

		deleteAccommodationMutation.mutate({ id: input.accommodationId });
	};

	const handleReject = () => {
		if (isProcessed) return;

		toast.info("Solicitação de exclusão rejeitada");
		void addToolResult({
			tool: "requestToDeleteAccommodation",
			toolCallId,
			output: {
				success: false,
				message: "Usuário rejeitou a exclusão",
			},
		});
		setIsProcessed(true);
	};

	return (
		<Card className="w-full max-w-md mx-auto my-4 border-destructive/40 bg-destructive/5">
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle className="text-lg flex items-center gap-2">
						<Trash2 className="w-4 h-4 text-destructive" />
						Remover acomodação {input.accommodationId}
					</CardTitle>
					<Badge variant="destructive">Remoção</Badge>
				</div>
				<CardDescription>
					Confirme se deseja excluir esta acomodação permanentemente
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				{input.reason && (
					<AccommodationInfoRow label="Motivo informado">
						{input.reason}
					</AccommodationInfoRow>
				)}
				<AccommodationInfoRow label="Confirmado pelo assistente">
					{input.confirm ? "Sim" : "Não"}
				</AccommodationInfoRow>
			</CardContent>
			<CardFooter className="flex gap-2">
				{!isProcessed ? (
					<>
						<Button
							variant="destructive"
							onClick={handleAccept}
							disabled={deleteAccommodationMutation.isPending}
							className="flex-1"
						>
							<Trash2 className="w-4 h-4 mr-2" />
							{deleteAccommodationMutation.isPending
								? "Excluindo..."
								: "Excluir"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={deleteAccommodationMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Cancelar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{deleteAccommodationMutation.isSuccess
							? "✅ Acomodação excluída"
							: "❌ Rejeitada ou cancelada"}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

interface AccommodationsListDisplayProps {
	report: InferUITools<MyConciergeTools>["getAccomodations"]["output"];
}

function AccommodationsListDisplay({ report }: AccommodationsListDisplayProps) {
	if (!report.success) {
		return (
			<Card className="w-full max-w-md mx-auto my-4">
				<CardContent>
					<p className="text-sm text-destructive">
						{report.message ?? "Erro ao buscar acomodações"}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (report.count === 0) {
		return (
			<Card className="w-full max-w-md mx-auto my-4">
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Nenhuma acomodação cadastrada para esta viagem ainda.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<CardTitle className="text-lg">Acomodações encontradas</CardTitle>
				<CardDescription>{report.message}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				{report.accommodations.map((acc) => (
					<div
						key={acc.id}
						className="rounded-lg border border-border/60 bg-muted/5 p-3"
					>
						<div className="flex items-center justify-between gap-4">
							<span className="font-medium">{acc.name}</span>
							<Badge variant="secondary">
								{getAccommodationTypeLabel(acc.type)}
							</Badge>
						</div>
						<div className="mt-2 grid gap-1">
							<span className="text-muted-foreground">
								Período: {formatDateRange(acc.checkIn, acc.checkOut)}
							</span>
							<span className="text-muted-foreground">
								Endereço: {acc.address}
							</span>
							<span className="text-muted-foreground">
								Preço estimado: {formatCurrencyBRL(acc.price)}
							</span>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}

function AccommodationInfoRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col">
			<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<span>{children}</span>
		</div>
	);
}

function getAccommodationTypeLabel(type: string) {
	const labels: Record<string, string> = {
		hotel: "Hotel",
		hostel: "Hostel",
		airbnb: "Airbnb",
		resort: "Resort",
		other: "Outro",
	};
	return labels[type] ?? type;
}

function formatDateRange(startISO: string, endISO: string) {
	const start = new Date(startISO);
	const end = new Date(endISO);
	return `${formatDate(start)} até ${formatDate(end)}`;
}

function formatDate(date: Date) {
	return date.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function renderAccommodationFieldValue(
	_fieldKey: keyof AccommodationUpdatePayload,
	value: AccommodationUpdatePayload[keyof AccommodationUpdatePayload],
) {
	if (value === undefined) {
		return "-";
	}

	if (value instanceof Date) {
		return formatDate(value);
	}

	if (typeof value === "number") {
		return formatCurrencyBRL(value);
	}

	return String(value);
}

function getAccommodationFieldLabel(fieldKey: string) {
	const labels: Record<string, string> = {
		name: "Nome",
		type: "Tipo",
		address: "Endereço",
		startDate: "Check-in",
		endDate: "Check-out",
		price: "Preço",
	};
	return labels[fieldKey] ?? fieldKey;
}
