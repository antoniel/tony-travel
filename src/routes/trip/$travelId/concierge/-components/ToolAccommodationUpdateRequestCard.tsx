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

interface ToolAccommodationUpdateRequestCardProps {
	input: InferUITools<MyConciergeTools>["requestToUpdateAccommodation"]["input"];
	travelId: string;
	toolCallId: string;
	addToolResult: AddToolResultType;
}

const fieldLabels: Record<string, string> = {
	name: "Nome",
	type: "Tipo",
	address: "Endereço",
	startDate: "Check-in",
	endDate: "Check-out",
	price: "Preço",
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
						`Existe conflito com a acomodação "${result.conflictingAccommodation.name}"`,
					);
					await addToolResult({
						tool: "requestToUpdateAccommodation",
						toolCallId,
						output: {
							success: false,
							validationError: `Conflito com a acomodação "${result.conflictingAccommodation.name}"`,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.success) {
					toast.success("Acomodação atualizada com sucesso!");
					await queryClient.invalidateQueries({
						queryKey:
							orpc.accommodationRoutes.getAccommodationsByTravel.queryKey({
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
				toast.error("Erro ao atualizar acomodação");
				console.error("Accommodation update error:", error);
				await addToolResult({
					tool: "requestToUpdateAccommodation",
					toolCallId,
					output: {
						success: false,
						validationError: "Falha ao atualizar acomodação",
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
				toast.info("Nenhuma alteração foi proposta para aplicar");
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

		toast.info("Solicitação de atualização rejeitada");
		void addToolResult({
			tool: "requestToUpdateAccommodation",
			toolCallId,
			output: {
				success: false,
				validationError: "Usuário rejeitou a atualização",
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
						Atualizar acomodação {input.accommodationId}
					</CardTitle>
					<Badge variant="outline">Atualização</Badge>
				</div>
				<CardDescription>
					Revise e confirme as alterações sugeridas antes de aplicar
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				{proposedEntries.length === 0 ? (
					<p className="text-muted-foreground">
						Nenhuma alteração foi proposta para esta acomodação.
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
							{pending ? "Aplicando..." : "Aplicar alterações"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={pending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Recusar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{updateAccommodationMutation.isSuccess
							? "✅ Alterações aplicadas"
							: "❌ Rejeitada ou cancelada"}
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
		return "-";
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
	return fieldLabels[fieldKey] ?? fieldKey;
}
