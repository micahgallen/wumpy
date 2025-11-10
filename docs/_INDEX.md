# Wumpy MUD Documentation Index

**Last Updated:** 2025-11-10
**Status:** In Reorganization

## Quick Start (For AI Agents)

**New to combat code?** Start here:
1. [Combat Overview](wiki/systems/combat-overview.md) - System overview
2. [Combat Stats Reference](reference/combat-stats.md) - Quick lookup
3. Check existing docs in `/docs/library/combat/` and `/docs/systems/combat/` (being consolidated)

**New to item system?** Start here:
1. [Item System Overview](wiki/systems/item-system.md) - System architecture
2. [Creating Items](wiki/patterns/creating-items.md) - How-to guide
3. [Item Properties Reference](reference/item-properties.md) - Quick reference hub

**Working on existing feature?**
- Check [Wiki Index](wiki/_wiki-index.md) for system docs (under construction)
- Check legacy docs in current structure
- Check [Work Logs](work-logs/README.md) for recent sessions

## Documentation Map

### Wiki (AI Agent Context)

Primary source for understanding systems and mechanics. **Under Construction.**

**Systems (High-Level Overviews):**
- [Combat System](wiki/systems/combat-overview.md) - Combat mechanics, flow, integration ✓
- [Item System](wiki/systems/item-system.md) - Items, equipment, weapons, armor ✓
- [Corpse System](wiki/systems/corpse-system.md) - Corpse lifecycle, decay, respawn ✓
- Inventory System - Being consolidated
- Admin System - Being consolidated

**Mechanics (Detailed Rules):**
- [Corpse Mechanics](wiki/mechanics/corpse-mechanics.md) - Decay timers, respawn rules, looting ✓
- Attack Resolution - Planned
- Damage Calculation - Planned
- Armor Class - Planned
- Proficiency System - Planned
- Item Properties - Planned

**Architecture (Code Structure):**
- [Command System](wiki/architecture/command-system.md) - Command parsing, registration, execution ✓
- [Combat Flow](wiki/architecture/combat-flow.md) - CombatEngine, CombatEncounter, round execution ✓
- [Timer System](wiki/architecture/timer-system.md) - TimerManager, event-driven timers ✓
- [Event System](wiki/architecture/event-system.md) - EventEmitter patterns, event handling ✓
- [Data Schemas](wiki/architecture/data-schemas.md) - Player, NPC, Item, Room structures ✓

**Patterns (How-Tos for Common Tasks):**
- [Adding Commands](wiki/patterns/adding-commands.md) - Create new player commands ✓
- [Creating Items - Basics](wiki/patterns/creating-items-basics.md) - Core item types ✓
- [Creating Items - Advanced](wiki/patterns/creating-items-advanced.md) - Hooks and testing ✓
- [Creating NPCs](wiki/patterns/creating-npcs.md) - NPC definition, combat stats, loot ✓

### Reference (Quick Lookup)

Tables and formulas only, no prose.

- [Combat Stats](reference/combat-stats.md) - Proficiency, HP, modifiers ✓
- [Item Properties Overview](reference/item-properties.md) - Hub for item references ✓
  - [Item Types](reference/item-types.md) - Types, rarity, slots ✓
  - [Item Combat](reference/item-combat.md) - Weapons, armor, damage ✓
  - [Item Systems](reference/item-systems.md) - Attunement, proficiency, etc. ✓
  - [Item Loot](reference/item-loot.md) - Spawn tags, code reference ✓
- Damage Types - Planned
- Command List - Planned

### Guides

**For Creators (Non-Coders):**
- Creating Rooms - Planned
- Creating NPCs - Planned
- Creating Items - Planned

**For Players:**
- Getting Started - Planned
- Combat Guide - Planned
- Command Reference - Planned

### Work Logs

Chronological session logs (append-only).

- [Work Logs Index](work-logs/README.md)
- [2025-11](work-logs/2025-11/) - November 2025 sessions

### Specs

Frozen feature specifications.

- Player Corpse System - To be moved from `/docs/proposals/`
- Combat-Item Integration - To be extracted from existing docs

### Decisions

Design decision logs.

- To be created from existing review docs

### Archive

Historical docs (rarely needed).

- [Phase Reports](archive/phase-reports/) - Implementation phase reports and session summaries
  - [Server Refactor](archive/phase-reports/server-refactor/) - November 2025 server.js refactoring (869 → 50 lines)
- [Old Reviews](archive/old-reviews/) - Code reviews from completed phases
- [Superseded](archive/superseded/) - Documentation replaced by wiki pages

## Legacy Documentation Status

**Completed Reorganization:**
- `/docs/implementation/` - Moved to `/docs/archive/phase-reports/` ✓
- `/docs/reports/` - Moved to `/docs/archive/phase-reports/reports/` ✓
- `/docs/reviews/` - Moved to `/docs/archive/old-reviews/` ✓
- Item system docs - Consolidated into wiki, originals in `/docs/archive/superseded/` ✓

**Still Active:**
- `/docs/library/` - Topic-specific documentation
- `/docs/systems/` - System-specific documentation (being consolidated)
- `/docs/architecture/` - Architecture documentation
- `/docs/proposals/` - Feature proposals
- `/docs/design/` - Design documents
- `/docs/plans-roadmaps/` - Project roadmaps and future plans

## Contributing Docs (For AI Agents)

**READ FIRST:** [/.claude/DOC_STANDARDS.md](../.claude/DOC_STANDARDS.md)

**Rules:**
1. Update existing wiki pages, don't create new files without approval
2. Use templates from `/docs/_TEMPLATES/`
3. Work logs only for session summaries
4. No bullets except simple lists
5. Tables for properties, prose for explanations

## Templates

- [System Doc Template](_TEMPLATES/SYSTEM_DOC_TEMPLATE.md)
- [Work Log Template](_TEMPLATES/WORK_LOG_TEMPLATE.md)
- [Feature Spec Template](_TEMPLATES/FEATURE_SPEC_TEMPLATE.md)

## Status Legend

Docs are tagged with status in frontmatter:

- **current** - Reflects live codebase
- **draft** - Work in progress
- **deprecated** - Superseded but kept for reference
- **archived** - Historical, rarely needed

## Reorganization Progress

**Completed:**
- Week 1: Foundation
  - [x] Directory structure and templates
  - [x] Reference docs (combat-stats, item-properties split)
  - [x] Combat overview wiki page
  - [x] Code review fixes applied

- Phase 2.1: Item System
  - [x] Item system wiki page (consolidated from ITEM_SYSTEM_DESIGN.md)
  - [x] Creating items pattern page (consolidated from ITEM_SYSTEM_QUICK_START.md)
  - [x] Updated navigation and cross-links

- Phase 3: Navigation Enhancement
  - [x] Frontmatter metadata on all wiki pages
  - [x] "See Also" cross-links on all pages
  - [x] Wiki index updated

- Phase 4: Cleanup & Archive
  - [x] Moved 12 implementation docs to archive/phase-reports/
  - [x] Moved 9 review docs to archive/old-reviews/
  - [x] Moved 40+ report docs to archive/phase-reports/reports/
  - [x] Archived superseded item system docs
  - [x] Removed empty directories

- Phase 2.3: Architecture Pages
  - [x] Created 5 architecture pages (command-system, combat-flow, timer-system, event-system, data-schemas)
  - [x] Updated navigation files

- Phase 2.4: Pattern Pages
  - [x] Created 2 pattern pages (adding-commands, creating-npcs)
  - [x] Updated navigation files

**Recent Updates:**
- 2025-11-10: Server refactor documentation archived
  - Moved SERVER_REFACTOR_PLAN.md and SERVER_REFACTOR_QUICK_START.md to archive/phase-reports/server-refactor/
  - Added refactored server architecture section to library/general/ARCHITECTURE.txt
  - Documents describe completed November 2025 refactor (869 → 50 lines, 94% reduction)

**Status:** Phase 2 (Architecture & Patterns) complete. Future phases will continue consolidating system documentation into wiki pages.
