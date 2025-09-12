// Type-only DB surface used by oRPC context and DAOs
// This avoids importing the concrete db instance in oRPC code.
export type DB = typeof import("./index").db;

