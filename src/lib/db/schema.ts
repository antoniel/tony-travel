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
	flightSlice: "fls",
	flightSegment: "fsg",
	travelMember: "trm",
	invitation: "inv",
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

export type TravelDestinationAirportOption = {
	value: string;
	label: string;
};

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
export const UserSchema = createSelectSchema(User);
export const InsertUserSchema = createInsertSchema(User);

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
	description: text("description"),
	destination: text("destination").notNull(),
	destinationAirports: text("destination_airports", { mode: "json" })
		.$type<TravelDestinationAirportOption[]>()
		.notNull()
		.$defaultFn((): TravelDestinationAirportOption[] => []),
	startDate: integer("start_date", { mode: "timestamp" }).notNull(),
	endDate: integer("end_date", { mode: "timestamp" }).notNull(),
	budget: real("budget"),
	peopleEstimate: integer("people_estimate"),
	userId: text("user_id")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
	deletedAt: integer("deleted_at", { mode: "timestamp" }),
	deletedBy: text("deleted_by").references(() => User.id),
});
export const TravelSchema = createSelectSchema(Travel);
export const InsertTravelSchema = createInsertSchema(Travel);
export const UpdateTravelSchema = createInsertSchema(Travel).partial().omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	userId: true,
	deletedAt: true,
	deletedBy: true,
});
export const TravelRelations = relations(Travel, ({ many }) => ({
	accommodations: many(Accommodation),
	events: many(AppEvent),
	flights: many(Flight),
	members: many(TravelMember),
	invitations: many(TravelInvitation),
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
	address: text("address").notNull(),
	price: real("price").notNull(),
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
	cost: real("cost"),
	type: text("type", { enum: ["travel", "food", "activity"] }).notNull(),
	location: text("location"),
	description: text("description"),
	link: text("link"),
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
export const AppEventSchema = createSelectSchema(AppEvent);
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
	originAirport: text("origin_airport").notNull(),
	destinationAirport: text("destination_airport").notNull(),
	departureDate: integer("departure_date", { mode: "timestamp" }).notNull(),
	departureTime: text("departure_time").notNull(),
	arrivalDate: integer("arrival_date", { mode: "timestamp" }).notNull(),
	arrivalTime: text("arrival_time").notNull(),
	cost: real("cost"),
	totalAmount: real("total_amount"),
	currency: text("currency").default("BRL"),
	baseAmount: real("base_amount"),
	taxAmount: real("tax_amount"),
	provider: text("provider"),
	offerReference: text("offer_reference"),
	dataSource: text("data_source"),
	metadata: text("metadata", { mode: "json" })
		.$type<Record<string, unknown> | null>()
		.default(null),
	travelId: text("travel_id")
		.notNull()
		.references(() => Travel.id, { onDelete: "cascade" }),
});
export const FlightSchema = createSelectSchema(Flight);
export const InsertFlightSchema = createInsertSchema(Flight);

export const FlightSlice = sqliteTable("flight_slice", {
	...defaultColumn("flightSlice"),
	flightId: text("flight_id")
		.notNull()
		.references(() => Flight.id, { onDelete: "cascade" }),
	sliceIndex: integer("slice_index").notNull(),
	originAirport: text("origin_airport").notNull(),
	destinationAirport: text("destination_airport").notNull(),
	durationMinutes: integer("duration_minutes"),
	cabinClass: text("cabin_class"),
	cabinClassMarketingName: text("cabin_class_marketing_name"),
});
export type FlightSlice = typeof FlightSlice.$inferSelect;
export type InsertFlightSlice = typeof FlightSlice.$inferInsert;
export const FlightSliceSchema = createSelectSchema(FlightSlice);
export const InsertFlightSliceSchema = createInsertSchema(FlightSlice);

export const FlightSegment = sqliteTable("flight_segment", {
	...defaultColumn("flightSegment"),
	sliceId: text("slice_id")
		.notNull()
		.references(() => FlightSlice.id, { onDelete: "cascade" }),
	segmentIndex: integer("segment_index").notNull(),
	originAirport: text("origin_airport").notNull(),
	destinationAirport: text("destination_airport").notNull(),
	departureDate: integer("departure_date", { mode: "timestamp" }).notNull(),
	departureTime: text("departure_time").notNull(),
	arrivalDate: integer("arrival_date", { mode: "timestamp" }).notNull(),
	arrivalTime: text("arrival_time").notNull(),
	marketingFlightNumber: text("marketing_flight_number"),
	operatingCarrierCode: text("operating_carrier_code"),
	aircraftName: text("aircraft_name"),
	aircraftType: text("aircraft_type"),
	distanceMeters: integer("distance_meters"),
	durationMinutes: integer("duration_minutes"),
	baggageAllowance: text("baggage_allowance", { mode: "json" })
		.$type<Record<string, unknown> | null>()
		.default(null),
});
export type FlightSegment = typeof FlightSegment.$inferSelect;
export type InsertFlightSegment = typeof FlightSegment.$inferInsert;
export const FlightSegmentSchema = createSelectSchema(FlightSegment);
export const InsertFlightSegmentSchema = createInsertSchema(FlightSegment);

export const flightSegmentRelations = relations(FlightSegment, ({ one }) => ({
	slice: one(FlightSlice, {
		fields: [FlightSegment.sliceId],
		references: [FlightSlice.id],
	}),
}));

export const flightSliceRelations = relations(FlightSlice, ({ one, many }) => ({
	flight: one(Flight, {
		fields: [FlightSlice.flightId],
		references: [Flight.id],
	}),
	segments: many(FlightSegment),
}));

export const flightRelations = relations(Flight, ({ one, many }) => ({
	travel: one(Travel, {
		fields: [Flight.travelId],
		references: [Travel.id],
	}),
	participants: many(FlightParticipant),
	slices: many(FlightSlice),
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

export type TravelMember = typeof TravelMember.$inferSelect;
export type InsertTravelMember = typeof TravelMember.$inferInsert;
export const TravelMember = sqliteTable("travel_member", {
	...defaultColumn("travelMember"),
	travelId: text("travel_id")
		.notNull()
		.references(() => Travel.id, { onDelete: "cascade" }),
	userId: text("user_id")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
	role: text("role", { enum: ["owner", "member"] }).notNull(),
	joinedAt: integer("joined_at", { mode: "timestamp" })
		.$defaultFn(() => new Date())
		.notNull(),
});
export const TravelMemberSchema = createSelectSchema(TravelMember);
export const InsertTravelMemberSchema = createInsertSchema(TravelMember);
export const travelMemberRelations = relations(TravelMember, ({ one }) => ({
	travel: one(Travel, {
		fields: [TravelMember.travelId],
		references: [Travel.id],
	}),
	user: one(User, {
		fields: [TravelMember.userId],
		references: [User.id],
	}),
}));

export type TravelInvitation = typeof TravelInvitation.$inferSelect;
export type InsertTravelInvitation = typeof TravelInvitation.$inferInsert;
export const TravelInvitation = sqliteTable("travel_invitation", {
	...defaultColumn("invitation"),
	travelId: text("travel_id")
		.notNull()
		.references(() => Travel.id, { onDelete: "cascade" }),
	createdBy: text("created_by")
		.notNull()
		.references(() => User.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	isActive: integer("is_active", { mode: "boolean" })
		.$defaultFn(() => true)
		.notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
});
export const TravelInvitationSchema = createSelectSchema(TravelInvitation);
export const InsertTravelInvitationSchema =
	createInsertSchema(TravelInvitation);
export const travelInvitationRelations = relations(
	TravelInvitation,
	({ one }) => ({
		travel: one(Travel, {
			fields: [TravelInvitation.travelId],
			references: [Travel.id],
		}),
		createdByUser: one(User, {
			fields: [TravelInvitation.createdBy],
			references: [User.id],
		}),
	}),
);
