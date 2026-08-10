CREATE TYPE "public"."app_status" AS ENUM('idea', 'analyzing', 'killed', 'pivot', 'viable', 'scoping', 'building', 'internal_testing', 'store_review', 'rejected', 'live', 'improving', 'sunset_proposed', 'sunset');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('a_valider', 'validee', 'refusee', 'decidee');--> statement-breakpoint
CREATE TABLE "app_events" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "app_status" DEFAULT 'idea' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"detail" text NOT NULL,
	"proposition" text NOT NULL,
	"statut" "decision_status" DEFAULT 'a_valider' NOT NULL,
	"commentaire" text,
	"decide_le" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_events" ADD CONSTRAINT "app_events_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;