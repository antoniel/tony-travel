import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
	16,
);

const prefixes = {
	user: "usr",
	session: "ses",
	account: "acc",
	verification: "ver",
	travel: "trv",
	accommodation: "acm",
	event: "evt",
	flight: "flt",
	flightParticipant: "flp",
} as const;
const defaultColumn = (prefix: keyof typeof prefixes) => ({
	id: text("id")
		.primaryKey()
		.$defaultFn(() => newId(prefix)),
	createdAt: integer("created_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.$onUpdate(() => new Date())
		.notNull(),
});

export function newId(prefix: keyof typeof prefixes): string {
	return [prefixes[prefix], nanoid()].join("_");
}

export const User = sqliteTable("user", {
	...defaultColumn("user"),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" })
		.$defaultFn(() => false)
		.notNull(),
	image: text("image"),
});
export type User = typeof User.$inferSelect;

export const Session = sqliteTable("session", {
	...defaultColumn("session"),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
	token: text("token").notNull().unique(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
});

export const Account = sqliteTable("account", {
	...defaultColumn("account"),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", {
		mode: "timestamp",
	}),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	password: text("password"),
});

export const Verification = sqliteTable("verification", {
	...defaultColumn("verification"),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export type Travel = typeof Travel.$inferSelect;
export type InsertTravel = typeof Travel.$inferInsert;
export const Travel = sqliteTable("travel", {
	...defaultColumn("travel"),
	name: text("name").notNull(),
	destination: text("destination").notNull(),
	startDate: integer("start_date", { mode: "timestamp" }).notNull(),
	endDate: integer("end_date", { mode: "timestamp" }).notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
	locationInfo: text("location_info", { mode: "json" }).notNull().$type<{
		destination: string;
		country: string;
		climate: string;
		currency: string;
		language: string;
		timeZone: string;
		bestTimeToVisit: string;
		emergencyNumbers?: {
			police?: string;
			medical?: string;
			embassy?: string;
		};
	}>(),
	visaInfo: text("visa_info", { mode: "json" }).notNull().$type<{
		required: boolean;
		stayDuration: string;
		documents: string[];
		vaccinations: string[];
		entryRequirements?: string[];
	}>(),
});
export const TravelSchema = createSelectSchema(Travel);
export const TravelRelations = relations(Travel, ({ many }) => ({
	accommodations: many(Accommodation),
	events: many(AppEvent),
	flights: many(Flight),
}));

export type Accommodation = typeof Accommodation.$inferSelect;
export type InsertAccommodation = typeof Accommodation.$inferInsert;
export const Accommodation = sqliteTable("accommodation", {
	...defaultColumn("accommodation"),
	name: text("name").notNull(),
	type: text("type", {
		enum: ["hotel", "hostel", "airbnb", "resort", "other"],
	}).notNull(),
	startDate: integer("start_date", { mode: "timestamp" }).notNull(),
	endDate: integer("end_date", { mode: "timestamp" }).notNull(),
	address: text("address"),
	rating: real("rating"),
	price: real("price"),
	currency: text("currency"),
	travelId: text("travel_id")
		.notNull()
		.references(() => Travel.id, { onDelete: "cascade" }),
});
export const AccommodationSchema = createSelectSchema(Accommodation);
export const InsertAccommodationSchema = createInsertSchema(Accommodation);
export const accommodationRelations = relations(Accommodation, ({ one }) => ({
	travel: one(Travel, {
		fields: [Accommodation.travelId],
		references: [Travel.id],
	}),
}));

export type AppEvent = typeof AppEvent.$inferSelect;
export type InsertAppEvent = typeof AppEvent.$inferInsert;
export const AppEvent = sqliteTable("app_event", {
	...defaultColumn("event"),
	title: text("title").notNull(),
	startDate: integer("start_date", { mode: "timestamp" }).notNull(),
	endDate: integer("end_date", { mode: "timestamp" }).notNull(),
	estimatedCost: real("estimated_cost"),
	type: text("type", { enum: ["travel", "food", "activity"] }).notNull(),
	location: text("location"),
	imageUrl: text("image_url"),
	imageMetadata: text("image_metadata", { mode: "json" }).$type<{
		source: "pixabay" | "manual";
		tags: string[];
		photographer?: string;
		fetchedAt: Date;
		pixabayId?: number;
	}>(),
	travelId: text("travel_id")
		.notNull()
		.references(() => Travel.id, { onDelete: "cascade" }),
	parentEventId: text("parent_event_id"),
});
export const InsertAppEventSchema = createInsertSchema(AppEvent);
export const appEventRelations = relations(AppEvent, ({ one, many }) => ({
	travel: one(Travel, {
		fields: [AppEvent.travelId],
		references: [Travel.id],
	}),
	parentEvent: one(AppEvent, {
		fields: [AppEvent.parentEventId],
		references: [AppEvent.id],
		relationName: "eventDependencies",
	}),
	dependencies: many(AppEvent, {
		relationName: "eventDependencies",
	}),
}));

export type Flight = typeof Flight.$inferSelect;
export type InsertFlight = typeof Flight.$inferInsert;
export const Flight = sqliteTable("flight", {
	...defaultColumn("flight"),
	flightNumber: text("flight_number"),
	originAirport: text("origin_airport").notNull(),
	destinationAirport: text("destination_airport").notNull(),
	departureDate: integer("departure_date", { mode: "timestamp" }).notNull(),
	departureTime: text("departure_time").notNull(),
	arrivalDate: integer("arrival_date", { mode: "timestamp" }).notNull(),
	arrivalTime: text("arrival_time").notNull(),
	cost: real("cost"),
	travelId: text("travel_id")
		.notNull()
		.references(() => Travel.id, { onDelete: "cascade" }),
});
export const FlightSchema = createSelectSchema(Flight);
export const InsertFlightSchema = createInsertSchema(Flight);
export const flightRelations = relations(Flight, ({ one, many }) => ({
	travel: one(Travel, {
		fields: [Flight.travelId],
		references: [Travel.id],
	}),
	participants: many(FlightParticipant),
}));

export type FlightParticipant = typeof FlightParticipant.$inferSelect;
export type InsertFlightParticipant = typeof FlightParticipant.$inferInsert;
export const FlightParticipant = sqliteTable("flight_participant", {
	...defaultColumn("flightParticipant"),
	flightId: text("flight_id")
		.notNull()
		.references(() => Flight.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
});
export const FlightParticipantSchema = createSelectSchema(FlightParticipant);
export const InsertFlightParticipantSchema =
	createInsertSchema(FlightParticipant);
export const flightParticipantRelations = relations(
	FlightParticipant,
	({ one }) => ({
		flight: one(Flight, {
			fields: [FlightParticipant.flightId],
			references: [Flight.id],
		}),
		user: one(User, {
			fields: [FlightParticipant.userId],
			references: [User.id],
		}),
	}),
);
