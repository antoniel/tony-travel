import type { AppEvent, ImageMetadata } from "@/lib/types";
import { client, orpc } from "@/orpc/client";
import {
	type QueryClient,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

interface UseActivityImageProps {
	event: AppEvent;
	autoFetch?: boolean;
}

interface UseActivityImageReturn {
	imageUrl?: string;
	imageMetadata?: ImageMetadata;
	isLoading: boolean;
	isError: boolean;
	error?: Error;
	refetch: () => void;
}

export function useActivityImage({
	event,
}: UseActivityImageProps): UseActivityImageReturn {
	const queryClient = useQueryClient();

	// Only fetch image if it's an activity and doesn't have an image yet
	const shouldFetch = event.type === "activity" && !event.imageUrl;

	orpc.fetchActivityImage.queryOptions;
	const {
		data: imageData,
		isLoading,
		isError,
		error,
		refetch: refetchImage,
	} = useQuery({
		queryKey: useActivityImage.queryKey(event),
		queryFn: async () => {
			if (event.imageUrl) {
				return {
					success: true,
					imageUrl: event.imageUrl,
					metadata: event.imageMetadata,
				};
			}

			// Fetch new image from Pixabay
			const result = await client.fetchActivityImage({
				title: event.title,
				location: event.location,
			});

			// If successful, update the event in the database
			if (result.success && result.imageUrl && result.metadata) {
				try {
					await client.updateEventImage({
						eventId: event.id,
						imageUrl: result.imageUrl,
						metadata: result.metadata,
					});

					// Invalidate travel queries to refresh the data
					queryClient.invalidateQueries({
						queryKey: ["travel"],
					});
				} catch (updateError) {
					console.error(
						"Failed to update event image in database:",
						updateError,
					);
					// Continue anyway, at least show the image in the UI
				}
			}

			return result;
		},
		enabled: shouldFetch && !event.imageUrl,
	});

	// Update the event data when we have new image data from the query
	const finalImageUrl = imageData?.success
		? imageData.imageUrl
		: event.imageUrl;
	const finalImageMetadata = imageData?.success
		? imageData.metadata
		: event.imageMetadata;

	return {
		imageUrl: finalImageUrl || undefined,
		imageMetadata: finalImageMetadata || undefined,
		isLoading: shouldFetch && isLoading,
		isError,
		error: error as Error,
		refetch,
	};
}
useActivityImage.queryKey = (e: AppEvent) => ["activity-image", e.id];
useActivityImage.refetch = (queryClient: QueryClient, params: AppEvent) => {
	queryClient.refetchQueries({
		queryKey: useActivityImage.queryKey(params),
	});
};
