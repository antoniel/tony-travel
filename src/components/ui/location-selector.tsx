import { Check, X } from "lucide-react";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LocationOption {
	value: string;
	label: string;
}

interface LocationSelectorProps {
	label: string;
	placeholder: string;
	searchPlaceholder: string;
	selectedLabel: string;
	icon: React.ReactNode;
	options: LocationOption[];
	selected: LocationOption[];
	onSelectionChange: (selected: LocationOption[]) => void;
	multiple?: boolean;
	searchValue: string;
	onSearchChange: (value: string) => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
}

export function LocationSelector({
	label,
	placeholder,
	searchPlaceholder,
	selectedLabel,
	icon,
	options,
	selected,
	onSelectionChange,
	multiple = true,
	searchValue,
	onSearchChange,
	isOpen,
	onOpenChange,
	className,
}: LocationSelectorProps) {
	const filteredOptions = options.filter((option) =>
		option.label.toLowerCase().includes(searchValue.toLowerCase()),
	);

	const handleOptionClick = (option: LocationOption) => {
		const isSelected = selected.some((s) => s.value === option.value);

		if (isSelected) {
			onSelectionChange(selected.filter((s) => s.value !== option.value));
		} else {
			if (multiple) {
				onSelectionChange([...selected, option]);
			} else {
				onSelectionChange([option]);
				onOpenChange(false);
			}
		}
	};

	const removeSelected = (option: LocationOption) => {
		onSelectionChange(selected.filter((s) => s.value !== option.value));
	};

	return (
		<div className={cn("space-y-3", className)}>
			<Label className="text-base font-medium">{label}</Label>
			<Popover open={isOpen} onOpenChange={onOpenChange}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="h-12 w-full justify-start text-left font-normal text-base"
					>
						<div className="mr-3 h-4 w-4">{icon}</div>
						{selected.length > 0 ? (
							<span className="truncate">
								{selected.map((s) => s.label).join(", ")}
								{selected.length > 1 && ` (+${selected.length - 1})`}
							</span>
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-80 p-0" align="start">
					<div className="p-4 space-y-4">
						{/* Search */}
						<Input
							placeholder={searchPlaceholder}
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
							className="w-full"
						/>

						{/* Selected Items */}
						{selected.length > 0 && multiple && (
							<div className="space-y-2">
								<div className="text-sm font-medium">{selectedLabel}:</div>
								<div className="flex flex-wrap gap-2">
									{selected.map((option) => (
										<Badge
											key={option.value}
											variant="secondary"
											className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
											onClick={() => removeSelected(option)}
										>
											{option.label}
											<X className="ml-1 h-3 w-3" />
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* Options List */}
						<div className="max-h-64 overflow-y-auto">
							{filteredOptions.length === 0 ? (
								<div className="text-center py-6 text-muted-foreground">
									Nenhum item encontrado
								</div>
							) : (
								filteredOptions.map((option) => {
									const isSelected = selected.some(
										(s) => s.value === option.value,
									);

									return (
										<div
											key={option.value}
											className={`group p-3 hover:bg-accent cursor-pointer rounded-md flex items-center justify-between ${
												isSelected ? "bg-accent text-accent-foreground" : ""
											}`}
											onClick={() => handleOptionClick(option)}
											onKeyUp={(e) => {
												if (e.key === "Enter") {
													handleOptionClick(option);
												}
											}}
										>
											<div className="flex items-center gap-3">
												<div className={`h-4 w-4 ${isSelected ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"}`}>
													{icon}
												</div>
												<span className={`${isSelected ? "text-accent-foreground" : "group-hover:text-accent-foreground"}`}>{option.label}</span>
											</div>
											{isSelected && <Check className="h-4 w-4 text-primary" />}
										</div>
									);
								})
							)}
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
