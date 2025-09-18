import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { orpc } from "@/orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Eye, Loader2, Shield, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MemberCardProps {
	member: {
		id: string;
		travelId: string;
		userId: string;
		role: "owner" | "member";
		joinedAt: Date;
		user: {
			id: string;
			name: string;
			email: string;
			image: string | null;
		};
	};
	currentUserRole?: "owner" | "member";
	currentUserId?: string;
}

export function MemberCard({
	member,
	currentUserRole,
	currentUserId,
}: MemberCardProps) {
	const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
	const queryClient = useQueryClient();

	const removeMemberMutation = useMutation(
		orpc.invitationRoutes.removeMember.mutationOptions(),
	);

	const isCurrentUser = member.userId === currentUserId;
	const canRemoveMember =
		currentUserRole === "owner" && !isCurrentUser && member.role !== "owner";

	const handleRemoveMember = async () => {
		try {
			const result = await removeMemberMutation.mutateAsync({
				travelId: member.travelId,
				userId: member.userId,
			});

			if (result.success) {
				toast.success("Membro removido", {
					description:
						result.message || "O membro foi removido da viagem com sucesso.",
				});

				// Invalidate members query to refetch the list
				queryClient.invalidateQueries({
					queryKey: orpc.invitationRoutes.getTravelMembers.queryKey({
						input: {
							travelId: member.travelId,
						},
					}),
				});

				setIsRemoveDialogOpen(false);
			} else {
				toast.error("Erro ao remover membro", {
					description: result.message || "Não foi possível remover o membro.",
				});
			}
		} catch (error) {
			toast.error("Erro ao remover membro", {
				description: "Ocorreu um erro inesperado. Tente novamente.",
			});
		}
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "owner":
				return <Crown className="w-4 h-4" />;
			case "member":
				return <Shield className="w-4 h-4" />;
			default:
				return <Eye className="w-4 h-4" />;
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "owner":
				return "Proprietário";
			case "member":
				return "Membro";
			default:
				return "Visualizador";
		}
	};

	const getRoleVariant = (role: string) => {
		switch (role) {
			case "owner":
				return "default" as const;
			case "member":
				return "secondary" as const;
			default:
				return "outline" as const;
		}
	};

	const formatJoinDate = (date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		}).format(new Date(date));
	};

	return (
		<Card className="transition-all hover:shadow-lg">
			<CardContent className="p-0">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4">
					<div className="flex items-center gap-4">
						<Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
							<AvatarImage src={member.user.image || undefined} />
							<AvatarFallback className="bg-primary/10 text-primary font-semibold">
								{member.user.name
									.split(" ")
									.map((n) => n[0])
									.join("")
									.substring(0, 2)
									.toUpperCase()}
							</AvatarFallback>
						</Avatar>

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<h3 className="font-medium text-foreground">
									{member.user.name}
									{isCurrentUser && (
										<span className="ml-2 text-xs text-muted-foreground">
											(você)
										</span>
									)}
								</h3>
							</div>
							<p className="text-sm text-muted-foreground truncate">
								{member.user.email}
							</p>
							<p className="text-xs text-muted-foreground">
								Membro desde {formatJoinDate(member.joinedAt)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3 flex-shrink-0">
						<Badge variant={getRoleVariant(member.role)} className="gap-1">
							{getRoleIcon(member.role)}
							{getRoleLabel(member.role)}
						</Badge>

						{canRemoveMember && (
							<ResponsiveModal
								open={isRemoveDialogOpen}
								onOpenChange={setIsRemoveDialogOpen}
								trigger={
									<Button
										variant="ghost"
										size="sm"
										className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
									>
										<UserMinus className="w-4 h-4" />
										<span className="ml-2 hidden sm:inline">Remover</span>
									</Button>
								}
								desktopClassName="sm:max-w-md"
								contentClassName="gap-0"
							>
								<DialogHeader className="border-b px-6 py-4">
									<DialogTitle className="flex items-center gap-2 text-left">
										<Trash2 className="h-5 w-5 text-red-600" />
										Remover Membro
									</DialogTitle>
									<DialogDescription>
										Tem certeza de que deseja remover <strong>{member.user.name}</strong> desta viagem? Esta ação não pode ser desfeita.
									</DialogDescription>
								</DialogHeader>
								<div className="px-6 py-4">
									<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
										<p className="text-sm text-red-700 dark:text-red-300">
											⚠️ O membro perderá acesso imediatamente a todos os dados da viagem e não poderá mais visualizar ou editar informações.
										</p>
									</div>
								</div>
								<div className="border-t bg-background px-6 py-4">
									<DialogFooter className="gap-2">
										<Button
											variant="outline"
											onClick={() => setIsRemoveDialogOpen(false)}
											disabled={removeMemberMutation.isPending}
										>
											Cancelar
										</Button>
										<Button
											variant="destructive"
											onClick={handleRemoveMember}
											disabled={removeMemberMutation.isPending}
										>
											{removeMemberMutation.isPending ? (
												<>
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
													Removendo...
												</>
											) : (
												<>
													<UserMinus className="mr-2 h-4 w-4" />
													Remover Membro
												</>
											)}
										</Button>
									</DialogFooter>
								</div>
							</ResponsiveModal>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
