import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ScrollArea } from "./scroll-area";

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
					<ScrollArea className={contentWrapperClassName}>
						{children}
					</ScrollArea>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

			<ScrollArea
				className={cn("h-full overflow-auto", contentWrapperClassName)}
			>
				<DialogContent
					showCloseButton={showCloseButton}
					className={cn(
						"flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden border bg-background p-0 shadow-2xl",
						desktopClassName,
					)}
				>
					{children}
				</DialogContent>
			</ScrollArea>
		</Dialog>
	);
}
