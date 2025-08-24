import TripSelection from "@/components/TripSelection";
import { colombiaTravel } from "@/data/colombia-travel";
import { peruTravel } from "@/data/peru-travel";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	// Mock predefined trips - in the future this will come from DB
	const predefinedTrips = [peruTravel, colombiaTravel];

	return <TripSelection predefinedTrips={predefinedTrips} />;
}
