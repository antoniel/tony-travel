import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-js/react";

export function getContext() {
	const queryClient = new QueryClient();
	return {
		queryClient,
	};
}

export function Provider({
	children,
	queryClient,
}: {
	children: React.ReactNode;
	queryClient: QueryClient;
}) {
	return (
		<PostHogProvider
			apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
			options={{
				api_host: "/tony-ta-de-olho",
				ui_host: "https://us.posthog.com",
				defaults: "2025-05-24",
				capture_exceptions: true,
				debug: !import.meta.env.PROD,
			}}
		>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</PostHogProvider>
	);
}
