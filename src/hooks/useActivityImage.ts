import type { AppEvent } from "@/lib/types";
import { orpc } from "@/orpc/client";
import { type QueryClient, useQuery } from "@tanstack/react-query";

interface UseActivityImageProps {
	event: AppEvent;
	enabled?: boolean;
}

export function useActivityImage({ event, enabled }: UseActivityImageProps) {
	const shouldFetch = event.type === "activity" && !event.imageUrl;
	return useQuery({
		...orpc.eventRoutes.fetchActivityImage.queryOptions({
			input: {
				eventId: event.id ?? "",
				title: event.title,
				location: event.location ?? undefined,
			},
		}),
		enabled: shouldFetch && enabled,
	});
}
useActivityImage.refetch = (queryClient: QueryClient, event: AppEvent) => {
	queryClient.refetchQueries({
		queryKey: orpc.eventRoutes.fetchActivityImage.queryKey({
			input: {
				eventId: event.id,
				title: event.title,
				location: event.location ?? undefined,
			},
		}),
	});
};
