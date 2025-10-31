ALTER TABLE "register_bo" ADD COLUMN "local_id" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "collected_at" timestamp;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "received_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "sync_status" text DEFAULT 'synced' NOT NULL;--> statement-breakpoint
ALTER TABLE "register_bo" ADD CONSTRAINT "register_bo_local_id_unique" UNIQUE("local_id");