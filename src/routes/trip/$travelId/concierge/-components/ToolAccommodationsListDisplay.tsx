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
import * as m from "@/paraglide/messages";

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
						{report.message ?? m["concierge.tools.accommodation.list_error_fallback"]()}
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
						{m["concierge.tools.accommodation.list_empty"]()}
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full max-w-md mx-auto my-4">
			<CardHeader>
				<CardTitle className="text-lg">
					{m["concierge.tools.accommodation.list_title"]()}
				</CardTitle>
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
								{m["concierge.tools.accommodation_create.label_period"]()}:{" "}
								{formatDateRange(acc.checkIn, acc.checkOut)}
							</span>
							<span className="text-muted-foreground">
								{m["concierge.tools.accommodation_create.label_address"]()}:{" "}
								{acc.address}
							</span>
							<span className="text-muted-foreground">
								{m["concierge.tools.accommodation_create.label_estimated_value"]()}:{" "}
								{formatCurrencyBRL(acc.price)}
							</span>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
