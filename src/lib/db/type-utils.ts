import type {
	BuildQueryResult,
	DBQueryConfig,
	ExtractTablesWithRelations,
} from "drizzle-orm";
import type * as schema from "./schema";

type Schema = typeof schema;
type TSchema = ExtractTablesWithRelations<Schema>;

// https://github.com/drizzle-team/drizzle-orm/issues/695#issuecomment-1881454650
export type IncludeRelation<TableName extends keyof TSchema> = DBQueryConfig<
	"one" | "many",
	boolean,
	TSchema,
	TSchema[TableName]
>["with"];

export type InferResultType<
	TableName extends keyof TSchema,
	With extends IncludeRelation<TableName> | undefined = undefined,
> = BuildQueryResult<
	TSchema,
	TSchema[TableName],
	{
		with: With;
	}
>;
export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
	? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
	: T extends object
		? T extends infer O
			? { [K in keyof O]: ExpandRecursively<O[K]> }
			: never
		: T;

/**
 * A stricter version of TypeScript's Omit utility type that ensures the omitted keys cannot be present.
 * While Omit simply removes properties from the type, HardOmit makes them 'never' to prevent accidental usage.
 *
 * @template T - The source type to omit properties from
 * @template K - Union of property keys to be omitted
 *
 * @example
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * // This type will have 'name' and 'email', and 'id' will be 'never'
 * type UserWithoutId = HardOmit<User, 'id'>;
 */
export type HardOmit<T, K extends keyof T> = Omit<T, K> & {
	[P in K]?: never;
};
