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
import { orpc } from "@/orpc/client";
import type { MyConciergeTools } from "@/orpc/modules/concierge/concierge.ai";
import * as m from "@/paraglide/messages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import { Trash2, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccommodationInfoRow } from "./AccommodationInfoRow";
import type { AddToolResultType } from "./component-tool-types";

interface ToolAccommodationDeleteRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToDeleteAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

export function ToolAccommodationDeleteRequestCard({
	input,
	travelId,
	toolCallId,
	addToolResult,
}: ToolAccommodationDeleteRequestCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);
	const deleteAccommodationMutation = useMutation(
		orpc.accommodationRoutes.deleteAccommodation.mutationOptions({
			onSuccess: async () => {
				toast.success(
					m["concierge.tools.accommodation_delete.toast_success"](),
				);
				await queryClient.invalidateQueries({
					queryKey: orpc.accommodationRoutes.getAccommodationsByTravel.queryKey(
						{
							input: { travelId },
						},
					),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.conciergeRoutes.getPendingIssues.queryKey({
						input: { travelId },
					}),
				});
				await addToolResult({
					tool: "requestToDeleteAccommodation",
					toolCallId,
					output: {
						success: true,
						message: m["concierge.tools.accommodation_delete.result_success"](),
					},
				});
				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error(m["concierge.tools.accommodation_delete.toast_error"]());
				console.error("Accommodation delete error:", error);
				await addToolResult({
					tool: "requestToDeleteAccommodation",
					toolCallId,
					output: {
						success: false,
						message: m["concierge.tools.accommodation_delete.result_error"](),
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
				m["concierge.tools.accommodation_delete.toast_missing_confirmation"](),
			);
			return;
		}

		deleteAccommodationMutation.mutate({ id: input.accommodationId });
	};

	const handleReject = () => {
		if (isProcessed) return;

		toast.info(m["concierge.tools.accommodation_delete.toast_reject"]());
		void addToolResult({
			tool: "requestToDeleteAccommodation",
			toolCallId,
			output: {
				success: false,
				message: m["concierge.tools.accommodation_delete.result_reject"](),
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
						{m["concierge.tools.accommodation_delete.title"]({
							id: input.accommodationId,
						})}
					</CardTitle>
					<Badge variant="destructive">
						{m["concierge.tools.accommodation_delete.badge_label"]()}
					</Badge>
				</div>
				<CardDescription>
					{m["concierge.tools.accommodation_delete.description"]()}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				{input.reason && (
					<AccommodationInfoRow
						label={m["concierge.tools.accommodation_delete.label_reason"]()}
					>
						{input.reason}
					</AccommodationInfoRow>
				)}
				<AccommodationInfoRow
					label={m["concierge.tools.accommodation_delete.label_confirmed"]()}
				>
					{input.confirm ? m["common.yes"]() : m["common.no"]()}
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
								? m["common.deleting"]()
								: m["common.delete"]()}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={deleteAccommodationMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							{m["common.cancel"]()}
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{deleteAccommodationMutation.isSuccess
							? m["concierge.tools.accommodation_delete.status_deleted"]()
							: m["concierge.tools.accommodation_delete.status_cancelled"]()}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
