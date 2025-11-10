---
title: Architecture Documentation
status: current
last_updated: 2025-11-10
related: [combat-overview, item-system, command-system]
---

# Architecture Documentation

Code architecture and structure documentation for Wumpy's core systems. These pages explain how systems work internally, their design patterns, and integration points.

## Available Pages

- [**Command System**](command-system.md) - Command parsing, registration, execution, and guard patterns
- [**Combat Flow**](combat-flow.md) - CombatEngine, CombatEncounter, round execution, and death handling
- [**Timer System**](timer-system.md) - TimerManager, event-driven timers, and persistence
- [**Event System**](event-system.md) - EventEmitter patterns, event handling, and system decoupling
- [**Data Schemas**](data-schemas.md) - Player, NPC, Item, and Room data structures

## Architecture vs System Docs

| Doc Type | Focus | Example |
|----------|-------|---------|
| **Architecture** | How code works internally | Command registration flow, combat round execution |
| **System Overview** | What features exist | Combat mechanics, item types, equipment slots |
| **Pattern/How-To** | How to use/extend | Adding commands, creating NPCs |
| **Reference** | Quick lookup tables | Item properties, combat stats, command list |

See [System Overviews](../systems/) for feature-focused documentation.

See [Patterns](../patterns/) for implementation guides.

## See Also

- [Combat System Overview](../systems/combat-overview.md) - Combat mechanics and features
- [Item System Overview](../systems/item-system.md) - Item types and equipment
- [Corpse System Overview](../systems/corpse-system.md) - Corpse decay and respawn
- [Adding Commands Pattern](../patterns/adding-commands.md) - How to create commands
- [Creating NPCs Pattern](../patterns/creating-npcs.md) - How to define NPCs
