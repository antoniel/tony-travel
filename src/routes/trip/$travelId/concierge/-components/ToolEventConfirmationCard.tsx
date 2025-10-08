import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL } from "@/lib/currency";
import { orpc } from "@/orpc/client";
import type { MyConciergeTools } from "@/orpc/modules/concierge/concierge.ai";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { AddToolResultType } from "./component-tool-types";

interface ToolEventConfirmationCardProps {
	eventData: InferUITools<MyConciergeTools>["requestToCreateEvent"]["input"];
	travelId: string;
	addToolResult: AddToolResultType;
	toolCallId: string;
}

const eventTypeLabels: Record<string, () => string> = {
	travel: () => m["event.type_transport"](),
	food: () => m["event.type_food"](),
	activity: () => m["event.type_activity"](),
};

const eventTypeVariants: Record<
	string,
	"default" | "secondary" | "outline" | "destructive"
> = {
	travel: "default",
	food: "secondary",
	activity: "outline",
};

const formatDate = (dateStr: string) => {
	const locale = getLocale();
	const date = new Date(dateStr);
	return date.toLocaleString(locale, {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const getEventTypeLabel = (type: string) => {
	return eventTypeLabels[type]?.() ?? type;
};

const getEventTypeVariant = (
	type: string,
): "default" | "secondary" | "outline" | "destructive" => {
	return eventTypeVariants[type] ?? "default";
};

export function ToolEventConfirmationCard({
	eventData,
	travelId,
	addToolResult,
	toolCallId,
}: ToolEventConfirmationCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);

	const createEventMutation = useMutation({
		...orpc.eventRoutes.createEvent.mutationOptions(),
		onSuccess: (result) => {
			toast.success(m["concierge.tools.event_create.toast_success"]());
			queryClient.invalidateQueries({
				queryKey: orpc.eventRoutes.getEventsByTravel.queryKey({
					input: { travelId },
				}),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.travelRoutes.getTravel.queryKey({
					input: { id: travelId },
				}),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.conciergeRoutes.getPendingIssues.queryKey({
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
			toast.error(m["concierge.tools.event_create.toast_error"]());
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

		toast.info(m["concierge.tools.event_create.toast_reject"]());
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
					{m["concierge.tools.event_create.card_description"]()}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="grid grid-cols-1 gap-2 text-sm">
					<div>
						<span className="font-medium text-muted-foreground">
							{m["concierge.tools.event_create.label_start"]()}:
						</span>{" "}
						{formatDate(eventData.startDate)}
					</div>
					<div>
						<span className="font-medium text-muted-foreground">
							{m["concierge.tools.event_create.label_end"]()}:
						</span>{" "}
						{formatDate(eventData.endDate)}
					</div>
					{eventData.location && (
						<div>
							<span className="font-medium text-muted-foreground">
								{m["concierge.tools.event_create.label_location"]()}:
							</span>{" "}
							{eventData.location}
						</div>
					)}
					{eventData.estimatedCost && (
						<div>
							<span className="font-medium text-muted-foreground">
								{m["concierge.tools.event_create.label_cost"]()}:
							</span>{" "}
							{formatCurrencyBRL(eventData.estimatedCost)}
						</div>
					)}
					{eventData.description && (
						<div>
							<span className="font-medium text-muted-foreground">
								{m["concierge.tools.event_create.label_description"]()}:
							</span>{" "}
							{eventData.description}
						</div>
					)}
					{eventData.link && (
						<div>
							<span className="font-medium text-muted-foreground">
								{m["concierge.tools.event_create.label_link"]()}:
							</span>{" "}
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
							{createEventMutation.isPending
								? m["common.creating"]()
								: m["common.accept"]()}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={createEventMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							{m["common.reject"]()}
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{createEventMutation.isSuccess
							? m["concierge.tools.event_create.status_created"]()
							: m["concierge.tools.event_create.status_rejected"]()}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
