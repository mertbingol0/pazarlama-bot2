CREATE INDEX IF NOT EXISTS "idx_businesses_created_at" ON "businesses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_businesses_template_sent_at" ON "businesses" USING btree ("template_sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_messages_created_at" ON "whatsapp_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_interactions_updated_at" ON "interactions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_business_notes_created_at" ON "business_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_live_support_leads_created_at" ON "live_support_leads" USING btree ("created_at");
