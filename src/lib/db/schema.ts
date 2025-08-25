import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Main travel table
export const travels = sqliteTable('travels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  destination: text('destination').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  // Store complex objects as JSON
  locationInfo: text('location_info', { mode: 'json' }).notNull(),
  visaInfo: text('visa_info', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Accommodation table
export const accommodations = sqliteTable('accommodations', {
  id: text('id').primaryKey(),
  travelId: text('travel_id').notNull().references(() => travels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // "hotel" | "hostel" | "airbnb" | "resort" | "other"
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  address: text('address'),
  rating: real('rating'),
  price: real('price'),
  currency: text('currency'),
});

// Events table
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  travelId: text('travel_id').notNull().references(() => travels.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  estimatedCost: real('estimated_cost'),
  type: text('type').notNull(), // "travel" | "food" | "activity"
  location: text('location'),
  parentEventId: text('parent_event_id').references(() => events.id), // For dependencies
});

// Relations
export const travelsRelations = relations(travels, ({ many }) => ({
  accommodations: many(accommodations),
  events: many(events),
}));

export const accommodationsRelations = relations(accommodations, ({ one }) => ({
  travel: one(travels, {
    fields: [accommodations.travelId],
    references: [travels.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  travel: one(travels, {
    fields: [events.travelId],
    references: [travels.id],
  }),
  parentEvent: one(events, {
    fields: [events.parentEventId],
    references: [events.id],
    relationName: 'event_dependencies'
  }),
  dependencies: many(events, {
    relationName: 'event_dependencies'
  }),
}));

// Export types derived from schema
export type InsertTravel = typeof travels.$inferInsert;
export type SelectTravel = typeof travels.$inferSelect;
export type InsertAccommodation = typeof accommodations.$inferInsert;
export type SelectAccommodation = typeof accommodations.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type SelectEvent = typeof events.$inferSelect;