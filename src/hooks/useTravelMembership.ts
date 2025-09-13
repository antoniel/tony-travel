import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "./useUser";

export function useTravelMembership(travelId: string) {
	const { isAuthenticated } = useUser();

	return useQuery({
		...orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
		enabled: isAuthenticated && !!travelId,
	});
}
