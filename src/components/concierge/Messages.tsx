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
import { formatCurrencyBRL } from "@/lib/currency";
import { orpc } from "@/orpc/client";
import type {
	MyConciergeTools,
	MyUIMessage,
} from "@/orpc/modules/concierge/concierge.ai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import { CheckIcon, CopyIcon, RefreshCcwIcon, XIcon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

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
}

function EventsListDisplay({ eventsData }: EventsListDisplayProps) {
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

	return (
		<Card className="w-full max-w-2xl mx-auto my-4">
			<CardHeader>
				<CardTitle>Eventos da Viagem</CardTitle>
				<CardDescription>
					{eventsData.message} ({eventsData.count} evento
					{eventsData.count !== 1 ? "s" : ""})
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{eventsData.events.map((event) => (
					<div
						key={event.id}
						className="flex items-start gap-3 p-3 border rounded-lg"
					>
						<div className="flex-1 space-y-1">
							<div className="flex items-center gap-2">
								<h4 className="font-medium">{event.title}</h4>
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
					</div>
				))}
			</CardContent>
		</Card>
	);
}
