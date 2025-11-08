CREATE TABLE "bo_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bo_id" uuid NOT NULL,
	"action" text NOT NULL,
	"police_identifier" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
