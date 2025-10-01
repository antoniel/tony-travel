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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InferUITools } from "ai";
import { CheckIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatDate } from "./accommodation-utils";
import type {
	AccommodationUpdatePayload,
	AddToolResultType,
} from "./component-tool-types";
import * as m from "@/paraglide/messages";

interface ToolAccommodationUpdateRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToUpdateAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

const fieldLabelGetters: Record<string, () => string> = {
	name: () => m["accommodation.name"](),
	type: () => m["accommodation.type"](),
	address: () => m["accommodation.address"](),
	startDate: () => m["accommodation.check_in"](),
	endDate: () => m["accommodation.check_out"](),
	price: () => m["concierge.tools.accommodation_update.label_price"](),
};

export function ToolAccommodationUpdateRequestCard({
	input,
	travelId,
	toolCallId,
	addToolResult,
}: ToolAccommodationUpdateRequestCardProps) {
	const queryClient = useQueryClient();
	const [isProcessed, setIsProcessed] = useState(false);
	const updateAccommodationMutation = useMutation(
		orpc.accommodationRoutes.updateAccommodation.mutationOptions({
			onSuccess: async (result, variables) => {
				if (result.validationError) {
					toast.error(result.validationError);
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: false,
							validationError: result.validationError,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.conflictingAccommodation) {
					toast.error(
						m["concierge.tools.accommodation_update.toast_conflict"]({
							name: result.conflictingAccommodation.name,
						}),
					);
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: false,
							validationError: m["concierge.tools.accommodation_update.result_conflict"]({
								name: result.conflictingAccommodation.name,
							}),
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.success) {
					toast.success(
						m["concierge.tools.accommodation_update.toast_success"](),
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
					const updatedFields = Object.keys(variables.accommodation ?? {});
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: true,
							accommodation: {
								accommodationId: input.accommodationId,
								updatedFields,
							},
						},
					});
				}

				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error(m["concierge.tools.accommodation_update.toast_error"]());
				console.error("Accommodation update error:", error);
				await addToolResult({
					tool: "requestToUpdateAccommodation",
					toolCallId,
					output: {
						success: false,
						validationError: m["concierge.tools.accommodation_update.result_error"](),
					},
				});
				setIsProcessed(true);
			},
		}),
	);

	const normalizedUpdates = useMemo<AccommodationUpdatePayload>(() => {
		const updates: AccommodationUpdatePayload = {};
		if (input.updates.name) updates.name = input.updates.name;
		if (input.updates.type) updates.type = input.updates.type;
		if (input.updates.address) updates.address = input.updates.address;
		if (input.updates.startDate)
			updates.startDate = new Date(input.updates.startDate);
		if (input.updates.endDate)
			updates.endDate = new Date(input.updates.endDate);
		if (input.updates.price !== undefined) updates.price = input.updates.price;
		return updates;
	}, [input.updates]);

	const proposedEntries = useMemo(
		() =>
			Object.entries(normalizedUpdates) as Array<
				[
					keyof AccommodationUpdatePayload,
					AccommodationUpdatePayload[keyof AccommodationUpdatePayload],
				]
			>,
		[normalizedUpdates],
	);

	const handleAccept = () => {
	if (isProcessed || proposedEntries.length === 0) {
		if (proposedEntries.length === 0) {
			toast.info(
				m["concierge.tools.accommodation_update.toast_no_changes"](),
			);
		}
		return;
	}

		updateAccommodationMutation.mutate({
			id: input.accommodationId,
			accommodation: normalizedUpdates,
		});
	};

	const handleReject = () => {
		if (isProcessed) return;

	toast.info(m["concierge.tools.accommodation_update.toast_reject"]());
	void addToolResult({
		tool: "requestToUpdateAccommodation",
		toolCallId,
		output: {
			success: false,
			validationError: m["concierge.tools.accommodation_update.result_reject"](),
		},
	});
		setIsProcessed(true);
	};

	const pending = updateAccommodationMutation.isPending;

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle className="text-lg">
						{m["concierge.tools.accommodation_update.title"]({
							id: input.accommodationId,
						})}
					</CardTitle>
					<Badge variant="outline">
						{m["concierge.tools.accommodation_update.badge_label"]()}
					</Badge>
				</div>
				<CardDescription>
					{m["concierge.tools.accommodation_update.description"]()}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
	{proposedEntries.length === 0 ? (
		<p className="text-muted-foreground">
			{m["concierge.tools.accommodation_update.empty"]()}
		</p>
				) : (
					<ul className="space-y-2">
						{proposedEntries.map(([fieldKey, value]) => (
							<li
								key={fieldKey as string}
								className="rounded border bg-muted/10 p-2"
							>
								<span className="font-medium text-muted-foreground">
									{getAccommodationFieldLabel(fieldKey as string)}:
								</span>{" "}
								{renderAccommodationFieldValue(fieldKey, value)}
							</li>
						))}
					</ul>
				)}
			</CardContent>
			<CardFooter className="flex gap-2">
				{!isProcessed ? (
					<>
						<Button
							onClick={handleAccept}
							disabled={pending || proposedEntries.length === 0}
							className="flex-1"
						>
							<CheckIcon className="w-4 h-4 mr-2" />
							{pending
								? m["common.applying"]()
								: m["concierge.tools.accommodation_update.button_apply"]()}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={pending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							{m["common.reject"]()}
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{updateAccommodationMutation.isSuccess
							? m["concierge.tools.accommodation_update.status_applied"]()
							: m["concierge.tools.accommodation_update.status_cancelled"]()}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

function renderAccommodationFieldValue(
	_fieldKey: keyof AccommodationUpdatePayload,
	value: AccommodationUpdatePayload[keyof AccommodationUpdatePayload],
) {
	if (value === undefined) {
		return m["concierge.tools.accommodation_update.label_no_value"]();
	}

	if (value instanceof Date) {
		return formatDate(value);
	}

	if (typeof value === "number") {
		return formatCurrencyBRL(value);
	}

	return String(value);
}

function getAccommodationFieldLabel(fieldKey: string) {
	return fieldLabelGetters[fieldKey]?.() ?? fieldKey;
}
