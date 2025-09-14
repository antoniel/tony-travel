import { useUser } from "@/hooks/useUser";

export function GuardLoggedIn(p: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	const travelMembershipQuery = useUser();
	if (
		travelMembershipQuery.isLoading ||
		!travelMembershipQuery.isAuthenticated
	) {
		return p.fallback || null;
	}

	return <>{p.children}</>;
}
