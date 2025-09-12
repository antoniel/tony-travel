import type z from "zod";

/**
 * Success result type
 */
export type Success<T> = {
	success: true;
	data: T;
};

type ErrorType = {
	[key in string]: {
		message: string;
		data?: z.ZodTypeAny; // schema used to infer the payload type
	};
};

/**
 * Error result type
 */
export type Failure<
	E extends ErrorType = ErrorType,
	K extends keyof E = keyof E,
> = {
	success: false;
	error: {
		type: K & string;
		message: string;
		data?: E[K] extends { data: z.ZodType<infer T> } ? T : never;
	};
};

/**
 * Result type combining success and error cases
 */
export type AppResult<T, E extends ErrorType = ErrorType> =
	| Success<T>
	| Failure<E>;

/**
 * Helper functions to create Result types
 */
export const AppResult = {
	/**
	 * Create a success result
	 */
	success: <T>(data: T): Success<T> => ({
		success: true,
		data,
	}),

	/**
	 * Create a failure result
	 */
	failure<const E extends ErrorType, const K extends keyof E>(
		_: E,
		type: K,
		message: string,
		data?: E[K] extends { data: z.ZodType<infer T> } ? T : never,
	): Failure<E, K> {
		return {
			success: false,
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			error: { type: type as K & string, message, data: data as any },
		};
	},

	/**
	 * Check if result is success
	 */
	isSuccess: <T, E extends ErrorType>(
		result: AppResult<T, E>,
	): result is Success<T> => result.success,

	/**
	 * Check if result is failure
	 */
	isFailure: <T, E extends ErrorType>(
		result: AppResult<T, E>,
	): result is Failure<E> => !result.success,
};
