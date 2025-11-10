# Wiki Index

**Quick Navigation:** Jump to [Systems](#systems) | [Mechanics](#mechanics) | [Architecture](#architecture) | [Patterns](#patterns)

## Systems

High-level overviews of major game systems. Start here for context.

| System | Status | Description |
|--------|--------|-------------|
| [Combat](systems/combat-overview.md) | Complete | Combat mechanics, phases, integration ✓ |
| [Items](systems/item-system.md) | Complete | Item types, equipment, weapons, armor ✓ |
| [Corpse](systems/corpse-system.md) | Complete | Corpse lifecycle, decay, respawn ✓ |
| Inventory | Planned | Player inventory, containers - to be consolidated |
| Admin | Planned | Admin commands, roles, permissions |

**Location:** `/docs/wiki/systems/`

## Mechanics

Detailed game mechanics and rules. Drill down from systems to understand specific calculations and behaviors.

| Mechanic | Status | Related Systems |
|----------|--------|-----------------|
| [Corpse Mechanics](mechanics/corpse-mechanics.md) | Complete | Combat, Items ✓ |
| Attack Resolution | Planned | Combat |
| Damage Calculation | Planned | Combat, Items |
| Armor Class | Planned | Combat, Items |
| Proficiency | Planned | Combat, Items |
| Item Properties | Planned | Items |
| Consumables | Planned | Items |

**Location:** `/docs/wiki/mechanics/`

## Architecture

Code structure and patterns. Use these to understand implementation details and file organization.

| Component | Status | Key Files |
|-----------|--------|-----------|
| Command System | Planned | commands.js, registry.js |
| Combat Flow | Planned | CombatEngine.js, CombatEncounter.js |
| Timer System | Planned | TimerManager.js |
| Event System | Planned | EventEmitter usage |
| Data Schemas | Planned | Player, NPC, Item, Room |

**Location:** `/docs/wiki/architecture/`

## Patterns

How-to guides for common development tasks. Step-by-step instructions for implementing features.

| Pattern | Purpose | Difficulty | Estimated Time |
|---------|---------|------------|----------------|
| Adding Commands | Create new player commands | Easy | 30 min |
| [Creating Items - Basics](patterns/creating-items-basics.md) | Core item types ✓ | Medium | 45 min |
| [Creating Items - Advanced](patterns/creating-items-advanced.md) | Hooks & testing ✓ | Medium | 45 min |
| Creating NPCs | Add NPCs with combat stats | Medium | 1.5 hours |

**Location:** `/docs/wiki/patterns/`

## Navigation Tips

**Finding related info:**
1. Check "See Also" links at bottom of each page
2. Check "related" field in frontmatter
3. Use Ctrl+F in this index

**For AI agents:**
- Start with **Systems** for high-level context
- Drill into **Mechanics** for specific rules
- Check **Architecture** for code structure
- Use **Patterns** for implementation tasks

**For humans:**
- **New to the project?** Start with system overviews
- **Need quick facts?** Check `/docs/reference/` for tables
- **Implementing a feature?** Check patterns, then architecture
- **Understanding game rules?** Check mechanics

## Current Status

This wiki is under construction as part of documentation reorganization (Week 1, 2025-11).

**Completed:**
- Directory structure created
- Reference docs created (combat-stats, item-properties, item-types, item-combat, item-systems, item-loot)
- Templates and standards in place
- Combat system overview wiki page
- Item system overview wiki page
- Corpse system overview wiki page
- Corpse mechanics detailed page
- Creating Items pattern guides (basics and advanced)

**In Progress:**
- Phase 2: Creating architecture and pattern documentation
- Creating additional system overviews

**Legacy Docs:**
- Existing documentation in `/docs/library/`, `/docs/systems/`, `/docs/implementation/` is being consolidated
- See `/docs/_INDEX.md` for full documentation map

## Contributing

Before creating or editing wiki pages, read:
- [DOC_STANDARDS.md](../../.claude/DOC_STANDARDS.md) - Formatting rules and guidelines
- [Templates](../_TEMPLATES/) - Use these for new pages

**Key principles:**
- Tables over bullets
- Prose summaries over nested lists
- Keep pages focused (200-400 lines max)
- Link to related pages
- Add frontmatter to every page
