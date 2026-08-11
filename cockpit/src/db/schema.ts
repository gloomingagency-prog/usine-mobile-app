import { pgTable, text, timestamp, pgEnum, integer } from "drizzle-orm/pg-core";

// Machine à états d'une app du portfolio (ARCHITECTURE_USINE.md §2)
export const appStatus = pgEnum("app_status", [
  "idea",
  "analyzing",
  "killed",
  "pivot",
  "viable",
  "scoping",
  "building",
  "internal_testing",
  "store_review",
  "rejected",
  "live",
  "improving",
  "sunset_proposed",
  "sunset",
]);

export const apps = pgTable("apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: appStatus("status").notNull().default("idea"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appEvents = pgTable("app_events", {
  id: text("id").primaryKey(),
  appId: text("app_id").notNull().references(() => apps.id),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  actor: text("actor").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// Dépenses réelles (usine et par app) — le budget D7 s'observe, il ne se
// déclare pas. amount en CENTIMES USD (entier : pas de flottant monétaire).
export const costKind = pgEnum("cost_kind", ["ia", "build", "store", "infra", "ads", "outils"]);

export const costs = pgTable("costs", {
  id: text("id").primaryKey(),
  appId: text("app_id").references(() => apps.id), // null = coût usine
  kind: costKind("kind").notNull(),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// Heartbeats des crons/agents de l'usine (VPS) — la page Statut publique
// les lit. Un job silencieux > 2× sa cadence = PANNE, pas un retard.
export const heartbeatStatus = pgEnum("heartbeat_status", ["running", "ok", "error"]);

export const cronHeartbeats = pgTable("cron_heartbeats", {
  id: text("id").primaryKey(),
  job: text("job").notNull(),
  appId: text("app_id"),
  status: heartbeatStatus("status").notNull(),
  expectedEverySec: integer("expected_every_sec"), // cadence déclarée du job
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  note: text("note"),
});

export const decisionStatus = pgEnum("decision_status", [
  "a_valider",
  "validee",
  "refusee",
  "decidee", // actée hors dashboard (trace) — reste modifiable
]);

// Les décisions (cadrage puis gates du run) se prennent DEPUIS le cockpit.
export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(), // ex. "D1"
  titre: text("titre").notNull(),
  detail: text("detail").notNull(),
  proposition: text("proposition").notNull(),
  statut: decisionStatus("statut").notNull().default("a_valider"),
  commentaire: text("commentaire"),
  decideLe: timestamp("decide_le", { withTimezone: true }),
});
