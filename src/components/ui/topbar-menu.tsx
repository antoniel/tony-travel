import type React from "react";
import { LogOutIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import { 
	DropdownMenu, 
	DropdownMenuContent, 
	DropdownMenuItem, 
	DropdownMenuLabel, 
	DropdownMenuSeparator, 
	DropdownMenuTrigger 
} from "./dropdown-menu";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { signIn, signOut } from "@/lib/auth-client";

export const TopbarMenu: React.FC = () => {
	const { user, isAuthenticated, isLoading } = useUser();

	const handleLogin = async () => {
		try {
			await signIn.social({
				provider: "google",
				callbackURL: window.location.href,
			});
		} catch (error) {
			console.error("Login error:", error);
		}
	};

	const handleLogout = async () => {
		try {
			await signOut({
				fetchOptions: {
					onSuccess: () => {
						window.location.reload();
					}
				}
			});
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	if (isLoading) {
		return (
			<div className="fixed top-4 right-4 z-50">
				<Button variant="outline" size="sm" disabled className="h-8">
					<div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
				</Button>
			</div>
		);
	}

	return (
		<div className="fixed top-4 right-4 z-50">
			{isAuthenticated && user ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"h-8 gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
								"shadow-lg border-border/50"
							)}
						>
							<Avatar className="size-6">
								<AvatarImage src={user.image || undefined} alt={user.name || undefined} />
								<AvatarFallback className="text-xs">
									{user.name?.charAt(0).toUpperCase() || "U"}
								</AvatarFallback>
							</Avatar>
							<span className="hidden sm:inline text-sm font-medium">
								{user.name}
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col space-y-1">
								<p className="text-sm font-medium leading-none">{user.name}</p>
								<p className="text-xs text-muted-foreground leading-none">
									{user.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout}>
							<LogOutIcon />
							Sair
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : (
				<Button
					size="sm"
					onClick={handleLogin}
					className={cn(
						"bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
						"shadow-lg border border-border/50 text-foreground hover:bg-accent"
					)}
					variant="outline"
				>
					<UserIcon />
					<span className="hidden sm:inline">Entrar</span>
				</Button>
			)}
		</div>
	);
};