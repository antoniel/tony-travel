import { ResponsiveModal } from "@/components/ui/ResponsiveModal";
import { formatNumberPtBR, maskCurrencyInputPtBR } from "@/lib/currency";
import type { AppEvent } from "@/lib/types";
import { Clock2Icon } from "lucide-react";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

interface EventCreateModalProps {
	isOpen: boolean;
	newEvent: {
		title: string;
		startDate: Date;
		endDate: Date;
		type: AppEvent["type"];
		location: string;
		cost: number | null;
		description: string;
		link: string;
	};
	onClose: () => void;
	onCreate: () => void;
	onEventChange: React.Dispatch<
		React.SetStateAction<{
			title: string;
			startDate: Date;
			endDate: Date;
			type: AppEvent["type"];
			location: string;
			cost: number | null;
			description: string;
			link: string;
		}>
	>;
	travelStartDate?: Date;
	travelEndDate?: Date;
}

export function EventCreateModal({
	isOpen,
	newEvent,
	onClose,
	onCreate,
	onEventChange,
	travelStartDate,
	travelEndDate,
}: EventCreateModalProps) {
	return (
		<ResponsiveModal
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			desktopClassName="sm:max-w-[500px]"
			contentClassName="gap-0"
		>
			<DialogHeader className="border-b px-6 py-4">
				<DialogTitle className="text-left">Criar novo evento</DialogTitle>
			</DialogHeader>
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
					{/* Basic Info */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="title">Título</Label>
								<Input
									id="title"
									value={newEvent.title}
									onChange={(e) =>
										onEventChange((prev) => ({
											...prev,
											title: e.target.value,
										}))
									}
									placeholder="Título do evento"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="type">Tipo</Label>
								<Select
									value={newEvent.type}
									onValueChange={(value: AppEvent["type"]) =>
										onEventChange((prev) => ({ ...prev, type: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecione o tipo de evento" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="travel">Transporte</SelectItem>
										<SelectItem value="food">Alimentação</SelectItem>
										<SelectItem value="activity">Atividade</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="location">Local</Label>
							<Input
								id="location"
								value={newEvent.location}
								onChange={(e) =>
									onEventChange((prev) => ({
										...prev,
										location: e.target.value,
									}))
								}
								placeholder="Local do evento (opcional)"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cost">Preço (R$) — opcional</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									R$
								</span>
								<Input
									id="cost"
									type="text"
									inputMode="numeric"
									className="pl-8"
									value={
										typeof newEvent.cost === "number"
											? formatNumberPtBR(newEvent.cost)
											: ""
									}
									placeholder="0,00"
									onChange={(e) => {
										const { numeric } = maskCurrencyInputPtBR(e.target.value);
										onEventChange((prev) => ({ ...prev, cost: numeric }));
									}}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Descrição — opcional</Label>
							<Textarea
								id="description"
								value={newEvent.description}
								onChange={(e) =>
									onEventChange((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Adicione detalhes sobre este evento..."
								rows={3}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="link">Link — opcional</Label>
							<Input
								id="link"
								type="url"
								value={newEvent.link}
								onChange={(e) =>
									onEventChange((prev) => ({
										...prev,
										link: e.target.value,
									}))
								}
								placeholder="https://exemplo.com"
							/>
						</div>
					</div>

					{/* Date & Time */}
					<div className="space-y-4">
						<h3 className="text-sm font-medium">Data e horário</h3>
						<div className="space-y-4">
							<Calendar
								mode="single"
								selected={newEvent.startDate}
								month={newEvent.startDate}
								onSelect={(date) => {
									if (date) {
										const currentTime = newEvent.startDate;
										date.setHours(
											currentTime.getHours(),
											currentTime.getMinutes(),
										);
										onEventChange((prev) => ({
											...prev,
											startDate: date,
											// Adjust end date to same day if different
											endDate:
												prev.endDate.toDateString() !== date.toDateString()
													? new Date(date.getTime() + 60 * 60 * 1000)
													: prev.endDate,
										}));
									}
								}}
								disabled={(date) => {
									const minDate = travelStartDate || new Date();
									const maxDate = travelEndDate;

									minDate.setHours(0, 0, 0, 0);
									date.setHours(0, 0, 0, 0);

									if (maxDate) {
										const maxDateCopy = new Date(maxDate);
										maxDateCopy.setHours(23, 59, 59, 999);
										return date < minDate || date > maxDateCopy;
									}

									return date < minDate;
								}}
								className="rounded-md border w-full justify-center"
							/>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="time-from">Horário de início</Label>
									<div className="relative">
										<Clock2Icon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 select-none" />
										<Input
											id="time-from"
											type="time"
											step="60"
											value={newEvent.startDate.toTimeString().slice(0, 5)}
											onChange={(e) => {
												const [hours, minutes] = e.target.value
													.split(":")
													.map(Number);
												const newStartDate = new Date(newEvent.startDate);
												newStartDate.setHours(hours, minutes);
												onEventChange((prev) => ({
													...prev,
													startDate: newStartDate,
													// Automatically adjust end date if it's earlier than start date
													endDate:
														prev.endDate <= newStartDate
															? new Date(
																	newStartDate.getTime() + 60 * 60 * 1000,
																) // Add 1 hour
															: prev.endDate,
												}));
											}}
											className="pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="time-to">Horário de término</Label>
									<div className="relative">
										<Clock2Icon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 select-none" />
										<Input
											id="time-to"
											type="time"
											step="60"
											value={newEvent.endDate.toTimeString().slice(0, 5)}
											onChange={(e) => {
												const [hours, minutes] = e.target.value
													.split(":")
													.map(Number);
												const newEndDate = new Date(newEvent.startDate);
												newEndDate.setHours(hours, minutes);
												// Only update if end time is after start time
												if (newEndDate > newEvent.startDate) {
													onEventChange((prev) => ({
														...prev,
														endDate: newEndDate,
													}));
												}
											}}
											className="pl-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="border-t bg-background px-6 py-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
						<Button
							variant="outline"
							onClick={onClose}
							className="w-full sm:w-auto"
						>
							Cancelar
						</Button>
						<Button
							onClick={onCreate}
							disabled={!newEvent.title.trim()}
							className="w-full sm:w-auto"
						>
							Criar evento
						</Button>
					</div>
				</div>
			</div>
		</ResponsiveModal>
	);
}
