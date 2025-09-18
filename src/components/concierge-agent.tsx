import { Action, Actions } from "@/components/ai-elements/actions";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputBody,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
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
import { client, orpc } from "@/orpc/client";
import type { CreateEventToolInput } from "@/orpc/modules/concierge/concierge.tools";
import { useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	CalendarClock,
	CheckIcon,
	CopyIcon,
	Plane,
	RefreshCcwIcon,
	XIcon,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

function InChatHeader({ travelName }: { travelName?: string }) {
	return (
		<>
			<div className="flex flex-col gap-2  ">
				<h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
					Seu assistente para organizar a viagem
					{travelName ? `: ${travelName}` : ""}
				</h2>
			</div>
		</>
	);
}

interface EventConfirmationCardProps {
	eventData: CreateEventToolInput;
	travelId: string;
	addToolResult: (args: {
		tool: string;
		toolCallId: string;
		output: unknown;
	}) => Promise<void>;
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
				tool: "createEvent",
				toolCallId,
				output: { success: true, eventId: result.id },
			});
			setIsProcessed(true);
		},
		onError: (error) => {
			toast.error("Erro ao criar evento");
			console.error("Event creation error:", error);
			addToolResult({
				tool: "createEvent",
				toolCallId,
				output: { success: false, error: error.message },
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
			tool: "createEvent",
			toolCallId,
			output: { success: false, rejected: true },
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
							<span className="font-medium text-muted-foreground">Descrição:</span>{" "}
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

export const ConciergeAgent = ({
	travelName,
	travelId,
}: { travelName?: string; travelId: string }) => {
	const [input, setInput] = useState("");
	const { messages, sendMessage, status, stop, addToolResult } = useChat({
		transport: {
			async sendMessages(options) {
				const iterator = await client.conciergeRoutes.chat(
					{
						messages: options.messages,
						travelId: travelId,
					},
					{ signal: options.abortSignal },
				);
				return eventIteratorToStream(iterator);
			},
			reconnectToStream() {
				throw new Error("Unsupported");
			},
		},
	});

	const handleSubmit = (message: PromptInputMessage) => {
		const hasText = Boolean(message.text);
		const hasAttachments = Boolean(message.files?.length);

		if (!(hasText || hasAttachments)) {
			return;
		}

		sendMessage({
			text: message.text || "Sent with attachments",
			files: message.files,
		});
		setInput("");
	};

	const showIntro = useMemo(
		() => messages.length === 0 && input.trim().length === 0,
		[messages.length, input],
	);

	return (
		<div className="relative h-full w-full">
			<div className="flex h-full w-full flex-col overflow-hidden">
				<Conversation className="flex-1 min-h-0">
					<ConversationContent className="p-0">
						<InChatHeader travelName={travelName} />
						{showIntro ? (
							<div className="mb-4 rounded-lg border bg-muted/40 p-4 mt-4">
								<h3 className="mb-2 text-sm font-medium">
									O que o Concierge pode fazer
								</h3>
								<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
									<div className="rounded-md border bg-background p-3 text-sm">
										<div className="mb-1 flex items-center gap-2 font-medium">
											<Plane className="h-4 w-4 text-muted-foreground" />
											Adicionar voos
										</div>
										<p className="text-muted-foreground">
											"Adicionar voo de GRU para JFK saindo 10/11 às 22:30 e
											chegando 11/11 às 07:10".
										</p>
									</div>
									<div className="rounded-md border bg-background p-3 text-sm">
										<div className="mb-1 flex items-center gap-2 font-medium">
											<CalendarClock className="h-4 w-4 text-muted-foreground" />
											Eventos e horários
										</div>
										<p className="text-muted-foreground">
											"Criar jantar 12/11 das 19:00 às 21:00" ou "Passeio 13/11
											à tarde".
										</p>
									</div>
								</div>
							</div>
						) : null}
						{messages.map((message) => (
							<div key={message.id}>
								{message.role === "assistant" &&
									message.parts.filter((part) => part.type === "source-url")
										.length > 0 && (
										<Sources>
											<SourcesTrigger
												count={
													message.parts.filter(
														(part) => part.type === "source-url",
													).length
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
										case "tool-createEvent":
											// Renderizar tool calls (createEvent)
											if (travelId && part.state === "input-available") {
												try {
													const eventData = part.input as CreateEventToolInput;
													return (
														<EventConfirmationCard
															key={`${message.id}-${i}`}
															eventData={eventData}
															travelId={travelId}
															addToolResult={addToolResult}
															toolCallId={part.toolCallId}
														/>
													);
												} catch (error) {
													console.error("Error parsing tool call args:", error);
													return (
														<div
															key={`${message.id}-${i}`}
															className="p-4 border border-destructive rounded-lg"
														>
															<p className="text-destructive">
																Erro ao processar sugestão de evento
															</p>
														</div>
													);
												}
											}
											return null;
										default:
											return null;
									}
								})}
							</div>
						))}
						{status === "submitted" && <Loader />}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>

				<PromptInput
					onSubmit={handleSubmit}
					className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
					globalDrop
					multiple
				>
					<PromptInputBody>
						<PromptInputAttachments>
							{(attachment) => <PromptInputAttachment data={attachment} />}
						</PromptInputAttachments>
						<div className="flex items-end gap-2 p-3">
							<PromptInputTextarea
								className="flex-1 px-0 py-2"
								onChange={(e) => setInput(e.target.value)}
								value={input}
							/>
							<PromptInputSubmit
								className="shrink-0"
								disabled={!input && !status}
								onClick={status === "streaming" ? () => stop() : undefined}
								status={status}
								type={status === "streaming" ? "button" : "submit"}
							/>
						</div>
					</PromptInputBody>
				</PromptInput>
			</div>
		</div>
	);
};
