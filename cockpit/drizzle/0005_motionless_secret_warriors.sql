CREATE TYPE "public"."viability_verdict" AS ENUM('go', 'pivot', 'kill');--> statement-breakpoint
CREATE TABLE "viability_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"idea_id" text NOT NULL,
	"verdict" "viability_verdict" NOT NULL,
	"probability" integer NOT NULL,
	"dossier" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "viability_reports_idea_id_unique" UNIQUE("idea_id")
);
--> statement-breakpoint
ALTER TABLE "viability_reports" ADD CONSTRAINT "viability_reports_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;