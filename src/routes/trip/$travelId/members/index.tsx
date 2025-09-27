import { TravelMemberOnly } from "@/components/guards/TravelMemberOnly";
import { TravelOwnerOnly } from "@/components/guards/TravelOwnerOnly";
import { InviteLinkManager } from "@/components/members/InviteLinkManager";
import { MemberCard } from "@/components/members/MemberCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useTravelMembership } from "@/hooks/useTravelMembership";
import { useUser } from "@/hooks/useUser";
import { orpc } from "@/orpc/client";
import type { TravelMemberWithUser } from "@/orpc/modules/invitation/invitation.model";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Loader2, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/trip/$travelId/members/")({
	component: MembersPage,
});

function MembersPage() {
	const { travelId } = Route.useParams();
	const { user } = useUser();
	const travelMembershipQuery = useTravelMembership(travelId);

	const membersQuery = useQuery({
		...orpc.invitationRoutes.getTravelMembers.queryOptions({
			input: { travelId },
		}),
		enabled: !!travelMembershipQuery.data?.userMembership,
	})

	const members = membersQuery.data || [];
	const isLoading = membersQuery.isLoading;

	const activeMembersCount = members.length;
	const ownerCount = members.filter((m) => m.role === "owner").length;
	const regularMembersCount = members.filter((m) => m.role === "member").length;

	if (isLoading) {
		return <MembersLoadingState />;
	}

	return (
		<TravelMemberOnly travelId={travelId}>
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
			</div>
		</TravelMemberOnly>
	)
}

function MembersLoadingState() {
	return (
		<div className="flex items-center justify-center py-12">
			<div className="flex flex-col items-center gap-3">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
				<p className="text-muted-foreground">Carregando membros...</p>
			</div>
		</div>
	)
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
	)
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
		)
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
	)
}
