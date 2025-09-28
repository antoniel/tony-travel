import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatCurrencyBRL } from "@/lib/currency";
import type { MyConciergeTools } from "@/orpc/modules/concierge/concierge.ai";
import type { InferUITools } from "ai";

import { formatDateRange, getAccommodationTypeLabel } from "./accommodation-utils";

interface ToolAccommodationsListDisplayProps {
	report: InferUITools<MyConciergeTools>["getAccomodations"]["output"];
}

export function ToolAccommodationsListDisplay({
	report,
}: ToolAccommodationsListDisplayProps) {
	if (!report.success) {
		return (
			<Card className="w-full max-w-md mx-auto my-4">
				<CardContent>
					<p className="text-sm text-destructive">
						{report.message ?? "Erro ao buscar acomodações"}
					</p>
				</CardContent>
			</Card>
		);
	}

	if (report.count === 0) {
		return (
			<Card className="w-full max-w-md mx-auto my-4">
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Nenhuma acomodação cadastrada para esta viagem ainda.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<CardTitle className="text-lg">Acomodações encontradas</CardTitle>
				<CardDescription>{report.message}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 text-sm">
				{report.accommodations.map((acc) => (
					<div
						key={acc.id}
						className="rounded-lg border border-border/60 bg-muted/5 p-3"
					>
						<div className="flex items-center justify-between gap-4">
							<span className="font-medium">{acc.name}</span>
							<Badge variant="secondary">
								{getAccommodationTypeLabel(acc.type)}
							</Badge>
						</div>
						<div className="mt-2 grid gap-1">
							<span className="text-muted-foreground">
								Período: {formatDateRange(acc.checkIn, acc.checkOut)}
							</span>
							<span className="text-muted-foreground">
								Endereço: {acc.address}
							</span>
							<span className="text-muted-foreground">
								Preço estimado: {formatCurrencyBRL(acc.price)}
							</span>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
