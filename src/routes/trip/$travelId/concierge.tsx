import { ConciergeAgent } from "@/components/concierge-agent";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, ConciergeBell, Plane, Plus } from "lucide-react";

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
		<div className="space-y-8">
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
				<p className="text-muted-foreground max-w-3xl">
					O Concierge ajuda você a manipular informações da sua viagem por meio
					de conversas naturais. Peça para adicionar voos, criar eventos,
					ajustar datas e horários — tudo em um só lugar.
				</p>
			</header>

			<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Plane className="h-4 w-4" /> Adicionar voos
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground space-y-2">
						<p>
							Exemplo: "Adicionar voo de GRU para JFK saindo 10/11 às 22:30 e
							chegando 11/11 às 07:10".
						</p>
						<p>O Concierge cria o voo e notifica os membros.</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<CalendarClock className="h-4 w-4" /> Eventos e horários
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground space-y-2">
						<p>
							Exemplo: "Criar jantar em Manhattan em 12/11 das 19:00 às 21:00"
							ou "Passeio no Central Park no dia 13/11 à tarde".
						</p>
						<p>O Concierge sugere horários e resolve conflitos.</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<Plus className="h-4 w-4" /> E muito mais
						</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-muted-foreground space-y-2">
						<p>
							Ajustar datas da viagem, convidar membros, estimar custos e
							organizar o roteiro — tudo por chat.
						</p>
						<p>Comece com um pedido simples para ver como funciona.</p>
					</CardContent>
				</Card>
			</section>

			<ConciergeAgent />
		</div>
	);
}
