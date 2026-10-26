CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"series_id" uuid,
	"project_id" uuid,
	"name" text NOT NULL,
	"supply_id" uuid,
	"quantity" numeric(12, 2),
	"unit" text DEFAULT '' NOT NULL,
	"space_id" uuid,
	"notes" text DEFAULT '' NOT NULL,
	"series_material_id" uuid,
	"one_off" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "materials_one_owner" CHECK (num_nonnulls("materials"."series_id", "materials"."project_id") = 1),
	CONSTRAINT "materials_series_rows_plain" CHECK ("materials"."series_id" is null or (not "materials"."one_off" and "materials"."series_material_id" is null))
);
--> statement-breakpoint
CREATE TABLE "project_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"title" text NOT NULL,
	"how_to" text DEFAULT '' NOT NULL,
	"contact_id" uuid,
	"search_doc" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_series_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"text" text NOT NULL,
	"space_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_series_spaces" (
	"series_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	CONSTRAINT "project_series_spaces_series_id_space_id_pk" PRIMARY KEY("series_id","space_id")
);
--> statement-breakpoint
ALTER TABLE "project_items" ADD COLUMN "series_item_id" uuid;--> statement-breakpoint
ALTER TABLE "project_items" ADD COLUMN "one_off" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "extra_units" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_series_id_project_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."project_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_series_material_id_materials_id_fk" FOREIGN KEY ("series_material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series" ADD CONSTRAINT "project_series_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series" ADD CONSTRAINT "project_series_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series" ADD CONSTRAINT "project_series_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series" ADD CONSTRAINT "project_series_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_items" ADD CONSTRAINT "project_series_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_items" ADD CONSTRAINT "project_series_items_series_id_project_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."project_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_items" ADD CONSTRAINT "project_series_items_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_items" ADD CONSTRAINT "project_series_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_items" ADD CONSTRAINT "project_series_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_spaces" ADD CONSTRAINT "project_series_spaces_series_id_project_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."project_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_series_spaces" ADD CONSTRAINT "project_series_spaces_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_series" ON "materials" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "materials_project" ON "materials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "materials_supply" ON "materials" USING btree ("supply_id");--> statement-breakpoint
CREATE INDEX "project_series_property" ON "project_series" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "project_series_search" ON "project_series" USING gin ("search_doc");--> statement-breakpoint
CREATE INDEX "project_series_items_series" ON "project_series_items" USING btree ("series_id");--> statement-breakpoint
ALTER TABLE "project_items" ADD CONSTRAINT "project_items_series_item_id_project_series_items_id_fk" FOREIGN KEY ("series_item_id") REFERENCES "public"."project_series_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_series_id_project_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."project_series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_series" ON "projects" USING btree ("series_id");