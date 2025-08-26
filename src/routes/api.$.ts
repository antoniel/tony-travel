import "@/polyfill";

import { experimental_SmartCoercionPlugin as SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createServerFileRoute } from "@tanstack/react-start/server";

import router from "@/orpc/router";

const handler = new OpenAPIHandler(router, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
	plugins: [
		new SmartCoercionPlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
});

async function handle({ request }: { request: Request }) {
	const { response } = await handler.handle(request, {
		prefix: "/api",
		context: {},
	});

	return response ?? new Response("Not Found", { status: 404 });
}

export const ServerRoute = createServerFileRoute("/api/$").methods({
	HEAD: handle,
	GET: handle,
	POST: handle,
	PUT: handle,
	PATCH: handle,
	DELETE: handle,
});
