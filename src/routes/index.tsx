import TripSelection from "@/components/TripSelection";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
    const featured = useQuery(
        orpc.travelRoutes.featuredTravels.queryOptions({ input: { limit: 3 } }),
    );

    return <TripSelection predefinedTrips={featured.data ?? []} />;
}
