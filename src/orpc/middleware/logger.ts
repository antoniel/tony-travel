import { ORPCError, os, ValidationError } from "@orpc/server";
import signalePkg from "signale";
import type z from "zod";

const signale = new signalePkg.Signale({
	scope: "oRPC",
	types: {
		request: {
			badge: "→",
			color: "blue",
			label: "request",
		},
		success: {
			badge: "✓",
			color: "green",
			label: "success",
		},
		cancel: {
			badge: "⚠",
			color: "yellow",
			label: "cancel",
		},
	},
});

export const logger = os.middleware(async ({ path, next, signal }) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	const startTime = Date.now();
	const methodPath = path.join(".");

	// Log request start
	signale.request(`[${requestId}] ${methodPath}`);

	// Handle cancellation
	const handleAbort = () => {
		const duration = Date.now() - startTime;
		signale.cancel(`[${requestId}] ${methodPath} (${duration}ms)`);
	};

	signal?.addEventListener("abort", handleAbort);

	try {
		const result = await next({});

		// Log successful response
		const duration = Date.now() - startTime;
		signale.success(`[${requestId}] ${methodPath} (${duration}ms)`);

		return result;
	} catch (error) {
		// Log error response
		const duration = Date.now() - startTime;

		if (signal?.aborted) {
			signale.cancel(`[${requestId}] ${methodPath} - aborted (${duration}ms)`);
		} else {
			if (
				error instanceof ORPCError &&
				error.cause instanceof ValidationError
			) {
				const issues = error.cause.issues as z.core.$ZodIssue[];
				for (const issue of issues) {
					signale.warn(
						`[${requestId}] ${methodPath} - [${issue.path.join(".")}] ${issue.message}`,
					);
				}
			}
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			signale.error(
				`[${requestId}] ${methodPath} - ${errorMessage} (${duration}ms)`,
			);
			// signale.fatal(error);
		}

		throw error;
	} finally {
		signal?.removeEventListener("abort", handleAbort);
	}
});
