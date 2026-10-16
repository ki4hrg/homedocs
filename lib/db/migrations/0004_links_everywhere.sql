ALTER TABLE "attachments" DROP CONSTRAINT "attachments_one_owner";--> statement-breakpoint
ALTER TABLE "external_refs" DROP CONSTRAINT "external_refs_one_owner";--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "system_id" uuid;--> statement-breakpoint
ALTER TABLE "external_refs" ADD COLUMN "system_id" uuid;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "trade_groups" jsonb;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_system" ON "attachments" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "external_refs_owner_project" ON "external_refs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "external_refs_owner_contact" ON "external_refs" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "external_refs_owner_system" ON "external_refs" USING btree ("system_id");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_one_owner" CHECK (num_nonnulls("attachments"."space_id", "attachments"."fixture_id", "attachments"."supply_id", "attachments"."log_id", "attachments"."contact_id", "attachments"."project_id", "attachments"."quote_id", "attachments"."system_id") = 1);--> statement-breakpoint
ALTER TABLE "external_refs" ADD CONSTRAINT "external_refs_one_owner" CHECK (num_nonnulls("external_refs"."space_id", "external_refs"."fixture_id", "external_refs"."supply_id", "external_refs"."log_id", "external_refs"."contact_id", "external_refs"."project_id", "external_refs"."quote_id", "external_refs"."system_id") = 1);