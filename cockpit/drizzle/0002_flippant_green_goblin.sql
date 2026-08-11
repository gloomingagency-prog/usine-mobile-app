CREATE TYPE "public"."heartbeat_status" AS ENUM('running', 'ok', 'error');--> statement-breakpoint
CREATE TABLE "cron_heartbeats" (
	"id" text PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"app_id" text,
	"status" "heartbeat_status" NOT NULL,
	"expected_every_sec" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"note" text
);
