import * as m from "@/paraglide/messages";
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
				<DialogTitle className="text-left">
					{m["event.create_new"]()}
				</DialogTitle>
			</DialogHeader>
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
					{/* Basic Info */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="title">{m["event.title"]()}</Label>
								<Input
									id="title"
									value={newEvent.title}
									onChange={(e) =>
										onEventChange((prev) => ({
											...prev,
											title: e.target.value,
										}))
									}
									placeholder={m["calendar.event_title"]()}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="type">{m["event.type"]()}</Label>
								<Select
									value={newEvent.type}
									onValueChange={(value: AppEvent["type"]) =>
										onEventChange((prev) => ({ ...prev, type: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder={m["event.select_type"]()} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="travel">
											{m["event.type_transport"]()}
										</SelectItem>
										<SelectItem value="food">
											{m["event.type_food"]()}
										</SelectItem>
										<SelectItem value="activity">
											{m["event.type_activity"]()}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="location">{m["event.location"]()}</Label>
							<Input
								id="location"
								value={newEvent.location}
								onChange={(e) =>
									onEventChange((prev) => ({
										...prev,
										location: e.target.value,
									}))
								}
								placeholder={m["event.location_placeholder"]()}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cost">{m["event.price_optional"]()}</Label>
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
							<Label htmlFor="description">
								{m["event.description_optional"]()}
							</Label>
							<Textarea
								id="description"
								value={newEvent.description}
								onChange={(e) =>
									onEventChange((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder={m["event.description_placeholder"]()}
								rows={3}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="link">{m["event.link_optional"]()}</Label>
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
								placeholder={m["event.link_placeholder"]()}
							/>
						</div>
					</div>

					{/* Date & Time */}
					<div className="space-y-4">
						<h3 className="text-sm font-medium">
							{m["event.date_and_time"]()}
						</h3>
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
									<Label htmlFor="time-from">{m["event.start_time"]()}</Label>
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
									<Label htmlFor="time-to">{m["event.end_time"]()}</Label>
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
							{m["common.cancel"]()}
						</Button>
						<Button
							onClick={onCreate}
							disabled={!newEvent.title.trim()}
							className="w-full sm:w-auto"
						>
							{m["event.create"]()}
						</Button>
					</div>
				</div>
			</div>
		</ResponsiveModal>
	);
}
