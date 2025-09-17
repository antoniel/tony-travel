import { ConciergeAgent } from "@/components/concierge-agent";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/trip/$travelId/concierge")({
	component: ConciergePage,
});

function ConciergePage() {
	const { travelId } = Route.useParams();
	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;

	return (
		<div className="flex h-[calc(100svh-18rem)] flex-col">
			<div className="flex flex-1 min-h-0">
				<div className="w-full flex flex-1 min-h-0 flex-col">
					<ConciergeAgent travelName={travel?.name ?? undefined} travelId={travelId} />
				</div>
			</div>
		</div>
	);
}
