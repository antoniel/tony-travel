import type { AppEvent } from "@/lib/types";
import { maskCurrencyInputPtBR, formatNumberPtBR } from "@/lib/currency";
import { Clock2Icon } from "lucide-react";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface EventCreateModalProps {
	isOpen: boolean;
	newEvent: {
		title: string;
		startDate: Date;
		endDate: Date;
		type: AppEvent["type"];
		location: string;
		cost: number | null;
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
		}>
	>;
	children?: React.ReactNode;
	travelStartDate?: Date;
	travelEndDate?: Date;
}

export function EventCreateModal({
	isOpen,
	newEvent,
	onClose,
	onCreate,
	onEventChange,
	children,
	travelStartDate,
	travelEndDate,
}: EventCreateModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			{!!children && <DialogTrigger asChild>{children}</DialogTrigger>}
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Create New Event</DialogTitle>
				</DialogHeader>
				<div className="space-y-6">
					{/* Basic Info */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="title">Title</Label>
								<Input
									id="title"
									value={newEvent.title}
									onChange={(e) =>
										onEventChange((prev) => ({
											...prev,
											title: e.target.value,
										}))
									}
									placeholder="Event title"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="type">Type</Label>
								<Select
									value={newEvent.type}
									onValueChange={(value: AppEvent["type"]) =>
										onEventChange((prev) => ({ ...prev, type: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select event type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="travel">Travel</SelectItem>
										<SelectItem value="food">Food</SelectItem>
										<SelectItem value="activity">Activity</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="location">Location</Label>
							<Input
								id="location"
								value={newEvent.location}
								onChange={(e) =>
									onEventChange((prev) => ({
										...prev,
										location: e.target.value,
									}))
								}
								placeholder="Event location (optional)"
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
					</div>

					{/* Date & Time */}
					<div className="space-y-4">
						<h3 className="text-sm font-medium">Date & Time</h3>
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
									<Label htmlFor="time-from">Start Time</Label>
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
									<Label htmlFor="time-to">End Time</Label>
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

				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onCreate} disabled={!newEvent.title.trim()}>
						Create Event
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
