import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Copy,
	ExternalLink,
	Link,
	Loader2,
	RefreshCw,
	Share2,
} from "lucide-react";
import { toast } from "sonner";

interface InviteLinkManagerProps {
	travelId: string;
}

export function InviteLinkManager({ travelId }: InviteLinkManagerProps) {
	const queryClient = useQueryClient();

	const currentLinkQuery = useQuery(
		orpc.invitationRoutes.getCurrentInviteLink.queryOptions({ 
			input: { travelId } 
		}),
	);

	const createLinkMutation = useMutation(
		orpc.invitationRoutes.createInviteLink.mutationOptions(),
	);

	const currentLink = currentLinkQuery.data;
	const isLoading = currentLinkQuery.isLoading;

	const handleCreateLink = async () => {
		try {
			const result = await createLinkMutation.mutateAsync({
				travelId,
				expiresInDays: 7, // Default to 7 days
			});

			toast.success("Link de convite gerado!", {
				description: "O link de convite foi criado e está pronto para ser compartilhado.",
			});

			// Invalidate current link query to refetch
			queryClient.invalidateQueries(
				orpc.invitationRoutes.getCurrentInviteLink.queryKey({ 
					input: { travelId } 
				}),
			);
		} catch (error) {
			toast.error("Erro ao gerar link", {
				description: "Não foi possível criar o link de convite. Tente novamente.",
			});
		}
	};

	const handleCopyLink = async () => {
		if (!currentLink?.inviteUrl) return;

		try {
			await navigator.clipboard.writeText(currentLink.inviteUrl);
			toast.success("Link copiado!", {
				description: "O link de convite foi copiado para a área de transferência.",
			});
		} catch (error) {
			toast.error("Erro ao copiar", {
				description: "Não foi possível copiar o link. Tente selecionar e copiar manualmente.",
			});
		}
	};

	const isExpired = currentLink?.expiresAt && new Date(currentLink.expiresAt) < new Date();
	const isCreating = createLinkMutation.isPending;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Share2 className="w-5 h-5" />
					Link de Convite
				</CardTitle>
				<CardDescription>
					Compartilhe este link para convidar novos membros para a viagem.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{isLoading ? (
					<InviteLinkSkeleton />
				) : currentLink ? (
					<ExistingInviteLink 
						link={currentLink}
						isExpired={isExpired}
						onCopy={handleCopyLink}
						onRegenerate={handleCreateLink}
						isRegenerating={isCreating}
					/>
				) : (
					<NoInviteLink 
						onCreate={handleCreateLink}
						isCreating={isCreating}
					/>
				)}
			</CardContent>
		</Card>
	);
}

function InviteLinkSkeleton() {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-10 w-full" />
			</div>
			<div className="flex gap-2">
				<Skeleton className="h-9 w-20" />
				<Skeleton className="h-9 w-24" />
			</div>
		</div>
	);
}

function ExistingInviteLink({ 
	link, 
	isExpired, 
	onCopy, 
	onRegenerate, 
	isRegenerating 
}: {
	link: any;
	isExpired: boolean;
	onCopy: () => void;
	onRegenerate: () => void;
	isRegenerating: boolean;
}) {
	const formatExpiryDate = (date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(new Date(date));
	};

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="invite-link">Link de Convite</Label>
				<div className="flex gap-2">
					<Input
						id="invite-link"
						value={link.inviteUrl}
						readOnly
						className={isExpired ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : ""}
					/>
					<Button
						onClick={onCopy}
						variant="outline"
						size="icon"
						disabled={isExpired}
					>
						<Copy className="w-4 h-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => window.open(link.inviteUrl, '_blank')}
						disabled={isExpired}
					>
						<ExternalLink className="w-4 h-4" />
					</Button>
				</div>
			</div>

			{link.expiresAt && (
				<div className={`text-sm ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
					{isExpired ? (
						<span className="font-medium">⚠️ Expirou em {formatExpiryDate(link.expiresAt)}</span>
					) : (
						<span>Expira em {formatExpiryDate(link.expiresAt)}</span>
					)}
				</div>
			)}

			<div className="flex gap-2">
				<Button
					onClick={onCopy}
					variant="default"
					size="sm"
					disabled={isExpired}
				>
					<Copy className="w-4 h-4 mr-2" />
					Copiar Link
				</Button>
				
				<Button
					onClick={onRegenerate}
					variant="outline"
					size="sm"
					disabled={isRegenerating}
				>
					{isRegenerating ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Gerando...
						</>
					) : (
						<>
							<RefreshCw className="w-4 h-4 mr-2" />
							{isExpired ? "Gerar Novo" : "Renovar"}
						</>
					)}
				</Button>
			</div>

			{isExpired && (
				<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
					<p className="text-sm text-red-700 dark:text-red-300">
						Este link expirou e não pode mais ser usado. Gere um novo link para continuar convidando membros.
					</p>
				</div>
			)}
		</div>
	);
}

function NoInviteLink({ onCreate, isCreating }: { onCreate: () => void; isCreating: boolean }) {
	return (
		<div className="text-center py-6">
			<div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
				<Link className="w-8 h-8 text-muted-foreground" />
			</div>
			<h3 className="font-medium mb-2">Nenhum link ativo</h3>
			<p className="text-sm text-muted-foreground mb-6">
				Crie um link de convite para começar a adicionar novos membros à viagem.
			</p>
			<Button onClick={onCreate} disabled={isCreating}>
				{isCreating ? (
					<>
						<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						Criando Link...
					</>
				) : (
					<>
						<Link className="w-4 h-4 mr-2" />
						Criar Link de Convite
					</>
				)}
			</Button>
		</div>
	);
}