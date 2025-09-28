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
				toast.success("Acomodação removida com sucesso!");
				await queryClient.invalidateQueries({
					queryKey: orpc.accommodationRoutes.getAccommodationsByTravel.queryKey({
						input: { travelId },
					}),
				});
				await addToolResult({
					tool: "requestToDeleteAccommodation",
					toolCallId,
					output: {
						success: true,
						message: "Acomodação excluída pelo usuário",
					},
				});
				setIsProcessed(true);
			},
			onError: async (error) => {
				toast.error("Erro ao excluir acomodação");
				console.error("Accommodation delete error:", error);
				await addToolResult({
					tool: "requestToDeleteAccommodation",
					toolCallId,
					output: {
						success: false,
						message: "Falha ao excluir acomodação",
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
				"Confirmação ausente. Peça ao assistente para confirmar a remoção antes de prosseguir.",
			);
			return;
		}

		deleteAccommodationMutation.mutate({ id: input.accommodationId });
	};

	const handleReject = () => {
		if (isProcessed) return;

		toast.info("Solicitação de exclusão rejeitada");
		void addToolResult({
			tool: "requestToDeleteAccommodation",
			toolCallId,
			output: {
				success: false,
				message: "Usuário rejeitou a exclusão",
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
						Remover acomodação {input.accommodationId}
					</CardTitle>
					<Badge variant="destructive">Remoção</Badge>
				</div>
				<CardDescription>
					Confirme se deseja excluir esta acomodação permanentemente
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				{input.reason && (
					<AccommodationInfoRow label="Motivo informado">
						{input.reason}
					</AccommodationInfoRow>
				)}
				<AccommodationInfoRow label="Confirmado pelo assistente">
					{input.confirm ? "Sim" : "Não"}
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
								? "Excluindo..."
								: "Excluir"}
						</Button>
						<Button
							variant="outline"
							onClick={handleReject}
							disabled={deleteAccommodationMutation.isPending}
							className="flex-1"
						>
							<XIcon className="w-4 h-4 mr-2" />
							Cancelar
						</Button>
					</>
				) : (
					<div className="flex-1 text-center text-sm text-muted-foreground">
						{deleteAccommodationMutation.isSuccess
							? "✅ Acomodação excluída"
							: "❌ Rejeitada ou cancelada"}
					</div>
				)}
			</CardFooter>
		</Card>
	);
}
