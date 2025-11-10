# Wumpy MUD

A D20-based Multi-User Dungeon (MUD) game server built with Node.js. Wumpy features a text-based combat system, item management, NPC encounters, and a persistent world that players can explore via telnet.

## Quick Start

```bash
npm install
npm start
```

Connect via telnet: `telnet localhost 4000`

## Project Overview

Wumpy is a classic-style MUD with modern JavaScript architecture. The game features:

- **D20 Combat System** - Proficiency-based combat with dice rolls, modifiers, and tactical options
- **Item System** - Weapons, armor, consumables with complex properties and interactions
- **NPC Encounters** - Intelligent enemies with loot tables and respawn mechanics
- **Corpse System** - Player death creates lootable corpses with decay timers
- **Persistent World** - Room-based navigation with item and NPC spawning
- **Admin Tools** - Role-based permissions for server management

## Documentation

Our documentation is organized to help you find information quickly:

### Primary Documentation (Start Here)

**[Documentation Index](/home/micah/wumpy/docs/_INDEX.md)** - Complete map of all documentation

**[Wiki](/home/micah/wumpy/docs/wiki/_wiki-index.md)** - Primary source for system understanding

Key wiki pages:
- **Systems**: [Combat](/home/micah/wumpy/docs/wiki/systems/combat-overview.md), [Items](/home/micah/wumpy/docs/wiki/systems/item-system.md), [Corpses](/home/micah/wumpy/docs/wiki/systems/corpse-system.md)
- **Architecture**: [Commands](/home/micah/wumpy/docs/wiki/architecture/command-system.md), [Combat Flow](/home/micah/wumpy/docs/wiki/architecture/combat-flow.md), [Timers](/home/micah/wumpy/docs/wiki/architecture/timer-system.md), [Events](/home/micah/wumpy/docs/wiki/architecture/event-system.md), [Data Schemas](/home/micah/wumpy/docs/wiki/architecture/data-schemas.md)
- **Patterns**: [Adding Commands](/home/micah/wumpy/docs/wiki/patterns/adding-commands.md), [Creating Items](/home/micah/wumpy/docs/wiki/patterns/creating-items-basics.md), [Creating NPCs](/home/micah/wumpy/docs/wiki/patterns/creating-npcs.md)

**[Reference Tables](/home/micah/wumpy/docs/reference/)** - Quick lookup for stats, properties, and formulas
- [Combat Stats](/home/micah/wumpy/docs/reference/combat-stats.md)
- [Item Properties](/home/micah/wumpy/docs/reference/item-properties.md)

### For AI Agents & Contributors

**[Documentation Standards](/.claude/DOC_STANDARDS.md)** - Required reading before contributing to docs

Quick reference for AI agents:
1. Update existing wiki pages rather than creating new files
2. Use templates from `/docs/_TEMPLATES/` for any new documents
3. Work logs go in `/docs/work-logs/` for session summaries
4. Check `/docs/_INDEX.md` for the current documentation structure

### Common Tasks

**I want to add a new command** → [Adding Commands Pattern](/home/micah/wumpy/docs/wiki/patterns/adding-commands.md)

**I want to create new items** → [Creating Items Basics](/home/micah/wumpy/docs/wiki/patterns/creating-items-basics.md) and [Advanced](/home/micah/wumpy/docs/wiki/patterns/creating-items-advanced.md)

**I want to create NPCs** → [Creating NPCs Pattern](/home/micah/wumpy/docs/wiki/patterns/creating-npcs.md)

**I want to understand combat mechanics** → [Combat System Overview](/home/micah/wumpy/docs/wiki/systems/combat-overview.md) + [Combat Stats Reference](/home/micah/wumpy/docs/reference/combat-stats.md)

**I want to understand the item system** → [Item System Overview](/home/micah/wumpy/docs/wiki/systems/item-system.md)

**I want to see recent changes** → [Work Logs](/home/micah/wumpy/docs/work-logs/README.md)

## Project Structure

```
/src/                 - Core game engine code
  /commands/          - Player command implementations
  /combat/            - Combat engine and mechanics
  /systems/           - Game systems (corpses, inventory, etc.)
  /admin/             - Administrative tools
/world/               - Room definitions and world data
/data/                - NPCs, items, and configuration
/tests/               - Test suites
/docs/                - All project documentation
  /wiki/              - Primary documentation (systems, architecture, patterns)
  /reference/         - Quick lookup tables
  /work-logs/         - Session logs
  /archive/           - Historical documentation
```

## Development

### Running Tests

```bash
npm test                    # Run all tests
npm run test:combat         # Combat system tests
npm run test:dice           # Dice rolling tests
npm run test:modifiers      # Modifier calculation tests
npm run test:integration    # Integration tests
```

### Key Technologies

- **Node.js** - Server runtime
- **Net Module** - Telnet server implementation
- **JSON Files** - Data persistence (players, items, NPCs)
- **Event-Driven Architecture** - Game loop and timer management

## Documentation Status

Phase 2 of documentation reorganization is complete:

- Foundation and directory structure
- 3 system overview pages (combat, items, corpses)
- 5 architecture pages (commands, combat flow, timers, events, data schemas)
- 4 pattern/how-to pages (commands, items basic/advanced, NPCs)
- Navigation enhancement with frontmatter and cross-links
- Archive cleanup (65+ historical files organized)
- Reference tables for quick lookup

See [Documentation Index](/home/micah/wumpy/docs/_INDEX.md) for complete status and organization.

## Contributing

This project follows these key principles:

1. **Documentation First** - Update docs before or alongside code changes
2. **Test Coverage** - Add tests for new features
3. **Clear Commits** - Use conventional commit format
4. **No AI Branding** - Keep outputs clean (see `.claude/instructions.md`)

Read [Documentation Standards](/.claude/DOC_STANDARDS.md) before contributing to documentation.

## License

ISC
