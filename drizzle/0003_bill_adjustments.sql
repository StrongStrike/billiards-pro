CREATE TYPE "public"."bill_adjustment_type" AS ENUM('discount', 'compliment', 'free_minutes', 'manual_charge');--> statement-breakpoint
CREATE TABLE "bill_adjustments" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"operator_id" text,
	"type" "bill_adjustment_type" NOT NULL,
	"amount" integer,
	"minutes" integer,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bill_adjustments" ADD CONSTRAINT "bill_adjustments_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_adjustments" ADD CONSTRAINT "bill_adjustments_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE set null ON UPDATE no action;