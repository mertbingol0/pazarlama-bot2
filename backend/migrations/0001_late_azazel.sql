CREATE TABLE "whatsapp_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"profile_name" text,
	"business_id" integer,
	"last_message_text" text,
	"last_message_at" timestamp(0),
	"last_incoming_at" timestamp(0),
	"last_outgoing_at" timestamp(0),
	"last_contacted_by" integer,
	"last_contacted_team" text,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp(0) DEFAULT now(),
	"updated_at" timestamp(0) DEFAULT now(),
	CONSTRAINT "whatsapp_contacts_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer,
	"contact_id" integer,
	"user_id" integer,
	"team" text,
	"channel" text NOT NULL,
	"outcome" text DEFAULT 'pending',
	"note" text DEFAULT '',
	"meeting_at" timestamp(0),
	"contact_name" text,
	"contact_phone" text,
	"created_at" timestamp(0) DEFAULT now(),
	"updated_at" timestamp(0) DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "business_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer,
	"team" text,
	"note" text NOT NULL,
	"created_at" timestamp(0) DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"team" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp(0) DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "businesses" ALTER COLUMN "search_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'personnel';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "result_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "searches" ADD COLUMN "last_fetched_at" timestamp(0);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "assigned_to" integer;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "added_manually" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "contact_id" integer;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "sender_user_id" integer;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "status" text DEFAULT 'sent';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "team" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp(0);--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_last_contacted_by_users_id_fk" FOREIGN KEY ("last_contacted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notes" ADD CONSTRAINT "business_notes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_notes" ADD CONSTRAINT "business_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whatsapp_contacts_phone" ON "whatsapp_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_contacts_business_id" ON "whatsapp_contacts" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_contacts_last_message_at" ON "whatsapp_contacts" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_interactions_business_id" ON "interactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_contact_id" ON "interactions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_user_id" ON "interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_team" ON "interactions" USING btree ("team");--> statement-breakpoint
CREATE INDEX "idx_interactions_outcome" ON "interactions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "idx_interactions_meeting_at" ON "interactions" USING btree ("meeting_at");--> statement-breakpoint
CREATE INDEX "idx_interactions_created_at" ON "interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_business_notes_business_id" ON "business_notes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_activity_log_user_id" ON "activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_log_action" ON "activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_activity_log_team" ON "activity_log" USING btree ("team");--> statement-breakpoint
CREATE INDEX "idx_activity_log_created_at" ON "activity_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_activity_log_entity" ON "activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
ALTER TABLE "searches" ADD CONSTRAINT "searches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_searches_search_key" ON "searches" USING btree ("search_key");--> statement-breakpoint
CREATE INDEX "idx_businesses_assigned_to" ON "businesses" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_businesses_search_id" ON "businesses" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_contact_id" ON "whatsapp_messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_business_id" ON "whatsapp_messages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_team" ON "users" USING btree ("team");