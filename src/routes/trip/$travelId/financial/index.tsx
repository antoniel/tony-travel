import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	formatCurrencyBRL,
	formatNumberPtBR,
	maskCurrencyInputPtBR,
} from "@/lib/currency";
import { orpc } from "@/orpc/client";
import type { FinancialSummary } from "@/orpc/modules/financial/financial.model";
import * as m from "@/paraglide/messages";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	BarChart3,
	Calculator,
	ChevronDown,
	ChevronRight,
	DollarSign,
	Home,
	MapPin,
	Plane,
	TrendingUp,
	Wallet,
} from "lucide-react";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

export const Route = createFileRoute("/trip/$travelId/financial/")({
	component: () => (
		<Suspense fallback={<FinancialPageSkeleton />}>
			<FinancialPage />
		</Suspense>
	),
});

const BudgetUpdateSchema = z.object({
	budget: z.number().min(0, "O orçamento deve ser maior que zero"),
});

type BudgetUpdateFormData = z.infer<typeof BudgetUpdateSchema>;

type BudgetViewMode = "perPerson" | "group";

function BudgetSection({
	financialData,
	canWrite,
	onBudgetUpdate,
	isUpdating,
}: {
	financialData: FinancialSummary;
	canWrite: boolean;
	onBudgetUpdate: (budget: number) => void;
	isUpdating: boolean;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [viewMode, setViewMode] = useState<BudgetViewMode>("perPerson");

	const form = useForm<BudgetUpdateFormData>({
		resolver: zodResolver(BudgetUpdateSchema),
		defaultValues: {
			budget: financialData.budgetPerPerson ?? 0,
		},
	})

	const onSubmit = (data: BudgetUpdateFormData) => {
		onBudgetUpdate(data.budget);
		setIsEditing(false);
	}

	const handleModeChange = (value: string) => {
		if (!value) return;
		setViewMode(value as BudgetViewMode);
	}

	const getUtilizationColor = (percentage: number) => {
		if (percentage <= 50) return "bg-green-500";
		if (percentage <= 80) return "bg-yellow-500";
		return "bg-red-500";
	}

	const getUtilizationStatus = (percentage: number) => {
		if (percentage <= 50) return { text: m["financial.status_excellent"](), color: "text-green-600" };
		if (percentage <= 80) return { text: m["financial.status_attention"](), color: "text-yellow-600" };
		return { text: m["financial.status_limit"](), color: "text-red-600" };
	}

	const currentSummary =
		viewMode === "perPerson" ? financialData.perPerson : financialData.group;
	const hasBudget = currentSummary.budget !== null && currentSummary.budget > 0;
	const budgetUtilization = hasBudget
		? (currentSummary.budgetUtilization ?? 0)
		: 0
	const status = getUtilizationStatus(budgetUtilization);

	const participantsLabel =
		financialData.participantsCount === 0
			? m["financial.no_travelers"]()
			: financialData.participantsCount === 1
				? m["financial.traveler_count"]({ count: "1" })
				: m["financial.traveler_count_plural"]({ count: financialData.participantsCount.toString() });
	const baseBudgetLabel =
		financialData.budgetPerPerson !== null
			? m["financial.base_budget"]({ amount: formatCurrencyBRL(financialData.budgetPerPerson) })
			: null
	const modeLabel =
		viewMode === "perPerson" ? m["financial.per_person_mode"]() : m["financial.per_group_mode"]();

	return (
		<Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-primary/10">
			<CardHeader>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
							<Wallet className="w-6 h-6 text-primary" />
						</div>
						<div>
							<CardTitle className="text-xl">{m["financial.budget_control"]()}</CardTitle>
							<p className="text-sm text-muted-foreground">
								{m["financial.budget_control_description"]()}
							</p>
						</div>
					</div>
					<div className="flex flex-col items-stretch gap-2 sm:items-end">
						<div className="flex items-center gap-2 self-end text-xs text-muted-foreground">
							<ToggleGroup
								type="single"
								value={viewMode}
								onValueChange={handleModeChange}
								variant="outline"
								size="sm"
							>
								<ToggleGroupItem
									value="perPerson"
									aria-label={m["financial.per_person"]()}
								>
									{m["financial.per_person"]()}
								</ToggleGroupItem>
								<ToggleGroupItem
									value="group"
									aria-label={m["financial.per_group"]()}
								>
									{m["financial.per_group"]()}
								</ToggleGroupItem>
							</ToggleGroup>
						</div>
						{canWrite && !isEditing && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsEditing(true)}
								className="gap-2 self-end"
							>
								<Calculator className="w-4 h-4" />
								{m["financial.edit_budget"]()}
							</Button>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{isEditing ? (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="budget"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m["financial.budget_per_person"]()}</FormLabel>
										<FormControl>
											<div className="relative">
												<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
													R$
												</span>
												<Input
													type="text"
													inputMode="numeric"
													placeholder="0,00"
													className="pl-8"
													value={
														typeof field.value === "number"
															? formatNumberPtBR(field.value)
															: ""
													}
													onChange={(e) => {
														const { numeric } = maskCurrencyInputPtBR(
															e.target.value,
														)
														field.onChange(numeric ?? 0)
													}}
												/>
											</div>
										</FormControl>
										<FormDescription>
											{m["financial.budget_description"]()}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => setIsEditing(false)}
								>
									{m["common.cancel"]()}
								</Button>
								<Button type="submit" size="sm" disabled={isUpdating}>
									{m["common.save"]()}
								</Button>
							</div>
						</form>
					</Form>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div className="text-center p-4 bg-card rounded-lg border">
								<div className="text-2xl font-bold text-primary">
									{formatCurrencyBRL(currentSummary.budget ?? 0)}
								</div>
								<div className="text-sm text-muted-foreground">
									{m["financial.total_budget"]()}
								</div>
							</div>
							<div className="text-center p-4 bg-card rounded-lg border">
								<div className="text-2xl font-bold">
									{formatCurrencyBRL(currentSummary.totalExpenses)}
								</div>
								<div className="text-sm text-muted-foreground">{m["financial.current_expenses"]()}</div>
							</div>
							<div className="text-center p-4 bg-card rounded-lg border">
								<div className="text-2xl font-bold">
									{formatCurrencyBRL(currentSummary.remainingBudget ?? 0)}
								</div>
								<div className="text-sm text-muted-foreground">{m["financial.remaining"]()}</div>
							</div>
						</div>

						{hasBudget && (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										{m["financial.budget_utilization"]()}
									</span>
									<div className="flex items-center gap-2">
										<Badge
											variant="secondary"
											className={`${status.color} border-current/20`}
										>
											{status.text}
										</Badge>
										<span className="text-sm font-medium">
											{budgetUtilization.toFixed(1)}%
										</span>
									</div>
								</div>
								<Progress
									value={Math.min(budgetUtilization, 100)}
									className="h-3"
									indicatorClassName={getUtilizationColor(budgetUtilization)}
								/>
							</div>
						)}

						<div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
							<span>{participantsLabel}</span>
							<div className="flex flex-col items-start gap-1 text-foreground sm:flex-row sm:items-center sm:gap-2">
								<span className="font-medium">{modeLabel}</span>
								{baseBudgetLabel && (
									<span className="text-xs text-muted-foreground sm:text-right">
										Base: {baseBudgetLabel}
									</span>
								)}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function ExpenseBreakdown({
	financialData,
}: { financialData: FinancialSummary }) {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(amount);
	}

	const getCategoryTitle = (category: string) => {
		switch (category) {
			case "passagens":
				return m["financial.category_flights"]();
			case "acomodacoes":
				return m["financial.category_accommodations"]();
			case "atracoes":
				return m["financial.category_attractions"]();
			default:
				return category;
		}
	}

	const getCategoryIcon = (category: string) => {
		switch (category) {
			case "passagens":
				return Plane;
			case "acomodacoes":
				return Home
			case "atracoes":
				return MapPin;
			default:
				return MapPin;
		}
	}

	const getCategoryStyle = (category: string) => {
		switch (category) {
			case "passagens":
				return {
					color: "text-blue-600",
					bg: "bg-blue-50",
					border: "border-blue-200",
				}
			case "acomodacoes":
				return {
					color: "text-green-600",
					bg: "bg-green-50",
					border: "border-green-200",
				}
			case "atracoes":
				return {
					color: "text-purple-600",
					bg: "bg-purple-50",
					border: "border-purple-200",
				}
			default:
				return {
					color: "text-muted-foreground",
					bg: "bg-muted/50",
					border: "border-muted",
				}
		}
	}

	const expenseContext =
		financialData.participantsCount === 0
			? m["financial.expense_context_none"]()
			: financialData.participantsCount === 1
				? m["financial.expense_context_one"]()
				: m["financial.expense_context_many"]({ count: financialData.participantsCount.toString() });

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<BarChart3 className="w-6 h-6 text-primary" />
				<div>
					<h2 className="text-xl font-semibold">{m["financial.expense_summary"]()}</h2>
					<div className="space-y-1">
						<p className="text-sm text-muted-foreground">
							{m["financial.expense_summary_description"]()}
						</p>
						<p className="text-xs text-muted-foreground">
							{m["financial.expense_summary_note"]({ context: expenseContext })}
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				{financialData.categories.map((category) => {
					const Icon = getCategoryIcon(category.category);
					const style = getCategoryStyle(category.category);
					return (
						<Card
							key={category.category}
							className={`border-2 ${style.border} ${style.bg}/30 hover:shadow-lg transition-all duration-200`}
						>
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div
											className={`w-10 h-10 ${style.bg} rounded-full flex items-center justify-center`}
										>
											<Icon className={`w-5 h-5 ${style.color}`} />
										</div>
										<div>
											<CardTitle className="text-base">
												{getCategoryTitle(category.category)}
											</CardTitle>
											<p className="text-xs text-muted-foreground">
												{m["financial.percentage_of_total"]({ percentage: category.percentage.toFixed(1) })}
											</p>
										</div>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{formatCurrency(category.total)}
								</div>
							</CardContent>
						</Card>
					)
				})}
			</div>
		</div>
	)
}

function AttractionsTree({
	financialData,
}: { financialData: FinancialSummary }) {
	const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

	const toggleExpanded = (itemId: string) => {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(itemId)) {
			newExpanded.delete(itemId);
		} else {
			newExpanded.add(itemId);
		}
		setExpandedItems(newExpanded);
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("pt-BR", {
			style: "currency",
			currency: "BRL",
		}).format(amount);
	}

	const attractionsCategory = financialData.categories.find(
		(cat) => cat.category === "atracoes",
	)

	if (!attractionsCategory || attractionsCategory.items.length === 0) {
		return (
			<Card className="border-2 border-dashed">
				<CardContent className="text-center py-12">
					<div className="w-16 h-16 mx-auto bg-muted/30 rounded-full flex items-center justify-center mb-4">
						<MapPin className="w-8 h-8 text-muted-foreground" />
					</div>
					<h3 className="text-lg font-semibold mb-2">
						{m["financial.no_attractions"]()}
					</h3>
					<p className="text-muted-foreground">
						{m["financial.no_attractions_description"]()}
					</p>
				</CardContent>
			</Card>
		)
	}

	const attractionsContext =
		financialData.participantsCount === 0
			? m["financial.expense_context_none"]()
			: financialData.participantsCount === 1
				? m["financial.expense_context_one"]()
				: m["financial.expense_context_many"]({ count: financialData.participantsCount.toString() });

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<TrendingUp className="w-6 h-6 text-primary" />
				<div>
					<h2 className="text-xl font-semibold">{m["financial.attractions_detail"]()}</h2>
					<p className="text-sm text-muted-foreground">
						{m["financial.attractions_detail_description"]()}
					</p>
					<p className="text-xs text-muted-foreground">
						{m["financial.expense_summary_note"]({ context: attractionsContext })}
					</p>
				</div>
			</div>

			<div className="space-y-3">
				{attractionsCategory.items
					.filter((item) => !item.parentId) // Show only parent items
					.map((activity) => {
						const isExpanded = expandedItems.has(activity.id);
						const childItems = attractionsCategory.items.filter(
							(item) => item.parentId === activity.id,
						)
						const hasDependencies = childItems.length > 0;

						return (
							<Card key={activity.id} className="overflow-hidden">
								<CardHeader
									className={`pb-3 ${hasDependencies ? "cursor-pointer hover:bg-muted/30" : ""}`}
									onClick={
										hasDependencies
											? () => toggleExpanded(activity.id)
											: undefined
									}
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											{hasDependencies && (
												<div className="text-muted-foreground">
													{isExpanded ? (
														<ChevronDown className="w-4 h-4" />
													) : (
														<ChevronRight className="w-4 h-4" />
													)}
												</div>
											)}
											<div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
												<MapPin className="w-5 h-5 text-primary" />
											</div>
											<div className="flex-1">
												<CardTitle className="text-base">
													{activity.name}
												</CardTitle>
												<div className="flex items-center gap-2 mt-1">
													<Badge variant="outline" className="text-xs">
														{m["financial.percentage_of_total"]({
															percentage: ((activity.cost / attractionsCategory.total) * 100).toFixed(1)
														})}
													</Badge>
													{hasDependencies && (
														<Badge variant="secondary" className="text-xs">
															{childItems.length === 1
																? m["financial.related_items"]({ count: "1" })
																: m["financial.related_items_plural"]({ count: childItems.length.toString() })}
														</Badge>
													)}
												</div>
											</div>
										</div>
										<div className="text-right">
											<div className="text-lg font-bold">
												{formatCurrency(activity.cost)}
											</div>
										</div>
									</div>
								</CardHeader>

								{isExpanded && hasDependencies && (
									<CardContent className="pt-0">
										<div className="pl-7 space-y-2 border-l-2 border-primary/20">
											{childItems.map((dependency) => (
												<div
													key={dependency.id}
													className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
												>
													<div className="flex items-center gap-3">
														<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
															<MapPin className="w-4 h-4 text-muted-foreground" />
														</div>
														<span className="text-sm font-medium">
															{dependency.name}
														</span>
													</div>
													<span className="text-sm font-medium">
														{formatCurrency(dependency.cost)}
													</span>
												</div>
											))}
										</div>
									</CardContent>
								)}
							</Card>
						)
					})}
			</div>
		</div>
	)
}

function FinancialPage() {
	const { travelId } = Route.useParams();
	const queryClient = useQueryClient();

	// Fetch travel data for permissions check
	const { data: travel } = useSuspenseQuery(
		orpc.travelRoutes.getTravel.queryOptions({ input: { id: travelId } }),
	)

	// Fetch financial summary from the new endpoint
	const financialQuery = useSuspenseQuery({
		...orpc.financialRoutes.getFinancialSummary.queryOptions({
			input: { travelId },
		}),
	})

	// Budget update mutation
	const updateBudgetMutation = useMutation(
		orpc.financialRoutes.updateTravelBudget.mutationOptions(),
	)

	if (financialQuery.error) {
		return (
			<div className="space-y-8">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
						<DollarSign className="w-8 h-8 text-primary" />
						{m["financial.page_title"]()}
					</h1>
					<p className="text-lg text-muted-foreground">
						{m["financial.page_description"]()}
					</p>
				</div>
				<Card className="border-destructive">
					<CardContent className="text-center py-12">
						<div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
							<DollarSign className="w-8 h-8 text-destructive" />
						</div>
						<h3 className="text-lg font-semibold mb-2">
							{m["financial.error_loading"]()}
						</h3>
						<p className="text-muted-foreground mb-4">
							{m["financial.error_loading_description"]()}
						</p>
						<Button onClick={() => financialQuery.refetch()}>
							{m["financial.try_again"]()}
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const financialData = financialQuery.data;

	if (!financialData) {
		return null;
	}

	// Only owners can edit the budget
	const canWrite = travel?.userMembership?.role === "owner";

	const handleBudgetUpdate = async (budget: number) => {
		try {
			await updateBudgetMutation.mutateAsync({
				travelId,
				budget,
			})

			// Invalidate financial query to refetch updated data
			queryClient.invalidateQueries(
				orpc.financialRoutes.getFinancialSummary.queryOptions({
					input: { travelId },
				}),
			)

			toast.success(m["financial.budget_updated"]());
		} catch (error) {
			toast.error(m["financial.budget_update_error"](), {
				description: error instanceof Error ? error.message : undefined,
			})
		}
	}

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					<DollarSign className="w-8 h-8 text-primary" />
					{m["financial.page_title"]()}
				</h1>
				<p className="text-lg text-muted-foreground">
					{m["financial.page_description"]()}
				</p>
			</div>

			<BudgetSection
				financialData={financialData}
				canWrite={canWrite}
				onBudgetUpdate={handleBudgetUpdate}
				isUpdating={updateBudgetMutation.isPending}
			/>

			<Separator />

			<ExpenseBreakdown financialData={financialData} />

			<Separator />

			<AttractionsTree financialData={financialData} />
		</div>
	)
}

function FinancialPageSkeleton() {
	return (
		<div className="space-y-10">
			<div className="space-y-2">
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-96" />
			</div>
			<div className="space-y-6">
				<div className="border rounded-xl p-6 space-y-6">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div className="flex items-center gap-3">
							<Skeleton className="h-12 w-12 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-5 w-40" />
								<Skeleton className="h-4 w-56" />
							</div>
						</div>
						<div className="flex flex-col items-end gap-3">
							<Skeleton className="h-9 w-40 rounded-full" />
							<Skeleton className="h-9 w-32 rounded-md" />
						</div>
					</div>
					<div className="space-y-4">
						<Skeleton className="h-3 w-3/4" />
						<Skeleton className="h-3 w-2/3" />
						<div className="space-y-2">
							{Array.from({ length: 4 }).map((_, index) => (
								<Skeleton
									key={`budget-row-${
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										index
									}`}
									className="h-5 w-full"
								/>
							))}
						</div>
						<Skeleton className="h-2 w-full" />
					</div>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, index) => (
						<div
							key={`financial-metric-${
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								index
							}`}
							className="border rounded-xl p-4 space-y-3"
						>
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-2 w-full" />
						</div>
					))}
				</div>
				<div className="border rounded-xl p-6 space-y-4">
					<Skeleton className="h-5 w-64" />
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, index) => (
							<Skeleton
								key={`expense-segment-${
									// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
									index
								}`}
								className="h-24 rounded-lg"
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
