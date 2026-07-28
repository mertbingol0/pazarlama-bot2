CREATE INDEX IF NOT EXISTS "idx_interactions_user_updated_at" ON "interactions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_notes_user_created_at" ON "business_notes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_out_biz_created_at" ON "whatsapp_messages" USING btree ("business_id","created_at") WHERE "direction" = 'outgoing' AND "business_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_out_legacy_created_at" ON "whatsapp_messages" USING btree ("created_at") WHERE "direction" = 'outgoing' AND "business_id" IS NULL;
