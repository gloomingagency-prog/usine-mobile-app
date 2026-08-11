CREATE TYPE "public"."idea_status" AS ENUM('nouvelle', 'a_analyser', 'ecartee', 'retenue');--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"categorie" text NOT NULL,
	"app_ref" text NOT NULL,
	"titre" text NOT NULL,
	"resume" text NOT NULL,
	"metrics" jsonb NOT NULL,
	"score" integer NOT NULL,
	"status" "idea_status" DEFAULT 'nouvelle' NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
