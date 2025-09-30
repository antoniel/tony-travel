import { useUser } from "@/hooks/useUser";
import { signIn, signOut } from "@/lib/auth-client";
import { orpc } from "@/orpc/client";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Home, LogOutIcon, UserIcon } from "lucide-react";
import type React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";
import { LanguageSwitcher } from "./language-switcher";

export const TopbarMenu: React.FC = () => {
	const { user, isAuthenticated, isLoading } = useUser();
	const router = useRouter();
	const pathname = router.state.location.pathname;

	// Check if we're in a trip route
	const travelIdMatch = pathname.match(/\/trip\/([^/]+)/);
	const travelId = travelIdMatch?.[1];

	// Fetch travel data if we're in a trip route
	const travelQuery = useQuery({
		...orpc.travelRoutes.getTravel.queryOptions({
			input: { id: travelId || "" },
		}),
		enabled: !!travelId,
	});
	const travel = travelQuery.data;

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
					},
				},
			});
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	const getBreadcrumbs = () => {
		const segments = pathname.split("/").filter(Boolean);
		const breadcrumbs: { label: string; path: string; current?: boolean }[] =
			[];

		// Home
		breadcrumbs.push({ label: "Minhas Viagens", path: "/" });

		if (segments[0] === "trip" && travelId) {
			// Trip overview
			const travelName = travel?.name || "Viagem";
			breadcrumbs.push({
				label: travelName,
				path: `/trip/${travelId}`,
				current:
					pathname === `/trip/${travelId}` || pathname === `/trip/${travelId}/`,
			});

			// Trip section
			if (segments[2]) {
				const sectionLabels: Record<string, string> = {
					flights: "Voos",
					accommodations: "Acomodações",
					locations: "Locais",
					members: "Membros",
				};
				const sectionLabel = sectionLabels[segments[2]] || segments[2];
				breadcrumbs.push({
					label: sectionLabel,
					path: pathname,
					current: true,
				});
			} else {
				// We're on the main trip page (itinerary)
				breadcrumbs[breadcrumbs.length - 1].current = true;
			}
		} else if (segments[0] === "create-trip") {
			breadcrumbs.push({
				label: "Nova Viagem",
				path: "/create-trip",
				current: true,
			});
		} else if (segments[0] === "invite") {
			breadcrumbs.push({ label: "Convite", path: pathname, current: true });
		} else if (pathname === "/") {
			breadcrumbs[0].current = true;
		}

		return breadcrumbs;
	};

	const breadcrumbs = getBreadcrumbs();

	if (isLoading) {
		return (
			<header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center gap-4">
							<div className="h-6 w-32 bg-muted animate-pulse rounded" />
						</div>
						<div className="h-8 w-20 bg-muted animate-pulse rounded" />
					</div>
				</div>
			</header>
		);
	}

	return (
		<header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60  sticky top-0 z-50">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-16">
					{/* Left section - Logo/Brand and Navigation */}
					<div className="flex items-center gap-4">
						{/* Brand/Home link */}
						<Link
							to="/"
							className="flex items-center hover:opacity-80 transition-opacity"
						>
							<img
								src="/logo512.png"
								alt="Tony Viagens logo"
								className="h-8 w-8 object-contain"
							/>
							<span className="font-semibold text-lg hidden sm:inline">
								Tony Viagens
							</span>
						</Link>

						{/* Breadcrumbs */}
						<nav className="hidden md:flex items-center text-sm text-muted-foreground">
							{breadcrumbs.map((crumb, index) => (
								<div key={crumb.path} className="flex items-center">
									{index > 0 && <span className="mx-2">/</span>}
									{crumb.current ? (
										<span className="font-medium text-foreground">
											{crumb.label}
										</span>
									) : (
										<Link
											to={crumb.path}
											className="hover:text-foreground transition-colors"
										>
											{crumb.label}
										</Link>
									)}
								</div>
							))}
						</nav>
					</div>

					{/* Right section - Language switcher and User menu */}
					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						{isAuthenticated && user ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 gap-2 hover:bg-accent"
									>
										<Avatar className="size-6">
											<AvatarImage
												src={user.image || undefined}
												alt={user.name || undefined}
											/>
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
											<p className="text-sm font-medium leading-none">
												{user.name}
											</p>
											<p className="text-xs text-muted-foreground leading-none">
												{user.email}
											</p>
										</div>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />

									<DropdownMenuItem asChild>
										<Link to="/" className="flex items-center gap-2">
											<Home className="w-4 h-4" />
											Minhas Viagens
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={handleLogout}>
										<LogOutIcon className="w-4 h-4" />
										Sair
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<Button
								size="sm"
								onClick={handleLogin}
								variant="outline"
								className="h-8 gap-2"
							>
								<UserIcon className="w-4 h-4" />
								<span className="hidden sm:inline">Entrar</span>
							</Button>
						)}
					</div>
				</div>
			</div>
		</header>
	);
};
