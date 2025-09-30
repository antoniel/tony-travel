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
import type { MyUIMessage } from "@/orpc/modules/concierge/concierge.ai";
import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment } from "react";

import { ToolAccommodationCreateRequestCard } from "./ToolAccommodationCreateRequestCard";
import { ToolAccommodationDeleteRequestCard } from "./ToolAccommodationDeleteRequestCard";
import { ToolAccommodationUpdateRequestCard } from "./ToolAccommodationUpdateRequestCard";
import { ToolAccommodationsListDisplay } from "./ToolAccommodationsListDisplay";
import { ToolEventConfirmationCard } from "./ToolEventConfirmationCard";
import { ToolEventsListDisplay } from "./ToolEventsListDisplay";
import type { AddToolResultType } from "./component-tool-types";

interface MessagesProps {
	messages: MyUIMessage[];
	status: "submitted" | "streaming" | "idle" | "error" | "ready";
	travelId: string;
	addToolResult: AddToolResultType;
}

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

					{message.parts.map((part, i) => {
						switch (part.type) {
							case "text":
								return (
									<Fragment key={`${message.id}-${i}`}>
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
									</Fragment>
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
									return (
										<ToolEventConfirmationCard
											key={`${message.id}-${i}`}
											eventData={part.input}
											travelId={travelId}
											addToolResult={addToolResult}
											toolCallId={part.toolCallId}
										/>
									);
								}
								return null;

							case "tool-requestToCreateAccommodation":
								if (part.state === "input-available") {
									return (
										<ToolAccommodationCreateRequestCard
											key={`${message.id}-${i}`}
											input={part.input}
											travelId={travelId}
											toolCallId={part.toolCallId}
											addToolResult={addToolResult}
										/>
									);
								}
								return null;

							case "tool-requestToUpdateAccommodation":
								if (part.state === "input-available") {
									return (
										<ToolAccommodationUpdateRequestCard
											key={`${message.id}-${i}`}
											input={part.input}
											travelId={travelId}
											toolCallId={part.toolCallId}
											addToolResult={addToolResult}
										/>
									);
								}
								return null;

							case "tool-requestToDeleteAccommodation":
								if (part.state === "input-available") {
									return (
										<ToolAccommodationDeleteRequestCard
											key={`${message.id}-${i}`}
											input={part.input}
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
											className="flex items-center gap-2 rounded border-0 bg-muted/5 px-2 py-1"
										>
											<div className="h-2 w-2 animate-spin rounded-full border border-muted-foreground/30 border-t-transparent" />
											<span className="text-xs text-muted-foreground/60">
												Buscando eventos da viagem...
											</span>
										</div>
									);
								}

								if (part.state === "output-available") {
									return (
										<ToolEventsListDisplay
											key={`${message.id}-${i}`}
											eventsData={part.output}
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
											className="flex items-center gap-2 rounded border-0 bg-muted/5 px-2 py-1"
										>
											<div className="h-2 w-2 animate-spin rounded-full border border-muted-foreground/30 border-t-transparent" />
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
											className="rounded-lg border border-border bg-muted/5 p-4"
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
											className="flex items-center gap-2 rounded border-0 bg-muted/5 px-2 py-1"
										>
											<div className="h-2 w-2 animate-spin rounded-full border border-muted-foreground/30 border-t-transparent" />
											<span className="text-xs text-muted-foreground/60">
												Buscando acomodações disponíveis...
											</span>
										</div>
									);
								}
								if (part.state === "output-available") {
									return (
										<ToolAccommodationsListDisplay
											key={`${message.id}-${i}`}
											report={part.output}
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
