import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetTrigger,
} from "@/components/ui/sheet";
import type { ReactNode } from "react";

interface ResponsiveModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
	trigger?: ReactNode;
	contentClassName?: string;
	desktopClassName?: string;
	mobileClassName?: string;
	showCloseButton?: boolean;
}

export function ResponsiveModal({
	open,
	onOpenChange,
	children,
	trigger,
	contentClassName,
	desktopClassName,
	mobileClassName,
	showCloseButton = true,
}: ResponsiveModalProps) {
	const isMobile = useIsMobile();
	const contentWrapperClassName = cn("flex h-full flex-col", contentClassName);

	if (isMobile) {
		return (
			<Sheet open={open} onOpenChange={onOpenChange}>
				{trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
				<SheetContent
					side="bottom"
					className={cn(
						"h-[80vh] max-h-[80vh] gap-0 rounded-t-2xl border-none bg-background p-0 shadow-2xl",
						mobileClassName,
					)}
				>
					<div className={contentWrapperClassName}>{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent
				showCloseButton={showCloseButton}
				className={cn(
					"max-h-[85vh] w-full max-w-xl overflow-hidden border bg-background p-0 shadow-2xl",
					desktopClassName,
				)}
			>
				<div className={contentWrapperClassName}>{children}</div>
			</DialogContent>
		</Dialog>
	);
}
