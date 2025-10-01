import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrencyBRL } from "@/lib/currency";
import type { AppEvent } from "@/lib/types";
import { ExternalLink, Pencil } from "lucide-react";
import ActivityImage from "../../../../components/ActivityImage";
import { ResponsiveModal } from "../../../../components/ui/ResponsiveModal";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Separator } from "../../../../components/ui/separator";

export function EventDetailsModal({
	event,
	isOpen,
	onClose,
	onEditEvent,
	canWrite,
}: EventDetailsModalProps) {
	if (!event) return null;

	const startDate = ensureDate(event.startDate);
	const endDate = ensureDate(event.endDate);
	const createdAt = event.createdAt ? ensureDate(event.createdAt) : null;
	const updatedAt = event.updatedAt ? ensureDate(event.updatedAt) : null;
	const typeMeta = EVENT_TYPE_META[event.type];

	return (
		<ResponsiveModal
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			contentClassName="gap-0"
		>
			<DialogHeader className="border-b px-6 py-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-2">
						<DialogTitle className="text-left text-xl font-semibold">
							{event.title}
						</DialogTitle>
						<div className="flex flex-wrap items-center gap-3">
							<span className="flex items-center gap-2 text-sm text-muted-foreground">
								<span
									className="h-2 w-2 rounded-full"
									style={{ backgroundColor: typeMeta.color }}
								/>
								{typeMeta.label}
							</span>
							<Badge variant="secondary" className="text-xs">
								{typeMeta.description}
							</Badge>
						</div>
					</div>
					{canWrite && onEditEvent ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onEditEvent(event)}
							className="flex items-center gap-2"
						>
							<Pencil className="h-3.5 w-3.5" />
							Editar evento
						</Button>
					) : null}
				</div>
			</DialogHeader>
			<ScrollArea className="flex-1 px-6 py-5">
				<div className="space-y-6">
					{event.type === "activity" && (
						<ActivityImage
							imageUrl={event.imageUrl ?? undefined}
							title={event.title}
							location={event.location ?? null}
							className="h-auto w-full"
						/>
					)}

					<section className="space-y-3">
						<h3 className="text-sm font-medium text-muted-foreground">
							Horário
						</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">
									Início
								</p>
								<p className="text-sm font-medium">
									{DATE_TIME_FORMATTER.format(startDate)}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">
									Fim
								</p>
								<p className="text-sm font-medium">
									{DATE_TIME_FORMATTER.format(endDate)}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">
									Duração
								</p>
								<p className="text-sm font-medium">
									{formatDuration(startDate, endDate)}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">
									Dia
								</p>
								<p className="text-sm font-medium">
									{DATE_FORMATTER.format(startDate)}
								</p>
							</div>
						</div>
					</section>

					<Separator />

					<section className="space-y-3">
						<h3 className="text-sm font-medium text-muted-foreground">
							Custos
						</h3>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="rounded-lg border bg-muted/40 p-3">
								<p className="text-sm font-semibold">
									{renderCurrency(event.cost ?? null)}
								</p>
							</div>
						</div>
					</section>

					{event.location ? (
						<section className="space-y-2">
							<h3 className="text-sm font-medium text-muted-foreground">
								Local
							</h3>
							<p className="text-sm leading-relaxed">{event.location}</p>
						</section>
					) : null}

					{event.description ? (
						<section className="space-y-2">
							<h3 className="text-sm font-medium text-muted-foreground">
								Descrição
							</h3>
							<p className="text-sm leading-relaxed text-foreground">
								{event.description}
							</p>
						</section>
					) : null}

					{event.link ? (
						<section className="space-y-2">
							<h3 className="text-sm font-medium text-muted-foreground">
								Link
							</h3>
							<a
								href={event.link}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
							>
								<ExternalLink className="h-3.5 w-3.5" />
								<span className="line-clamp-1 break-all">{event.link}</span>
							</a>
						</section>
					) : null}

					<section className="space-y-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Registros
						</h3>
						<div className="grid gap-3 sm:grid-cols-2">
							{createdAt ? (
								<div>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Criado em
									</p>
									<p className="text-sm font-medium">
										{DATE_TIME_FORMATTER.format(createdAt)}
									</p>
								</div>
							) : null}
							{updatedAt ? (
								<div>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Atualizado em
									</p>
									<p className="text-sm font-medium">
										{DATE_TIME_FORMATTER.format(updatedAt)}
									</p>
								</div>
							) : null}
							{event.parentEventId ? (
								<div className="sm:col-span-2">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Evento relacionado
									</p>
									<p className="text-sm font-medium break-all">
										{event.parentEventId}
									</p>
								</div>
							) : null}
						</div>
					</section>
				</div>
			</ScrollArea>
		</ResponsiveModal>
	);
}
const EVENT_TYPE_META: Record<
	AppEvent["type"],
	{ label: string; color: string; description: string }
> = {
	travel: {
		label: "Viagem",
		color: "var(--chart-1)",
		description: "Deslocamentos e logística de viagem",
	},
	food: {
		label: "Comida",
		color: "var(--chart-3)",
		description: "Reservas e experiências gastronômicas",
	},
	activity: {
		label: "Atividade",
		color: "var(--chart-2)",
		description: "Passeios, eventos culturais e entretenimento",
	},
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "medium",
	timeStyle: "short",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "full",
});

const ensureDate = (value: Date | string) =>
	value instanceof Date ? value : new Date(value);

const formatDuration = (start: Date, end: Date) => {
	const milliseconds = Math.max(0, end.getTime() - start.getTime());
	const totalMinutes = Math.floor(milliseconds / (1000 * 60));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	if (totalMinutes === 0) return "Todo o dia";
	if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h`;
	return `${minutes}m`;
};

const renderCurrency = (value: number | null) => {
	if (value === null || Number.isNaN(value)) {
		return "Não informado";
	}
	return formatCurrencyBRL(value);
};

interface EventDetailsModalProps {
	event: AppEvent | null;
	isOpen: boolean;
	onClose: () => void;
	onEditEvent?: (event: AppEvent) => void;
	canWrite?: boolean;
}
