CREATE TABLE "register_bo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transcription" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
