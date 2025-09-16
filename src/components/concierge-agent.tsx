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
	PromptInputToolbar,
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
import { client } from "@/orpc/client";
import { useChat } from "@ai-sdk/react";
import { eventIteratorToStream } from "@orpc/client";
import { CalendarClock, CopyIcon, Plane, RefreshCcwIcon } from "lucide-react";
import React, { useMemo, useState } from "react";

const models = [
	{
		name: "GPT 4o",
		value: "openai/gpt-4o",
	},
	{
		name: "Deepseek R1",
		value: "deepseek/deepseek-r1",
	},
];

export const ConciergeAgent = () => {
	const [input, setInput] = useState("");
	const [model] = useState<string>(models[0].value);
	const { messages, sendMessage, status } = useChat({
		transport: {
			async sendMessages(options) {
				const iterator = await client.conciergeRoutes.chat(
					{
						chatId: options.chatId,
						messages: options.messages,
						model,
						webSearch: false,
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
						{showIntro ? (
							<div className="mb-4 rounded-lg border bg-muted/40 p-4">
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
						<PromptInputTextarea
							onChange={(e) => setInput(e.target.value)}
							value={input}
						/>
					</PromptInputBody>
					<PromptInputToolbar className="justify-end">
						<PromptInputSubmit disabled={!input && !status} status={status} />
					</PromptInputToolbar>
				</PromptInput>
			</div>
		</div>
	);
};
