# Roadmap

Work agreed on but not yet built. The integrations and Home Assistant plans are in
ARCHITECTURE.md.

## Systems: what's left

Systems shipped in October 2026 (table, page, fixture picker, guide grouping, Home tiles, MCP
`list_systems`/`get_system`). Not done yet:
- **Open projects and documents on a system page.** Projects link to places, not fixtures, so a
  system has no projects to show until projects can name fixtures or systems. A system could also
  take a paperless tag the way a place does.
- **`find_part_for` by system** ("what filter does the HVAC take?"). `get_system` answers it today
  with its parts list.
- **Reordering systems.** They keep the seed order, and new ones go last.
