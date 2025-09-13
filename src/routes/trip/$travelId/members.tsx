import { TravelOwnerOnly } from "@/components/guards/TravelOwnerOnly";
import { InviteLinkManager } from "@/components/members/InviteLinkManager";
import { MemberCard } from "@/components/members/MemberCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTravelMembership } from "@/hooks/useTravelMembership";
import { useUser } from "@/hooks/useUser";
import { orpc } from "@/orpc/client";
import type { TravelMemberWithUser } from "@/orpc/modules/invitation/invitation.model";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Loader2, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/trip/$travelId/members")({
	component: MembersPage,
});

function MembersPage() {
	const { travelId } = Route.useParams();
	const { user } = useUser();
	const travelMembershipQuery = useTravelMembership(travelId);

	const membersQuery = useQuery(
		orpc.invitationRoutes.getTravelMembers.queryOptions({
			input: { travelId },
		}),
	);

	const members = membersQuery.data || [];
	const isLoading = membersQuery.isLoading;

	const activeMembersCount = members.length;
	const ownerCount = members.filter((m) => m.role === "owner").length;
	const regularMembersCount = members.filter((m) => m.role === "member").length;

	if (isLoading) {
		return <MembersLoadingState />;
	}

	return (
		<div className="space-y-10">
			<MembersHeader
				activeMembersCount={activeMembersCount}
				ownerCount={ownerCount}
				regularMembersCount={regularMembersCount}
			/>

			<TravelOwnerOnly travelId={travelId} fallback={null}>
				<InviteLinkManager travelId={travelId} />
			</TravelOwnerOnly>

			<MembersList
				members={members}
				currentUserRole={travelMembershipQuery.data?.userMembership?.role}
				currentUserId={user?.id}
			/>

			<PermissionsGuide />
		</div>
	);
}

function MembersLoadingState() {
	return (
		<div className="flex items-center justify-center py-12">
			<div className="flex flex-col items-center gap-3">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
				<p className="text-muted-foreground">Carregando membros...</p>
			</div>
		</div>
	);
}

function MembersHeader({
	activeMembersCount,
	ownerCount,
	regularMembersCount,
}: {
	activeMembersCount: number;
	ownerCount: number;
	regularMembersCount: number;
}) {
	return (
		<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
			<div className="space-y-3">
				<h1 className="text-3xl font-bold tracking-tight">Membros da Viagem</h1>
				<p className="text-lg text-muted-foreground">
					Gerencie quem pode acessar e colaborar nesta viagem
				</p>
			</div>

			<div className="flex gap-4 text-sm">
				<Badge variant="secondary" className="gap-2">
					<Users className="w-4 h-4" />
					<span>
						{activeMembersCount} membro{activeMembersCount !== 1 ? "s" : ""}
					</span>
				</Badge>
				{ownerCount > 0 && (
					<Badge variant="default" className="gap-2">
						<Crown className="w-4 h-4" />
						<span>
							{ownerCount} proprietário{ownerCount !== 1 ? "s" : ""}
						</span>
					</Badge>
				)}
				{regularMembersCount > 0 && (
					<Badge variant="outline" className="gap-2">
						<Shield className="w-4 h-4" />
						<span>
							{regularMembersCount} membro{regularMembersCount !== 1 ? "s" : ""}
						</span>
					</Badge>
				)}
			</div>
		</div>
	);
}

function MembersList({
	members,
	currentUserRole,
	currentUserId,
}: {
	members: TravelMemberWithUser[];
	currentUserRole?: "owner" | "member";
	currentUserId?: string;
}) {
	if (members.length === 0) {
		return (
			<Card className="border-2 border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Users className="w-12 h-12 text-muted-foreground mb-4" />
					<h3 className="font-medium mb-2">Nenhum membro encontrado</h3>
					<p className="text-sm text-muted-foreground text-center">
						Esta viagem ainda não tem membros.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{members.map((member) => (
				<MemberCard
					key={member.id}
					member={member}
					currentUserRole={currentUserRole}
					currentUserId={currentUserId}
				/>
			))}
		</div>
	);
}

function PermissionsGuide() {
	return (
		<Card className="border-2 border-dashed">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Shield className="w-5 h-5" />
					Como Funcionam as Permissões
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6 md:grid-cols-2">
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
								<li>• Criar e gerenciar links de convite</li>
								<li>• Remover membros</li>
								<li>• Todas as permissões de membro</li>
							</ul>
						</div>
					</div>

					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center border">
								<Shield className="w-4 h-4" />
							</div>
							<span className="font-semibold text-foreground">Membro</span>
						</div>
						<div className="pl-11 space-y-2">
							<p className="text-sm text-muted-foreground">
								Pode colaborar ativamente:
							</p>
							<ul className="text-xs text-muted-foreground space-y-1">
								<li>• Ver todos os detalhes da viagem</li>
								<li>• Adicionar e editar eventos</li>
								<li>• Gerenciar acomodações e voos</li>
								<li>• Colaborar no planejamento</li>
							</ul>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
