import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Crown,
	Eye,
	Mail,
	Settings,
	Shield,
	UserPlus,
	Users,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/trip/$travelId/members")({
	component: MembersPage,
});

function MembersPage() {
	const { travelId } = Route.useParams();
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("viewer");
	const [isInviteOpen, setIsInviteOpen] = useState(false);

	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const isLoading = travelQuery.isLoading;

	// Mock data para membros (em um app real, isso viria do backend)
	const members = [
		{
			id: "1",
			name: "João Silva",
			email: "joao@email.com",
			role: "owner",
			avatar: "/avatars/joao.jpg",
			joinedAt: new Date("2023-12-01"),
			status: "active" as const,
		},
		{
			id: "2",
			name: "Maria Santos",
			email: "maria@email.com",
			role: "editor",
			avatar: "/avatars/maria.jpg",
			joinedAt: new Date("2023-12-05"),
			status: "active" as const,
		},
		{
			id: "3",
			name: "Pedro Costa",
			email: "pedro@email.com",
			role: "viewer",
			avatar: "/avatars/pedro.jpg",
			joinedAt: new Date("2023-12-10"),
			status: "pending" as const,
		},
	];

	const activeMembersCount = members.filter(
		(m) => m.status === "active",
	).length;
	const pendingInvitesCount = members.filter(
		(m) => m.status === "pending",
	).length;

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "owner":
				return <Crown className="w-4 h-4" />;
			case "editor":
				return <Shield className="w-4 h-4" />;
			case "viewer":
				return <Eye className="w-4 h-4" />;
			default:
				return <Eye className="w-4 h-4" />;
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "owner":
				return "Proprietário";
			case "editor":
				return "Editor";
			case "viewer":
				return "Visualizador";
			default:
				return "Visualizador";
		}
	};

	const getRoleVariant = (role: string) => {
		switch (role) {
			case "owner":
				return "default" as const;
			case "editor":
				return "secondary" as const;
			case "viewer":
				return "outline" as const;
			default:
				return "outline" as const;
		}
	};

	const handleInvite = () => {
		// Implementar lógica de convite
		console.log("Convidando:", { email: inviteEmail, role: inviteRole });
		setInviteEmail("");
		setInviteRole("viewer");
		setIsInviteOpen(false);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-10">
			{/* Header with Stats */}
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
				<div className="space-y-3">
					<h1 className="text-3xl font-bold tracking-tight">
						Membros da Viagem
					</h1>
					<p className="text-lg text-muted-foreground">
						Gerencie quem pode acessar e colaborar nesta viagem
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3">
					{/* Quick stats */}
					<div className="flex gap-4 text-sm">
						<Badge variant="secondary" className="gap-2">
							<Users className="w-4 h-4" />
							<span>{activeMembersCount} ativos</span>
						</Badge>
						{pendingInvitesCount > 0 && (
							<Badge variant="outline" className="gap-2">
								<Mail className="w-4 h-4" />
								<span>
									{pendingInvitesCount} pendente
									{pendingInvitesCount !== 1 ? "s" : ""}
								</span>
							</Badge>
						)}
					</div>

					<Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
						<DialogTrigger asChild>
							<Button className="shadow-sm">
								<UserPlus className="w-4 h-4 mr-2" />
								<span className="hidden sm:inline">Convidar Membro</span>
								<span className="sm:hidden">Convidar</span>
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>Convidar Novo Membro</DialogTitle>
								<DialogDescription>
									Convide alguém para colaborar nesta viagem. Eles receberão um
									email com o convite.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="email@exemplo.com"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										className="w-full"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="role">Nível de Permissão</Label>
									<Select value={inviteRole} onValueChange={setInviteRole}>
										<SelectTrigger>
											<SelectValue placeholder="Selecione a permissão" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="viewer" className="py-3">
												<div className="flex items-center gap-2">
													<Eye className="w-4 h-4" />
													<div>
														<div className="font-medium">Visualizador</div>
														<div className="text-xs text-muted-foreground">
															Apenas visualizar
														</div>
													</div>
												</div>
											</SelectItem>
											<SelectItem value="editor" className="py-3">
												<div className="flex items-center gap-2">
													<Shield className="w-4 h-4" />
													<div>
														<div className="font-medium">Editor</div>
														<div className="text-xs text-muted-foreground">
															Editar conteúdo
														</div>
													</div>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
										{inviteRole === "viewer"
											? "🔍 Poderá visualizar itinerários, acomodações e locais, mas não poderá fazer alterações"
											: "✏️ Poderá adicionar e editar eventos, acomodações, locais e colaborar ativamente no planejamento"}
									</div>
								</div>
							</div>
							<DialogFooter className="gap-2">
								<Button
									variant="outline"
									onClick={() => setIsInviteOpen(false)}
								>
									Cancelar
								</Button>
								<Button
									onClick={handleInvite}
									disabled={!inviteEmail || !inviteEmail.includes("@")}
								>
									<Mail className="w-4 h-4 mr-2" />
									Enviar Convite
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			{/* Members List */}
			<div className="space-y-6">
				{members.map((member) => (
					<Card key={member.id} className="transition-all hover:shadow-lg">
						<CardContent className="p-0">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 gap-6">
								<div className="flex items-center gap-4">
									<div className="relative">
										<Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
											<AvatarImage src={member.avatar} />
											<AvatarFallback className="bg-primary/10 text-primary font-semibold">
												{member.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</AvatarFallback>
										</Avatar>
										{member.status === "pending" && (
											<div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-background rounded-full" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<h3 className="font-medium text-foreground">
												{member.name}
											</h3>
											{member.status === "pending" && (
												<Badge variant="secondary" className="text-xs">
													Pendente
												</Badge>
											)}
										</div>
										<p className="text-sm text-muted-foreground truncate">
											{member.email}
										</p>
										<p className="text-xs text-muted-foreground">
											{member.status === "active"
												? `Membro desde ${member.joinedAt.toLocaleDateString("pt-BR")}`
												: "Convite enviado"}
										</p>
									</div>
								</div>

								<div className="flex items-center gap-3 flex-shrink-0">
									<Badge
										variant={getRoleVariant(member.role)}
										className="gap-1"
									>
										{getRoleIcon(member.role)}
										{getRoleLabel(member.role)}
									</Badge>

									{member.role !== "owner" && (
										<Button
											variant="outline"
											size="sm"
											className="flex items-center gap-1"
										>
											<Settings className="w-4 h-4" />
											<span className="hidden sm:inline">Gerenciar</span>
										</Button>
									)}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Permissions Guide */}
			<Card className="border-2 border-dashed">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<Shield className="w-5 h-5" />
						Como Funcionam as Permissões
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6 md:grid-cols-3">
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center border">
									<Crown className="w-4 h-4" />
								</div>
								<span className="font-semibold text-foreground">
									Proprietário
								</span>
							</div>
							<div className="pl-11 space-y-2">
								<p className="text-sm text-muted-foreground">
									Controle total da viagem:
								</p>
								<ul className="text-xs text-muted-foreground space-y-1">
									<li>• Gerenciar todos os membros</li>
									<li>• Excluir a viagem</li>
									<li>• Alterar configurações</li>
									<li>• Todas as permissões de editor</li>
								</ul>
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center border">
									<Shield className="w-4 h-4" />
								</div>
								<span className="font-semibold text-foreground">Editor</span>
							</div>
							<div className="pl-11 space-y-2">
								<p className="text-sm text-muted-foreground">
									Pode colaborar ativamente:
								</p>
								<ul className="text-xs text-muted-foreground space-y-1">
									<li>• Adicionar/editar eventos</li>
									<li>• Gerenciar acomodações</li>
									<li>• Adicionar locais</li>
									<li>• Todas as permissões de visualizador</li>
								</ul>
							</div>
						</div>

						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center border">
									<Eye className="w-4 h-4" />
								</div>
								<span className="font-semibold text-foreground">
									Visualizador
								</span>
							</div>
							<div className="pl-11 space-y-2">
								<p className="text-sm text-muted-foreground">
									Acesso somente leitura:
								</p>
								<ul className="text-xs text-muted-foreground space-y-1">
									<li>• Ver itinerário completo</li>
									<li>• Acessar informações de acomodações</li>
									<li>• Visualizar locais e mapas</li>
									<li>• Não pode fazer alterações</li>
								</ul>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
