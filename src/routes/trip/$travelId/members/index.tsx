import { TravelMemberOnly } from "@/components/guards/TravelMemberOnly";
import { TravelOwnerOnly } from "@/components/guards/TravelOwnerOnly";
import { InviteLinkManager } from "@/components/members/InviteLinkManager";
import { MemberCard } from "@/components/members/MemberCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTravelMembership } from "@/hooks/useTravelMembership";
import { useUser } from "@/hooks/useUser";
import { orpc } from "@/orpc/client";
import * as m from "@/paraglide/messages";
import type { TravelMemberWithUser } from "@/orpc/modules/invitation/invitation.model";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Shield, Users } from "lucide-react";
import { Suspense } from "react";

export const Route = createFileRoute("/trip/$travelId/members/")({
	component: () => (
		<Suspense fallback={<MembersPageSkeleton />}>
			<MembersPage />
		</Suspense>
	),
});

function MembersPage() {
	const { travelId } = Route.useParams();
	const { user } = useUser();
	const travelMembershipQuery = useTravelMembership(travelId);

	if (travelMembershipQuery.isLoading) {
		return <MembersPageSkeleton />;
	}

	return (
		<TravelMemberOnly travelId={travelId}>
			<MembersContent
				travelId={travelId}
				currentUserRole={travelMembershipQuery.data?.userMembership?.role}
				currentUserId={user?.id}
			/>
		</TravelMemberOnly>
	)
}

function MembersContent({
	travelId,
	currentUserRole,
	currentUserId,
}: {
	travelId: string;
	currentUserRole?: "owner" | "member";
	currentUserId?: string;
}) {
	const { data: members } = useSuspenseQuery(
		orpc.invitationRoutes.getTravelMembers.queryOptions({
			input: { travelId },
		}),
	)

	const activeMembersCount = members.length;
	const ownerCount = members.filter((m) => m.role === "owner").length;
	const regularMembersCount = members.filter((m) => m.role === "member").length;

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
				currentUserRole={currentUserRole}
				currentUserId={currentUserId}
			/>
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
				<h1 className="text-3xl font-bold tracking-tight">{m["members.page_title"]()}</h1>
				<p className="text-lg text-muted-foreground">
					{m["members.page_description"]()}
				</p>
			</div>

			<div className="flex gap-4 text-sm">
				<Badge variant="secondary" className="gap-2">
					<Users className="w-4 h-4" />
					<span>
						{activeMembersCount === 1 ? m["members.members_count"]({ count: "1" }) : m["members.members_count_plural"]({ count: activeMembersCount.toString() })}
					</span>
				</Badge>
				{ownerCount > 0 && (
					<Badge variant="default" className="gap-2">
						<Crown className="w-4 h-4" />
						<span>
							{ownerCount === 1 ? m["members.owners_count"]({ count: "1" }) : m["members.owners_count_plural"]({ count: ownerCount.toString() })}
						</span>
					</Badge>
				)}
				{regularMembersCount > 0 && (
					<Badge variant="outline" className="gap-2">
						<Shield className="w-4 h-4" />
						<span>
							{regularMembersCount === 1 ? m["members.members_count"]({ count: "1" }) : m["members.members_count_plural"]({ count: regularMembersCount.toString() })}
						</span>
					</Badge>
				)}
			</div>
		</div>
	)
}

function MembersPageSkeleton() {
	return (
		<div className="space-y-10">
			<div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
				<div className="space-y-3">
					<Skeleton className="h-8 w-60" />
					<Skeleton className="h-4 w-72" />
				</div>
				<div className="flex gap-3">
					<Skeleton className="h-7 w-32 rounded-full" />
					<Skeleton className="h-7 w-28 rounded-full" />
					<Skeleton className="h-7 w-28 rounded-full" />
				</div>
			</div>
			<div className="border rounded-xl p-6 space-y-4">
				<Skeleton className="h-5 w-40" />
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="flex flex-col sm:flex-row gap-3">
					<Skeleton className="h-11 w-full sm:w-48 rounded-md" />
					<Skeleton className="h-11 w-full sm:w-40 rounded-md" />
				</div>
			</div>
			<div className="space-y-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={`member-skeleton-${
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							index
						}`}
						className="border rounded-xl p-4 flex items-center gap-4"
					>
						<Skeleton className="h-12 w-12 rounded-full" />
						<div className="flex-1 space-y-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-32" />
						</div>
						<Skeleton className="h-9 w-24 rounded-md" />
					</div>
				))}
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
					<h3 className="font-medium mb-2">{m["members.no_members"]()}</h3>
					<p className="text-sm text-muted-foreground text-center">
						{m["members.no_members_description"]()}
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3">
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
