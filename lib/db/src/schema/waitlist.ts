import {
  boolean,
  char,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const waitlistAudienceEnum = pgEnum("waitlist_audience", [
  "customer",
  "provider",
]);

export const waitlistAccountTypeEnum = pgEnum("waitlist_account_type", [
  "individual",
  "business",
]);

export const waitlistSignupsTable = pgTable(
  "waitlist_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    audience: waitlistAudienceEnum("audience").notNull(),
    countryCode: char("country_code", { length: 2 }).notNull(),
    accountType: waitlistAccountTypeEnum("account_type"),
    locale: text("locale").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    consentVersion: text("consent_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailAudienceUnique: uniqueIndex("waitlist_signups_email_audience_unique").on(
      table.email,
      table.audience,
    ),
    countryIndex: index("waitlist_signups_country_idx").on(table.countryCode),
    createdAtIndex: index("waitlist_signups_created_at_idx").on(table.createdAt),
  }),
);

export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "page_view",
  "waitlist_signup",
]);

export const analyticsEventsTable = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anonymousId: uuid("anonymous_id").notNull(),
    eventType: analyticsEventTypeEnum("event_type").notNull(),
    countryCode: char("country_code", { length: 2 }),
    audience: waitlistAudienceEnum("audience"),
    locale: text("locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventCreatedAtIndex: index("analytics_events_type_created_at_idx").on(
      table.eventType,
      table.createdAt,
    ),
    countryIndex: index("analytics_events_country_idx").on(table.countryCode),
  }),
);
