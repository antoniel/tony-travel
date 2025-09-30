import TripWizard from "@/components/TripWizard";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CreateTripSearchSchema = z.object({
	destinations: z.string().optional(),
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
	people: z.string().optional(),
	budget: z.string().optional(),
	departureAirports: z.string().optional(),
});

export const Route = createFileRoute("/{-$locale}/create-trip")({
	validateSearch: CreateTripSearchSchema,
	component: CreateTripPage,
});

function CreateTripPage() {
	const search = Route.useSearch();

	// Parse the search params back to the expected format
	const initialData = {
		destinations: search.destinations ? JSON.parse(search.destinations) : [],
		dateRange:
			search.dateFrom && search.dateTo
				? {
						from: new Date(search.dateFrom),
						to: new Date(search.dateTo),
					}
				: null,
		people: search.people ? Number(search.people) : 2,
		budget: search.budget ? Number(search.budget) : 1500,
		departureAirports: search.departureAirports
			? JSON.parse(search.departureAirports)
			: [],
	}

	return <TripWizard initialData={initialData} />;
}
