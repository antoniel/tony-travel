import type { AppEvent } from "@/lib/types";
import { maskCurrencyInputPtBR, formatNumberPtBR } from "@/lib/currency";
import { Clock2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface EventEditModalProps {
	isOpen: boolean;
	event: AppEvent | null;
	onClose: () => void;
	onSave: (updatedEvent: Partial<AppEvent>) => void;
	travelStartDate?: Date;
	travelEndDate?: Date;
}

export function EventEditModal({
	isOpen,
	event,
	onClose,
	onSave,
	travelStartDate,
	travelEndDate,
}: EventEditModalProps) {
	if (!event) return null;

	// Initialize form state with current event values
	const [editEvent, setEditEvent] = useState({
		title: event.title,
		startDate: event.startDate,
		endDate: event.endDate,
		type: event.type,
		location: event.location || "",
		cost: event.cost || event.estimatedCost || null,
		description: event.description || "",
		link: event.link || "",
	});

	const handleSave = () => {
		// Only send changed fields
		const changes: Partial<AppEvent> = {};
		
		if (editEvent.title !== event.title) changes.title = editEvent.title;
		if (editEvent.startDate.getTime() !== event.startDate.getTime()) changes.startDate = editEvent.startDate;
		if (editEvent.endDate.getTime() !== event.endDate.getTime()) changes.endDate = editEvent.endDate;
		if (editEvent.type !== event.type) changes.type = editEvent.type;
		if (editEvent.location !== (event.location || "")) changes.location = editEvent.location;
		if (editEvent.cost !== (event.cost || event.estimatedCost || null)) changes.cost = editEvent.cost;
		if (editEvent.description !== (event.description || "")) changes.description = editEvent.description;
		if (editEvent.link !== (event.link || "")) changes.link = editEvent.link;

		onSave(changes);
	};

	const handleClose = () => {
		// Reset form to original values when closing
		setEditEvent({
			title: event.title,
			startDate: event.startDate,
			endDate: event.endDate,
			type: event.type,
			location: event.location || "",
			cost: event.cost || event.estimatedCost || null,
			description: event.description || "",
			link: event.link || "",
		});
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit Event</DialogTitle>
				</DialogHeader>
				<div className="space-y-6">
					{/* Basic Info */}
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="edit-title">Title</Label>
								<Input
									id="edit-title"
									value={editEvent.title}
									onChange={(e) =>
										setEditEvent((prev) => ({
											...prev,
											title: e.target.value,
										}))
									}
									placeholder="Event title"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="edit-type">Type</Label>
								<Select
									value={editEvent.type}
									onValueChange={(value: AppEvent["type"]) =>
										setEditEvent((prev) => ({ ...prev, type: value }))
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
							<Label htmlFor="edit-location">Location</Label>
							<Input
								id="edit-location"
								value={editEvent.location}
								onChange={(e) =>
									setEditEvent((prev) => ({
										...prev,
										location: e.target.value,
									}))
								}
								placeholder="Event location (optional)"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="edit-cost">Preço (R$) — opcional</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									R$
								</span>
								<Input
									id="edit-cost"
									type="text"
									inputMode="numeric"
									className="pl-8"
									value={
										typeof editEvent.cost === "number"
											? formatNumberPtBR(editEvent.cost)
											: ""
									}
									placeholder="0,00"
									onChange={(e) => {
										const { numeric } = maskCurrencyInputPtBR(e.target.value);
										setEditEvent((prev) => ({ ...prev, cost: numeric }));
									}}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-description">Descrição — opcional</Label>
							<Textarea
								id="edit-description"
								value={editEvent.description}
								onChange={(e) =>
									setEditEvent((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
								placeholder="Adicione detalhes sobre este evento..."
								rows={3}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-link">Link — opcional</Label>
							<Input
								id="edit-link"
								type="url"
								value={editEvent.link}
								onChange={(e) =>
									setEditEvent((prev) => ({
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
						<h3 className="text-sm font-medium">Date & Time</h3>
						<div className="space-y-4">
							<Calendar
								mode="single"
								selected={editEvent.startDate}
								month={editEvent.startDate}
								onSelect={(date) => {
									if (date) {
										const currentTime = editEvent.startDate;
										date.setHours(
											currentTime.getHours(),
											currentTime.getMinutes(),
										);
										setEditEvent((prev) => ({
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
									<Label htmlFor="edit-time-from">Start Time</Label>
									<div className="relative">
										<Clock2Icon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 select-none" />
										<Input
											id="edit-time-from"
											type="time"
											step="60"
											value={editEvent.startDate.toTimeString().slice(0, 5)}
											onChange={(e) => {
												const [hours, minutes] = e.target.value
													.split(":")
													.map(Number);
												const newStartDate = new Date(editEvent.startDate);
												newStartDate.setHours(hours, minutes);
												setEditEvent((prev) => ({
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
									<Label htmlFor="edit-time-to">End Time</Label>
									<div className="relative">
										<Clock2Icon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 select-none" />
										<Input
											id="edit-time-to"
											type="time"
											step="60"
											value={editEvent.endDate.toTimeString().slice(0, 5)}
											onChange={(e) => {
												const [hours, minutes] = e.target.value
													.split(":")
													.map(Number);
												const newEndDate = new Date(editEvent.startDate);
												newEndDate.setHours(hours, minutes);
												// Only update if end time is after start time
												if (newEndDate > editEvent.startDate) {
													setEditEvent((prev) => ({
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
					<Button variant="outline" onClick={handleClose}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!editEvent.title.trim()}>
						Save Changes
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}