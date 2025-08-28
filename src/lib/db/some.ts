import {
	createTableRelationsHelpers,
	extractTablesRelationalConfig,
} from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";
import { Travel } from "./schema";

const relationsConfig = extractTablesRelationalConfig(
	Travel,
	createTableRelationsHelpers,
);

// Gerar schemas individuais para cada tabela
const tableSchemas: any = {};
for (const [tableName, table] of Object.entries(Travel)) {
	if (table._) {
		// É uma tabela
		tableSchemas[tableName] = createSelectSchema(table);
	}
}

console.log(tableSchemas);
