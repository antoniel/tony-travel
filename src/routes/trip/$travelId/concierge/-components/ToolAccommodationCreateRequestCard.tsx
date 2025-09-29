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
import { useState } from "react";
import { toast } from "sonner";

import { AccommodationInfoRow } from "./AccommodationInfoRow";
import type {
	AccommodationPayload,
	AddToolResultType,
} from "./component-tool-types";
import { getAccommodationTypeLabel, formatDateRange } from "./accommodation-utils";

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
						`Existe conflito com a acomodação "${result.conflictingAccommodation.name}"`,
					);
					await addToolResult({
						tool: "requestToCreateAccommodation",
						toolCallId,
						output: {
							success: false,
							message: `Conflito com a acomodação "${result.conflictingAccommodation.name}"`,
						},
					});
					setIsProcessed(true);
					return;
				}

				if (result.id) {
					toast.success("Acomodação criada com sucesso!");
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
							message: "Acomodação criada pelo usuário",
						},
					});
				}

				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error("Erro ao criar acomodação");
				console.error("Accommodation creation error:", error);
				await addToolResult({
					tool: "requestToCreateAccommodation",
					toolCallId,
					output: {
						success: false,
						message: "Falha ao criar acomodação",
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

		toast.info("Solicitação de acomodação rejeitada");
		void addToolResult({
			tool: "requestToCreateAccommodation",
			toolCallId,
			output: {
				success: false,
				message: "Usuário rejeitou a criação da acomodação",
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
					O assistente sugere adicionar esta acomodação à viagem
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<AccommodationInfoRow label="Período">
					{formatDateRange(input.startDate, input.endDate)}
				</AccommodationInfoRow>
				<AccommodationInfoRow label="Endereço">
					{input.address}
				</AccommodationInfoRow>
				<AccommodationInfoRow label="Valor estimado">
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
							{createAccommodationMutation.isPending ? "Criando..." : "Aceitar"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={createAccommodationMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Recusar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{createAccommodationMutation.isSuccess
							? "✅ Acomodação criada"
							: "❌ Rejeitada ou cancelada"}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
