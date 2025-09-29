import { client, orpc } from "@/orpc/client";
import type { PendingIssuesSummary } from "@/orpc/modules/concierge/concierge.model";
import type { MyUIMessage } from "@/orpc/modules/concierge/concierge.ai";
import { eventIteratorToStream } from "@orpc/client";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";

type ConciergeChatHelpers = UseChatHelpers<MyUIMessage>;

interface ConciergeChatContextValue {
	chat: ConciergeChatHelpers;
	travelId: string;
	travelName?: string;
	hasUnread: boolean;
	isDelayedResponse: boolean;
	isFloatingOpen: boolean;
	isFullViewActive: boolean;
	setFloatingOpen: (open: boolean) => void;
	setFullViewActive: (active: boolean) => void;
	markConversationSeen: () => void;
	pendingSummary?: PendingIssuesSummary;
	isPendingIssuesLoading: boolean;
	refetchPendingIssues: () => Promise<void>;
}

const ConciergeChatContext = createContext<ConciergeChatContextValue | null>(null);

interface ConciergeChatProviderProps {
	children: ReactNode;
	travelId: string;
	travelName?: string;
}

export function ConciergeChatProvider({
	children,
	travelId,
	travelName,
}: ConciergeChatProviderProps) {
	const chat = useChat<MyUIMessage>({
		transport: {
			async sendMessages(options) {
				const iterator = await client.conciergeRoutes.chat(
					{
						messages: options.messages,
						travelId,
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

	const {
		data: pendingSummary,
		isLoading: isPendingIssuesLoading,
		refetch: refetchPendingIssuesRaw,
	} = useQuery({
		...orpc.conciergeRoutes.getPendingIssues.queryOptions({
			input: { travelId },
		}),
		refetchOnWindowFocus: true,
		staleTime: 0,
	});

	const refetchPendingIssues = useCallback(async () => {
		await refetchPendingIssuesRaw();
	}, [refetchPendingIssuesRaw]);

	const [isFloatingOpen, setIsFloatingOpen] = useState(false);
	const [isFullViewActive, setIsFullViewActive] = useState(false);
	const [hasUnread, setHasUnread] = useState(false);

	const lastAssistantMessageIdRef = useRef<string | null>(null);
	const [lastSeenAssistantId, setLastSeenAssistantId] = useState<string | null>(null);

	const [pendingStartedAt, setPendingStartedAt] = useState<number | null>(null);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (chat.status === "submitted" || chat.status === "streaming") {
			setPendingStartedAt((current) => current ?? Date.now());
			return;
		}
		setPendingStartedAt(null);
	}, [chat.status]);

	useEffect(() => {
		if (pendingStartedAt === null) {
			return;
		}
		const interval = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);
		return () => {
			window.clearInterval(interval);
		};
	}, [pendingStartedAt]);

	const isConversationVisible = isFloatingOpen || isFullViewActive;

	const markConversationSeen = useCallback(() => {
		const lastAssistantMessage = [...chat.messages]
			.reverse()
			.find((message) => message.role === "assistant");
		if (!lastAssistantMessage) {
			return;
		}
		setLastSeenAssistantId(lastAssistantMessage.id);
		lastAssistantMessageIdRef.current = lastAssistantMessage.id;
		setHasUnread(false);
	}, [chat.messages]);

	useEffect(() => {
		if (!isConversationVisible) {
			return;
		}
		markConversationSeen();
	}, [isConversationVisible, markConversationSeen]);

	useEffect(() => {
		const lastAssistantMessage = [...chat.messages]
			.reverse()
			.find((message) => message.role === "assistant");
		if (!lastAssistantMessage) {
			return;
		}

		if (lastAssistantMessageIdRef.current === lastAssistantMessage.id) {
			return;
		}

		lastAssistantMessageIdRef.current = lastAssistantMessage.id;
		if (isConversationVisible) {
			setLastSeenAssistantId(lastAssistantMessage.id);
			setHasUnread(false);
			return;
		}

		if (lastSeenAssistantId !== lastAssistantMessage.id) {
			setHasUnread(true);
		}
	}, [chat.messages, isConversationVisible, lastSeenAssistantId]);

	const isDelayedResponse = useMemo(() => {
		if (pendingStartedAt === null) {
			return false;
		}
		return now - pendingStartedAt >= 30_000;
	}, [now, pendingStartedAt]);

	const value = useMemo<ConciergeChatContextValue>(() => ({
		chat,
		travelId,
		travelName,
		hasUnread,
		isDelayedResponse,
		isFloatingOpen,
		isFullViewActive,
		setFloatingOpen: setIsFloatingOpen,
		setFullViewActive: setIsFullViewActive,
		markConversationSeen,
		pendingSummary,
		isPendingIssuesLoading,
		refetchPendingIssues,
	}), [
		chat,
		hasUnread,
		isDelayedResponse,
		isFloatingOpen,
		isFullViewActive,
		markConversationSeen,
		pendingSummary,
		refetchPendingIssues,
		isPendingIssuesLoading,
		travelId,
		travelName,
	]);

	return (
		<ConciergeChatContext.Provider value={value}>
			{children}
		</ConciergeChatContext.Provider>
	);
}

export function useConciergeChatContext() {
	const context = useContext(ConciergeChatContext);
	if (!context) {
		throw new Error(
			"useConciergeChatContext must be used within a ConciergeChatProvider",
		);
	}
	return context;
}
