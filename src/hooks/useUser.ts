import { useSession } from "@/lib/auth-client";

export function useUser() {
	const { data: session, isPending } = useSession();

	return {
		user: session?.user || null,
		isAuthenticated: !!session?.user,
		isLoading: isPending,
		session,
	};
}
