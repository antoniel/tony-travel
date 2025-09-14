import { useTravelMembership } from "@/hooks/useTravelMembership";

interface TravelOwnerOnlyProps {
	children: React.ReactNode;
	travelId: string;
	fallback?: React.ReactNode;
}

export function TravelOwnerOnly({
	children,
	travelId,
	fallback,
}: TravelOwnerOnlyProps) {
	const travelMembershipQuery = useTravelMembership(travelId);
	if (travelMembershipQuery.isLoading) {
		return fallback || null;
	}

	if (travelMembershipQuery.data?.userMembership?.role !== "owner") {
		return fallback;
	}

	return <>{children}</>;
}
