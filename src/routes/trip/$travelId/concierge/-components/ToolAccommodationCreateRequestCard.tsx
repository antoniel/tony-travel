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
import type { MyConciergeTools } from "@/orpc/modules/concierge/concierge.ai";
import * as m from "@/paraglide/messages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccommodationInfoRow } from "./AccommodationInfoRow";
import type {
	AccommodationPayload,
	AddToolResultType,
} from "./component-tool-types";
import {
	getAccommodationTypeLabel,
	formatDateRange,
} from "./accommodation-utils";

interface ToolAccommodationCreateRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToCreateAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

export function ToolAccommodationCreateRequestCard({
	input,
	travelId,
	toolCallId,
	addToolResult,
}: ToolAccommodationCreateRequestCardProps) {
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
						m["concierge.tools.accommodation_create.toast_conflict"]({
							name: result.conflictingAccommodation.name,
						}),
					);
					await addToolResult({
						tool: "requestToCreateAccommodation",
						toolCallId,
						output: {
							success: false,
							message: m[
								"concierge.tools.accommodation_create.result_conflict"
							]({
								name: result.conflictingAccommodation.name,
							}),
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.id) {
					toast.success(
						m["concierge.tools.accommodation_create.toast_success"](),
					);
					await queryClient.invalidateQueries({
						queryKey:
							orpc.accommodationRoutes.getAccommodationsByTravel.queryKey({
								input: { travelId },
							}),
					});
					await queryClient.invalidateQueries({
						queryKey: orpc.conciergeRoutes.getPendingIssues.queryKey({
							input: { travelId },
						}),
					});
					await addToolResult({
						tool: "requestToCreateAccommodation",
						toolCallId,
						output: {
							success: true,
							accommodation: { accommodationId: result.id },
							message:
								m["concierge.tools.accommodation_create.result_success"](),
						},
					});
				}

				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error(m["concierge.tools.accommodation_create.toast_error"]());
				console.error("Accommodation creation error:", error);
				await addToolResult({
					tool: "requestToCreateAccommodation",
					toolCallId,
					output: {
						success: false,
						message: m["concierge.tools.accommodation_create.result_error"](),
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

		toast.info(m["concierge.tools.accommodation_create.toast_reject"]());
		void addToolResult({
			tool: "requestToCreateAccommodation",
			toolCallId,
			output: {
				success: false,
				message: m["concierge.tools.accommodation_create.result_reject"](),
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
					{m["concierge.tools.accommodation_create.card_description"]()}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<AccommodationInfoRow
					label={m["concierge.tools.accommodation_create.label_period"]()}
				>
					{formatDateRange(input.startDate, input.endDate)}
				</AccommodationInfoRow>
				<AccommodationInfoRow
					label={m["concierge.tools.accommodation_create.label_address"]()}
				>
					{input.address}
				</AccommodationInfoRow>
				<AccommodationInfoRow
					label={m[
						"concierge.tools.accommodation_create.label_estimated_value"
					]()}
				>
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
							{createAccommodationMutation.isPending
								? m["common.creating"]()
								: m["common.accept"]()}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={createAccommodationMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							{m["common.reject"]()}
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{createAccommodationMutation.isSuccess
							? m["concierge.tools.accommodation_create.status_completed"]()
							: m["concierge.tools.accommodation_create.status_cancelled"]()}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
