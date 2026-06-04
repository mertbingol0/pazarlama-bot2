CREATE TABLE "searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_key" text NOT NULL,
	"category" text NOT NULL,
	"city" text NOT NULL,
	"district" text NOT NULL,
	"created_at" timestamp(0) DEFAULT now(),
	"updated_at" timestamp(0) DEFAULT now(),
	CONSTRAINT "searches_search_key_unique" UNIQUE("search_key")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_id" integer NOT NULL,
	"external_id" text,
	"name" text,
	"phone" text,
	"email" text,
	"instagram" text,
	"socials" text,
	"address" text,
	"website" text,
	"google_maps_url" text,
	"rating" double precision,
	"user_rating_count" integer DEFAULT 0,
	"source" text DEFAULT 'google_places',
	"status" text DEFAULT 'pending',
	"category" text,
	"city" text,
	"district" text,
	"lat" double precision,
	"lng" double precision,
	"whatsapp_status" text DEFAULT 'not_sent',
	"template_sent_at" timestamp(0),
	"last_incoming_at" timestamp(0),
	"last_message_text" text,
	"last_whatsapp_message_id" text,
	"created_at" timestamp(0) DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "live_support_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"button_text" text DEFAULT 'Bilgi almak istiyorum',
	"status" text DEFAULT 'info_requested',
	"result" text DEFAULT 'pending',
	"meeting_at" text,
	"assigned_to" text,
	"note" text DEFAULT '',
	"message_id" text,
	"seen_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now(),
	"updated_at" timestamp(0) DEFAULT now(),
	CONSTRAINT "live_support_leads_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"business_id" integer,
	"direction" text NOT NULL,
	"type" text DEFAULT 'text',
	"text" text DEFAULT '',
	"message_id" text,
	"read_at" timestamp(0),
	"created_at" timestamp(0) DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"role" text DEFAULT 'admin',
	"created_at" timestamp(0) DEFAULT now(),
	"updated_at" timestamp(0) DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_businesses_status" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_businesses_external_id" ON "businesses" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "idx_businesses_whatsapp_status" ON "businesses" USING btree ("whatsapp_status");--> statement-breakpoint
CREATE INDEX "idx_live_support_leads_phone" ON "live_support_leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_live_support_leads_status" ON "live_support_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_live_support_leads_updated_at" ON "live_support_leads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_live_support_leads_seen_at" ON "live_support_leads" USING btree ("seen_at");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_phone" ON "whatsapp_messages" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_username" ON "users" USING btree ("username");