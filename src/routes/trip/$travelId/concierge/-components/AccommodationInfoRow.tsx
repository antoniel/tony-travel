import type { ReactNode } from "react";

interface AccommodationInfoRowProps {
	label: string;
	children: ReactNode;
}

export function AccommodationInfoRow({ label, children }: AccommodationInfoRowProps) {
	return (
		<div className="flex flex-col">
			<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</span>
			<span>{children}</span>
		</div>
	);
}
