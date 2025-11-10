# Wumpy MUD Documentation Index

**Last Updated:** 2025-11-10
**Status:** In Reorganization

## Quick Start (For AI Agents)

**New to combat code?** Start here:
1. [Combat Overview](wiki/systems/combat-overview.md) - System overview
2. [Combat Stats Reference](reference/combat-stats.md) - Quick lookup
3. Check existing docs in `/docs/library/combat/` and `/docs/systems/combat/` (being consolidated)

**New to item system?** Start here:
1. [Item Properties Overview](reference/item-properties.md) - Quick reference hub
2. Check existing docs in `/docs/systems/items/` (being consolidated)
3. Check `/src/config/itemsConfig.js` for item definitions

**Working on existing feature?**
- Check [Wiki Index](wiki/_wiki-index.md) for system docs (under construction)
- Check legacy docs in current structure
- Check [Work Logs](work-logs/README.md) for recent sessions

## Documentation Map

### Wiki (AI Agent Context)

Primary source for understanding systems and mechanics. **Under Construction.**

**Systems (High-Level Overviews):**
- [Combat System](wiki/systems/combat-overview.md) - Combat mechanics, flow, integration ✓
- Item System - Being consolidated from `/docs/systems/items/`
- Corpse System - Being consolidated from `/docs/implementation/`
- Inventory System - Being consolidated
- Admin System - Being consolidated

**Mechanics (Detailed Rules):**
- Attack Resolution - Planned
- Damage Calculation - Planned
- Armor Class - Planned
- Proficiency System - Planned
- Item Properties - Planned

**Architecture (Code Structure):**
- Command System - To be created from existing docs
- Combat Flow - To be created
- Timer System - To be created from corpse system docs
- Event System - To be created
- Data Schemas - To be created

**Patterns (How-Tos for Common Tasks):**
- Adding Commands - Planned
- Creating Items - Planned
- Creating NPCs - Planned

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

- [Phase Reports](archive/phase-reports/) - Old phase completion reports
- [Old Reviews](archive/old-reviews/) - Superseded code reviews
- [Superseded](archive/superseded/) - Obsolete specs

## Legacy Documentation (Being Reorganized)

**Current structure** (will be consolidated into wiki):
- `/docs/library/` - Various topic docs
- `/docs/systems/` - System-specific docs
- `/docs/architecture/` - Architecture docs
- `/docs/implementation/` - Implementation phase docs
- `/docs/reports/` - Session reports and reviews
- `/docs/reviews/` - Code reviews
- `/docs/proposals/` - Feature proposals
- `/docs/design/` - Design documents

These directories contain valuable content being consolidated into the new wiki structure.

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

**Week 1 Goals:**
- [x] Create new directory structure
- [x] Create DOC_STANDARDS.md
- [x] Create templates
- [x] Create master index (this file)
- [x] Create combat-stats reference
- [x] Create item-properties reference (split into 4 focused docs)
- [x] Create combat-overview wiki page
- [x] Create wiki index
- [x] Convert recent sessions to work logs

**Future Phases:**
- Week 2-3: Consolidate existing docs into wiki pages
- Week 3: Complete navigation system
- Week 4: Archive old docs and cleanup
