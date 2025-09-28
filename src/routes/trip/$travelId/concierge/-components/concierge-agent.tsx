import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
	PromptInput,
	PromptInputAttachment,
	PromptInputAttachments,
	PromptInputBody,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Messages } from "@/routes/trip/$travelId/concierge/-components/Messages";
import { useConciergeChatContext } from "@/routes/trip/$travelId/concierge/-components/concierge-chat-context";
import { CalendarClock, Clock, MapPin, Plane } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export const ConciergeAgent = ({
	travelName,
	travelId,
}: { travelName?: string; travelId?: string }) => {
	const [input, setInput] = useState("");
	const {
		chat,
		travelName: contextTravelName,
		travelId: contextTravelId,
		isDelayedResponse,
		markConversationSeen,
	} = useConciergeChatContext();

	const effectiveTravelName = travelName ?? contextTravelName;
	const effectiveTravelId = travelId ?? contextTravelId;

	if (!effectiveTravelId) {
		throw new Error(
			"ConciergeAgent requires a travelId. Ensure it is wrapped in ConciergeChatProvider.",
		);
	}
	const { messages, sendMessage, status, stop, addToolResult } = chat;

	useEffect(() => {
		markConversationSeen();
	}, [markConversationSeen]);

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
						<InChatHeader travelName={effectiveTravelName} />
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
									<div className="rounded-md border bg-background p-3 text-sm">
										<div className="mb-1 flex items-center gap-2 font-medium">
											<MapPin className="h-4 w-4 text-muted-foreground" />
											Adicione Atividades
										</div>
										<p className="text-muted-foreground">
											"Adicione atividade leve para começar a viagem" ou
											"Adicione no primeiro dia aclimatação".
										</p>
									</div>
								</div>
							</div>
						) : null}
						<Messages
							messages={messages}
							status={status}
							travelId={effectiveTravelId}
							addToolResult={addToolResult}
						/>
						{isDelayedResponse ? (
							<Alert className="mx-4 mt-4 border-amber-200 bg-amber-50 text-amber-900">
								<Clock className="h-4 w-4" />
								<AlertDescription>
									O concierge está analisando sua mensagem. A resposta pode levar
									alguns instantes, mas seu pedido já está na fila.
								</AlertDescription>
							</Alert>
						) : null}
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
