import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { useMemo } from "react";

export function useDestinationsSearch(query: string, limit = 10) {
	// Debounce the search query by 300ms
	const debouncedQuery = useDebounce(query, 300);

	// Create query options using orpc
	const queryOptions = useMemo(
		() =>
			orpc.travelRoutes.searchDestinations.queryOptions({
				input: {
					query: debouncedQuery,
					limit,
				},
			}),
		[debouncedQuery, limit],
	);

	return useQuery({
		...queryOptions,
		// Don't fetch if query is empty
		enabled: debouncedQuery.length > 0,
		// Keep previous data while loading new results
		placeholderData: (previousData) => previousData,
		// Cache results for 5 minutes
		staleTime: 5 * 60 * 1000,
		// Keep in cache for 10 minutes
		gcTime: 10 * 60 * 1000,
	});
}
