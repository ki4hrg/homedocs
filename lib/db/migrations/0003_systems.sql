CREATE TABLE "systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"seed_key" text,
	"name" text NOT NULL,
	"icon" text DEFAULT 'system' NOT NULL,
	"trades" text[] DEFAULT '{}'::text[] NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"search_doc" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD COLUMN "system_id" uuid;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "systems" ADD CONSTRAINT "systems_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "systems_property" ON "systems" USING btree ("property_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "systems_seed" ON "systems" USING btree ("property_id","seed_key");--> statement-breakpoint
CREATE INDEX "systems_search" ON "systems" USING gin ("search_doc");--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_system_id_systems_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."systems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixtures_system" ON "fixtures" USING btree ("property_id","system_id");--> statement-breakpoint
-- Seed every existing home with the starting systems (lib/systems/seeds.ts).
INSERT INTO "systems" ("property_id", "seed_key", "name", "icon", "trades", "sort", "search_doc")
SELECT p.id, s.key, s.name, s.icon, s.trades, s.sort,
       setweight(to_tsvector('english', s.name), 'A') || setweight(to_tsvector('english', array_to_string(s.trades, ' ')), 'B')
FROM "properties" p
CROSS JOIN (VALUES
  ('water', 'Water & plumbing', 'water', ARRAY['plumber', 'water & sewer'], 1),
  ('electrical', 'Electrical', 'bolt', ARRAY['electrician', 'electric'], 2),
  ('hvac', 'Heating & cooling', 'climate', ARRAY['hvac'], 3),
  ('gas', 'Gas', 'flame', ARRAY['gas', 'propane'], 4),
  ('sewer', 'Sewer & septic', 'drain', ARRAY['septic', 'water & sewer'], 5),
  ('irrigation', 'Irrigation', 'leaf', ARRAY['landscaper'], 6),
  ('safety', 'Safety & security', 'shield', ARRAY['locksmith'], 7),
  ('network', 'Internet & Wi-Fi', 'wifi', ARRAY['internet'], 8)
) AS s(key, name, icon, trades, sort);
--> statement-breakpoint
-- Put existing fixtures in the obvious system, by the same rules as guessSystemKey(); first match wins.
UPDATE "fixtures" f SET "system_id" = sys.id
FROM (
  SELECT f2.id AS fixture_id,
    CASE
      WHEN t ~ 'septic|sewer|clean-?out|ejector' THEN 'sewer'
      WHEN t ~ 'irrigation|sprinkler|drip line' THEN 'irrigation'
      WHEN t ~ 'water heater|water softener|tankless' THEN 'water'
      WHEN t ~ '\ygas\y|propane' THEN 'gas'
      WHEN t ~ 'hvac|furnace|air handler|\ya/?c\y|air condition|heat pump|thermostat|boiler|mini-?split|ductless|air filter' THEN 'hvac'
      WHEN t ~ '\ywater\y|plumb|shut-?off|valve|faucet|toilet|sink|sump|well pump|hose bib|spigot' THEN 'water'
      WHEN t ~ 'electric|breaker|\ypanel\y|outlet|gfci|generator|subpanel' THEN 'electrical'
      WHEN t ~ 'smoke|carbon monoxide|\yco\y|alarm|lock|extinguisher|camera|doorbell' THEN 'safety'
      WHEN t ~ 'router|modem|wi-?fi|network|access point|ethernet' THEN 'network'
    END AS key
  FROM "fixtures" f2, lower(f2.category || ' ' || f2.name) AS t
  WHERE f2.deleted_at IS NULL
) guess
JOIN "systems" sys ON sys.seed_key = guess.key
WHERE f.id = guess.fixture_id AND sys.property_id = f.property_id;
--> statement-breakpoint
-- The system's name joins its fixtures' search documents (rebuild.ts does the same from now on).
UPDATE "fixtures" f SET "search_doc" = coalesce(f.search_doc, ''::tsvector) || setweight(to_tsvector('english', s.name), 'B')
FROM "systems" s WHERE s.id = f.system_id;
--> statement-breakpoint
-- Homebox subtitles stored with a built-in type's translation key ("Main floor · global.location"); clients.ts no longer writes them.
UPDATE "external_refs" SET "subtitle" = regexp_replace(regexp_replace("subtitle", ' · global\.[a-z_.]+', '', 'g'), '^global\.[a-z_.]+( · )?', '')
WHERE "system" = 'homebox' AND "subtitle" ~ 'global\.';
