import { relations } from "drizzle-orm"
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { customAlphabet } from "nanoid"

const nanoid = customAlphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", 16)

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
  travelMember: "trm",
  invitation: "inv",
} as const
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
})

export function newId(prefix: keyof typeof prefixes): string {
  return [prefixes[prefix], nanoid()].join("_")
}

export const User = sqliteTable("user", {
  ...defaultColumn("user"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
})
export type User = typeof User.$inferSelect
export const UserSchema = createSelectSchema(User)
export const InsertUserSchema = createInsertSchema(User)

export const Session = sqliteTable("session", {
  ...defaultColumn("session"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
})

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
})

export const Verification = sqliteTable("verification", {
  ...defaultColumn("verification"),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
})

export type Travel = typeof Travel.$inferSelect
export type InsertTravel = typeof Travel.$inferInsert
export const Travel = sqliteTable("travel", {
  ...defaultColumn("travel"),
  name: text("name").notNull(),
  description: text("description"),
  destination: text("destination").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  deletedBy: text("deleted_by").references(() => User.id),
})
export const TravelSchema = createSelectSchema(Travel)
export const InsertTravelSchema = createInsertSchema(Travel)
export const UpdateTravelSchema = createInsertSchema(Travel).partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  deletedAt: true,
  deletedBy: true,
})
export const TravelRelations = relations(Travel, ({ many }) => ({
  accommodations: many(Accommodation),
  events: many(AppEvent),
  flights: many(Flight),
  members: many(TravelMember),
  invitations: many(TravelInvitation),
}))

export type Accommodation = typeof Accommodation.$inferSelect
export type InsertAccommodation = typeof Accommodation.$inferInsert
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
})
export const AccommodationSchema = createSelectSchema(Accommodation)
export const InsertAccommodationSchema = createInsertSchema(Accommodation)
export const accommodationRelations = relations(Accommodation, ({ one }) => ({
  travel: one(Travel, {
    fields: [Accommodation.travelId],
    references: [Travel.id],
  }),
}))

export type AppEvent = typeof AppEvent.$inferSelect
export type InsertAppEvent = typeof AppEvent.$inferInsert
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
    source: "pixabay" | "manual"
    tags: string[]
    photographer?: string
    fetchedAt: Date
    pixabayId?: number
  }>(),
  travelId: text("travel_id")
    .notNull()
    .references(() => Travel.id, { onDelete: "cascade" }),
  parentEventId: text("parent_event_id"),
})
export const AppEventSchema = createSelectSchema(AppEvent)
export const InsertAppEventSchema = createInsertSchema(AppEvent)
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
}))

export type Flight = typeof Flight.$inferSelect
export type InsertFlight = typeof Flight.$inferInsert
export const Flight = sqliteTable("flight", {
  ...defaultColumn("flight"),
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
})
export const FlightSchema = createSelectSchema(Flight)
export const InsertFlightSchema = createInsertSchema(Flight)
export const flightRelations = relations(Flight, ({ one, many }) => ({
  travel: one(Travel, {
    fields: [Flight.travelId],
    references: [Travel.id],
  }),
  participants: many(FlightParticipant),
}))

export type FlightParticipant = typeof FlightParticipant.$inferSelect
export type InsertFlightParticipant = typeof FlightParticipant.$inferInsert
export const FlightParticipant = sqliteTable("flight_participant", {
  ...defaultColumn("flightParticipant"),
  flightId: text("flight_id")
    .notNull()
    .references(() => Flight.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => User.id, { onDelete: "cascade" }),
})
export const FlightParticipantSchema = createSelectSchema(FlightParticipant)
export const InsertFlightParticipantSchema = createInsertSchema(FlightParticipant)
export const flightParticipantRelations = relations(FlightParticipant, ({ one }) => ({
  flight: one(Flight, {
    fields: [FlightParticipant.flightId],
    references: [Flight.id],
  }),
  user: one(User, {
    fields: [FlightParticipant.userId],
    references: [User.id],
  }),
}))

export type TravelMember = typeof TravelMember.$inferSelect
export type InsertTravelMember = typeof TravelMember.$inferInsert
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
})
export const TravelMemberSchema = createSelectSchema(TravelMember)
export const InsertTravelMemberSchema = createInsertSchema(TravelMember)
export const travelMemberRelations = relations(TravelMember, ({ one }) => ({
  travel: one(Travel, {
    fields: [TravelMember.travelId],
    references: [Travel.id],
  }),
  user: one(User, {
    fields: [TravelMember.userId],
    references: [User.id],
  }),
}))

export type TravelInvitation = typeof TravelInvitation.$inferSelect
export type InsertTravelInvitation = typeof TravelInvitation.$inferInsert
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
})
export const TravelInvitationSchema = createSelectSchema(TravelInvitation)
export const InsertTravelInvitationSchema = createInsertSchema(TravelInvitation)
export const travelInvitationRelations = relations(TravelInvitation, ({ one }) => ({
  travel: one(Travel, {
    fields: [TravelInvitation.travelId],
    references: [Travel.id],
  }),
  createdByUser: one(User, {
    fields: [TravelInvitation.createdBy],
    references: [User.id],
  }),
}))
