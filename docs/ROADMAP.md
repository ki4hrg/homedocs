# Roadmap

Work agreed on but not yet built. The integrations and Home Assistant plans are in
ARCHITECTURE.md.

## Systems (plumbing, electrical, HVAC…)

**The idea:** a system gathers one part of the house in one place: "Plumbing" holds the main
shutoff, the water heater, the plumber and the softener's salt. It's the natural way to hand the
house over ("here's the water: shutoff, heater, who to call") and the second way into Home, beside
places.

**Proposed shape:**
- **Table:** a `systems` table per property: name, icon, sort, and an optional `trade`, which links
  "Plumbing" to "our plumber".
  - Seeded with Water/plumbing, Electrical, Heating & cooling, Gas, Sewer/septic, Irrigation,
    Security and Network.
  - The family can rename them, add their own or hide them.
- **Fixtures:** `fixtures.system_id` (nullable), one primary system each. The water heater is
  Plumbing even though it burns gas. Reaching for many-to-many isn't worth it yet.
- **System page:**
  - Fixtures grouped by place, with guide fixtures (shutoffs, the panel) first and their photos.
  - The parts those fixtures take.
  - The preferred person for the system's trade.
  - Recent notes, open projects, and Homebox/paperless links (manuals, warranties).
- **House guide:** the emergency card groups by system ("Water: main shutoff, water heater, call
  Ace Plumbing").
- **Home:** a row of system tiles beside the place tiles.
- **MCP:** `get_system` and `list_systems`. `create_fixture` and `find_part_for` take a system.
- **Migration:**
  - Add the table and column, and seed the systems per property.
  - Backfill `system_id` from obvious `fixtures.category` values (shutoff, water heater → Plumbing;
    panel, breaker → Electrical; furnace, AC, thermostat → HVAC), leaving the rest blank.
  - Add `system` to the search document's text, with a cascade on rename.

**Size:** about one focused session. The pieces are one table, one page, the fixture form, the
guide card, Home, and two MCP tools.
