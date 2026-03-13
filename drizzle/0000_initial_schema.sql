CREATE TYPE "public"."order_mode" AS ENUM('table', 'counter');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('confirmed', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('scheduled', 'arrived', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('in', 'out', 'correction');--> statement-breakpoint
CREATE TYPE "public"."table_type" AS ENUM('standard', 'vip');--> statement-breakpoint
CREATE TABLE "billiard_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "table_type" NOT NULL,
	"position" integer NOT NULL,
	"accent_color" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"club_name" text NOT NULL,
	"currency" text NOT NULL,
	"timezone" text NOT NULL,
	"operator_name" text NOT NULL,
	"operator_email" text NOT NULL,
	"standard_hourly_rate" integer NOT NULL,
	"vip_hourly_rate" integer NOT NULL,
	"show_activity_chart" boolean DEFAULT true NOT NULL,
	"show_right_rail" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" "order_mode" NOT NULL,
	"status" "order_status" NOT NULL,
	"note" text,
	"table_id" text,
	"session_id" text,
	"customer_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"price" integer NOT NULL,
	"cost_price" integer NOT NULL,
	"stock" integer NOT NULL,
	"threshold" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text NOT NULL,
	"session_id" text,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"guests" integer NOT NULL,
	"note" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"order_id" text,
	"session_id" text,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"resulting_stock" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"table_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"note" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"hourly_rate_snapshot" integer NOT NULL,
	"status" "session_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_billiard_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."billiard_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_billiard_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."billiard_tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."table_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_sessions" ADD CONSTRAINT "table_sessions_table_id_billiard_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."billiard_tables"("id") ON DELETE restrict ON UPDATE no action;