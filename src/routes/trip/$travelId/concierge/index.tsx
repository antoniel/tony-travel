import { TravelMemberOnly } from "@/components/guards/TravelMemberOnly";
import { orpc } from "@/orpc/client";
import { ConciergeAgent } from "@/routes/trip/$travelId/concierge/-components/concierge-agent";
import { useConciergeChatContext } from "@/routes/trip/$travelId/concierge/-components/concierge-chat-context";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/trip/$travelId/concierge/")({
	component: ConciergePage,
});

function ConciergePage() {
	const { travelId } = Route.useParams();
	const { setFloatingOpen, setFullViewActive } = useConciergeChatContext();
	const travelQuery = useQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	);
	const travel = travelQuery.data;

	useEffect(() => {
		setFloatingOpen(false);
		setFullViewActive(true);
		return () => {
			setFullViewActive(false);
		};
	}, [setFloatingOpen, setFullViewActive]);

	return (
		<TravelMemberOnly travelId={travelId}>
			<div className="flex h-[calc(100svh-18rem)] flex-col">
				<div className="flex flex-1 min-h-0">
					<div className="w-full flex flex-1 min-h-0 flex-col">
						<ConciergeAgent
							travelName={travel?.name ?? undefined}
							travelId={travelId}
						/>
					</div>
				</div>
			</div>
		</TravelMemberOnly>
	);
}
