import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
	PendingIssue,
	PendingIssuesSummary,
} from "@/orpc/modules/concierge/concierge.model";
import { Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	CalendarClock,
	Home,
	Loader2,
	Plane,
} from "lucide-react";

interface PendingIssuesPanelProps {
	summary?: PendingIssuesSummary;
	isLoading: boolean;
}

const ICON_LOOKUP: Record<PendingIssue["type"], typeof Plane> = {
	flight: Plane,
	accommodation: Home,
	event: CalendarClock,
};

const SEVERITY_STYLES: Record<PendingIssue["severity"], string> = {
	critical: "border-destructive/40 bg-destructive/5",
	advisory: "border-amber-200/60 bg-amber-50/80",
};

const SEVERITY_BADGE: Record<PendingIssue["severity"], string> = {
	critical: "Pendente",
	advisory: "Sugestão",
};

export function PendingIssuesPanel({
	summary,
	isLoading,
}: PendingIssuesPanelProps) {
	if (isLoading) {
		return (
			<div className="mb-4">
				<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					<span>Verificando pendências da viagem...</span>
				</div>
				<div className="mt-2 grid gap-2">
					<div className="h-20 animate-pulse rounded-lg bg-muted/30" />
				</div>
			</div>
		);
	}

	if (!summary?.hasIssues) {
		return null;
	}

	return (
		<section aria-label="Pendências do concierge" className="mb-5 space-y-3">
			<header className="space-y-1">
				<div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
					<AlertTriangle className="h-3.5 w-3.5" />
					<span>Pendências identificadas</span>
				</div>
				<p className="text-sm text-muted-foreground">
					O concierge separou os pontos que precisam de atenção para seguir com
					a viagem.
				</p>
			</header>
			<div className="space-y-3">
				{summary.issues.map((issue) => (
					<PendingIssueCard key={issue.id} issue={issue} />
				))}
			</div>
		</section>
	);
}

function PendingIssueCard({ issue }: { issue: PendingIssue }) {
	const Icon = ICON_LOOKUP[issue.type];
	const severityClass = SEVERITY_STYLES[issue.severity];
	const badgeLabel = SEVERITY_BADGE[issue.severity];
	const hasTravelers = issue.affectedTravelers.length > 0;
	const namesPreview = issue.affectedTravelers
		.map((traveler) => traveler.name)
		.join(", ");
	const formatDate = (isoDate: string) =>
		new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "short",
		});

	return (
		<Card className={`border ${severityClass}`}>
			<CardContent className="flex flex-col gap-3 p-4">
				<div className="flex items-start gap-3">
					<div className="rounded-md bg-primary/10 p-2 text-primary">
						<Icon className="h-4 w-4" aria-hidden="true" />
					</div>
					<div className="flex-1 space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="text-sm font-semibold leading-tight">
								{issue.title}
							</h3>
							<Badge
								variant={
									issue.severity === "critical" ? "outline" : "secondary"
								}
								className="text-[10px] uppercase"
							>
								{badgeLabel}
							</Badge>
						</div>
						<p className="text-sm text-muted-foreground">{issue.description}</p>
						{hasTravelers ? (
							<p className="text-xs text-muted-foreground">
								Afeta: {namesPreview}
							</p>
						) : null}
						{issue.gapRanges.length > 0 ? (
							<ul className="text-xs text-muted-foreground">
								{issue.gapRanges.map((range) => (
									<li key={`${range.start}-${range.end}`}>
										Datas descobertas:{" "}
										{range.start === range.end
											? formatDate(range.start)
											: `${formatDate(range.start)} até ${formatDate(range.end)}`}
									</li>
								))}
							</ul>
						) : null}
					</div>
				</div>
				{issue.action ? (
					<div className="flex justify-end">
						<Button asChild size="sm" variant="outline">
							<Link
								to={issue.action.path}
								search={issue.action.params ?? undefined}
							>
								{issue.action.label}
							</Link>
						</Button>
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
