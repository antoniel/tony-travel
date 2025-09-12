import TripSelection from "@/components/TripSelection";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const listTravels = useQuery(
		orpc.travelRoutes.listTravels.queryOptions({ input: {} }),
	);

	return <TripSelection predefinedTrips={listTravels.data ?? []} />;
}
