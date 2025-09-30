import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ConciergeAgent } from "@/routes/{-$locale}/trip/$travelId/concierge/-components/concierge-agent";
import { useConciergeChatContext } from "@/routes/{-$locale}/trip/$travelId/concierge/-components/concierge-chat-context";
import { ConciergeBell, MessageSquareText, X } from "lucide-react";
import { useEffect, useRef } from "react";

export function FloatingConciergeToggle({ className }: { className?: string }) {
	const {
		travelName,
		travelId,
		setFloatingOpen,
		isFloatingOpen,
		hasUnread,
		markConversationSeen,
	} = useConciergeChatContext();
	const panelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isFloatingOpen) {
				setFloatingOpen(false);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isFloatingOpen, setFloatingOpen]);

	useEffect(() => {
		if (!isFloatingOpen) {
			return;
		}
		markConversationSeen();
	}, [isFloatingOpen, markConversationSeen]);

	useEffect(() => {
		if (!isFloatingOpen) {
			return;
		}

		const maybeFocus = () => {
			if (panelRef.current) {
				panelRef.current.focus({ preventScroll: true });
			}
		};

		maybeFocus();
	}, [isFloatingOpen]);

	return (
		<div
			className={cn(
				"fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3",
				className,
			)}
		>
			{isFloatingOpen ? (
				<div
					tabIndex={-1}
					ref={panelRef}
					className="flex h-[min(32rem,calc(100svh-12rem))] w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl"
					aria-label="Conversa com o concierge"
				>
					<header className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3">
						<div className="flex items-center gap-2 text-sm font-medium">
							<MessageSquareText className="h-4 w-4 text-primary" />
							<span>Concierge</span>
							{travelName ? (
								<span className="text-xs text-muted-foreground/70">
									{travelName}
								</span>
							) : null}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-muted-foreground hover:text-foreground"
							onClick={() => setFloatingOpen(false)}
							aria-label="Fechar concierge flutuante"
						>
							<X className="h-4 w-4" />
						</Button>
					</header>
					<div className="flex min-h-0 flex-1">
						<ConciergeAgent travelName={travelName} travelId={travelId} />
					</div>
				</div>
			) : (
				<Button
					onClick={() => setFloatingOpen(true)}
					className="relative h-14 rounded-full px-6 shadow-lg shadow-primary/20"
					aria-expanded={isFloatingOpen}
					aria-label="Abrir concierge flutuante"
				>
					<ConciergeBell className="mr-2 h-4 w-4" />
					Falar com concierge
					{hasUnread ? (
						<span className="absolute -right-1 -top-1 inline-flex h-3.5 w-3.5 rounded-full bg-primary">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
						</span>
					) : null}
				</Button>
			)}
		</div>
	);
}
