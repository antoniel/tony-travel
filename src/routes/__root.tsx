import { TanstackDevtools } from "@tanstack/react-devtools";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { TopbarMenu } from "../components/ui/topbar-menu";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";

import appCss from "../styles.css?url";

import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider, baseLocale } from "@/lib/i18n/LanguageProvider";
import {
	getCurrentLanguage,
	getLanguageFromPath,
} from "@/lib/i18n/language-utils";
import type { QueryClient } from "@tanstack/react-query";
import { Meta } from "@tanstack/react-start";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

import { useUser } from "@/hooks/useUser";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Tony Viagens",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	component: RootComponent,
	shellComponent: RootDocument,
});

function RootComponent() {
	const routerState = useRouterState();
	const isAuthRoute = routerState.location.pathname.startsWith("/auth");
	const { user, isAuthenticated, isLoading } = useUser();
	const userId = user?.id;
	const userEmail = user?.email;
	const userName = user?.name;
	const posthog = usePostHog();

	useEffect(() => {
		if (!posthog || isLoading) {
			return;
		}

		if (isAuthenticated && userId) {
			const currentDistinctId = posthog.get_distinct_id();
			const currentEmail = posthog.get_property("email") as string | undefined;
			const currentName = posthog.get_property("name") as string | undefined;
			if (
				currentDistinctId !== userId ||
				currentEmail !== userEmail ||
				currentName !== userName
			) {
				posthog.identify(userId, {
					email: userEmail,
					name: userName,
				});
			}
			return;
		}

		posthog.reset();
	}, [isAuthenticated, isLoading, posthog, userEmail, userId, userName]);

	// Detect language from URL
	const urlLang = getLanguageFromPath(routerState.location.pathname);
	const initialLanguage = getCurrentLanguage(urlLang);

	return (
		<LanguageProvider initialLanguage={initialLanguage}>
			{!isAuthRoute && <TopbarMenu />}
			<main className={isAuthRoute ? "" : "min-h-[calc(100vh-4rem)]"}>
				<Outlet />
			</main>
		</LanguageProvider>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	// Use base locale for html lang attribute (will be updated by client)
	// For SSR, we use the default language
	const lang = baseLocale;

	return (
		<html lang={lang}>
			<head>
				<HeadContent />
				{/* favicon */}
				<link rel="icon" href="/logo512.png" />
				{/* manifest */}
				<link rel="manifest" href="/manifest.json" />
				<Meta />
				{!import.meta.env.PROD && (
					<script
						crossOrigin="anonymous"
						src="//unpkg.com/react-scan/dist/auto.global.js"
					/>
				)}
			</head>
			<body>
				{children}
				<Toaster />
				{!import.meta.env.PROD && (
					<TanstackDevtools
						config={{
							position: "bottom-left",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
