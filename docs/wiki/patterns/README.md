---
title: Pattern and How-To Documentation
status: current
last_updated: 2025-11-10
related: [creating-items, creating-npcs, adding-commands, item-system]
---

# Pattern and How-To Documentation

Step-by-step how-to guides for common development tasks. These pages show practical examples of extending Wumpy with new content and features.

## Available Guides

### Items
- [**Creating Items - Basics**](creating-items-basics.md) - Core item types (weapons, armor, consumables, quest items, jewelry)
- [**Creating Items - Advanced**](creating-items-advanced.md) - Custom hooks, testing, domain organization

### Commands
- [**Adding Commands**](adding-commands.md) - Create new player commands with guards and help metadata

### NPCs
- [**Creating NPCs**](creating-npcs.md) - Set up NPCs with combat stats, AI behavior, and loot tables

## Pattern vs Architecture Docs

| Doc Type | Focus | Example |
|----------|-------|---------|
| **Pattern/How-To** | How to use/extend | Adding commands, creating NPCs |
| **Architecture** | How code works internally | Command registration flow, combat round execution |
| **System Overview** | What features exist | Combat mechanics, item types, equipment slots |
| **Reference** | Quick lookup tables | Item properties, combat stats |

See [Architecture](../architecture/) for internal system design.

See [Systems](../systems/) for feature overviews.

## See Also

- [Command System Architecture](../architecture/command-system.md) - Command system internals
- [Data Schemas Architecture](../architecture/data-schemas.md) - Entity data structures
- [Item System Overview](../systems/item-system.md) - Item system features
- [Combat System Overview](../systems/combat-overview.md) - Combat mechanics
