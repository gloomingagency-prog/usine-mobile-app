CREATE TYPE "public"."cost_kind" AS ENUM('ia', 'build', 'store', 'infra', 'ads', 'outils');--> statement-breakpoint
CREATE TABLE "costs" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text,
	"kind" "cost_kind" NOT NULL,
	"label" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;