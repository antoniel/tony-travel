import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InsertAccommodationSchema } from "@/lib/db/schema";
import { orpc } from "@/orpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

const formSchema = InsertAccommodationSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	travelId: true,
});

type FormData = z.infer<typeof formSchema>;

interface AccommodationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	travelId: string;
}

export function AccommodationModal({
	open,
	onOpenChange,
	travelId,
}: AccommodationModalProps) {
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			type: "hotel",
			startDate: new Date(),
			endDate: new Date(),
			address: "",
			rating: undefined,
			price: undefined,
			currency: "BRL",
		},
	});

	const createAccommodationMutation = useMutation(
		orpc.accommodationRoutes.createAccommodation.mutationOptions({
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const onSubmit = async (data: FormData) => {
		setIsSubmitting(true);

		try {
			const result = await createAccommodationMutation.mutateAsync({
				accommodation: data,
				travelId,
			});

			if (result.validationError) {
				toast.error(result.validationError);
				return;
			}

			if (result.conflictingAccommodation) {
				toast.error(
					`Existe conflito com a acomodação "${result.conflictingAccommodation.name}"`,
				);
				return;
			}

			if (result.id) {
				toast.success("Acomodação criada com sucesso!");
				form.reset();
				onOpenChange(false);

				// Invalidate queries to refresh the data
				await queryClient.invalidateQueries({
					queryKey: orpc.accommodationRoutes.getAccommodationsByTravel.queryKey(
						{
							input: { travelId },
						},
					),
				});
			}
		} catch (error) {
			console.error("Error creating accommodation:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const accommodationTypes = [
		{ value: "hotel", label: "Hotel" },
		{ value: "hostel", label: "Hostel" },
		{ value: "airbnb", label: "Airbnb" },
		{ value: "resort", label: "Resort" },
		{ value: "other", label: "Outro" },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>Adicionar Acomodação</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Nome da Acomodação</FormLabel>
									<FormControl>
										<Input
											placeholder="Ex: Hotel Copacabana Palace"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="type"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tipo</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Selecione o tipo" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{accommodationTypes.map((type) => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="startDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Check-in</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
												value={
													field.value instanceof Date
														? field.value.toISOString().split("T")[0]
														: field.value
												}
												onChange={(e) =>
													field.onChange(new Date(e.target.value))
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="endDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Check-out</FormLabel>
										<FormControl>
											<Input
												type="date"
												{...field}
												value={
													field.value instanceof Date
														? field.value.toISOString().split("T")[0]
														: field.value
												}
												onChange={(e) =>
													field.onChange(new Date(e.target.value))
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="address"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Endereço</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Endereço completo da acomodação"
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="price"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Preço</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												placeholder="0.00"
												{...field}
												value={field.value || ""}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? Number.parseFloat(e.target.value)
															: undefined,
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="currency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Moeda</FormLabel>
										<FormControl>
											<Input
												placeholder="BRL"
												{...field}
												value={field.value || ""}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="rating"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Avaliação (0-5)</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.1"
											min="0"
											max="5"
											placeholder="4.5"
											{...field}
											value={field.value || ""}
											onChange={(e) =>
												field.onChange(
													e.target.value
														? Number.parseFloat(e.target.value)
														: undefined,
												)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-3 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
								className="flex-1"
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isSubmitting} className="flex-1">
								{isSubmitting ? "Criando..." : "Criar Acomodação"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
