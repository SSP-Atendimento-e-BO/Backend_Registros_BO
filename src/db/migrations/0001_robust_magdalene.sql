ALTER TABLE "register_bo" ADD COLUMN "date_and_time_of_event" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "place_of_the_fact" text NOT NULL;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "type_of_occurrence" text NOT NULL;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "full_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "cpf_or_rg" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "date_of_birth" timestamp;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "marital_status" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "profession" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "full_address" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "phone_or_cell_phone" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "register_bo" ADD COLUMN "relationship_with_the_fact" text NOT NULL;