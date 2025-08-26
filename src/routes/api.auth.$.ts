import { auth } from "@/lib/auth";
import { createServerFileRoute } from "@tanstack/react-start/server";

async function handle({ request }: { request: Request }) {
	return await auth.handler(request);
}

export const ServerRoute = createServerFileRoute("/api/auth/$").methods({
	GET: handle,
	POST: handle,
});
