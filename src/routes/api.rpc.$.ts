import router from "@/orpc/router";
import "@/polyfill";

import { RPCHandler } from "@orpc/server/fetch";
import { RequestHeadersPlugin } from "@orpc/server/plugins";
import { createServerFileRoute } from "@tanstack/react-start/server";

const handler = new RPCHandler(router, {
	plugins: [new RequestHeadersPlugin()],
});

async function handle({ request }: { request: Request }) {
	const { response } = await handler.handle(request, {
		prefix: "/api/rpc",
		context: {},
	});

	return response ?? new Response("Not Found", { status: 404 });
}

export const ServerRoute = createServerFileRoute("/api/rpc/$").methods({
	HEAD: handle,
	GET: handle,
	POST: handle,
	PUT: handle,
	PATCH: handle,
	DELETE: handle,
});
