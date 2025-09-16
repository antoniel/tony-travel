import { ConciergeAgent } from "@/components/concierge-agent";
import { Badge } from "@/components/ui/badge";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ConciergeBell } from "lucide-react";

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
		<div className="flex min-h-[calc(100svh-18rem)] flex-col space-y-6">
			<header className="space-y-2">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<ConciergeBell className="h-4 w-4" />
					<span>Concierge da Viagem</span>
					<Badge variant="secondary">Beta</Badge>
				</div>
				<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
					Seu assistente para organizar a viagem
					{travel?.name ? `: ${travel.name}` : ""}
				</h1>
				<p className="hidden lg:block text-muted-foreground max-w-3xl">
					O Concierge ajuda você a manipular informações da sua viagem por meio
					de conversas naturais. Peça para adicionar voos, criar eventos,
					ajustar datas e horários — tudo em um só lugar.
				</p>
			</header>

			<div className="flex flex-1 min-h-0">
				<div className="w-full  flex flex-1 min-h-0 flex-col">
					<ConciergeAgent />
				</div>
			</div>
		</div>
	);
}
