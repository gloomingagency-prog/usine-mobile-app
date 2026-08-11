CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"severity" text NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
