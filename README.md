# The Wumpy and Grift

![Banner: Street with Grift](figures/banner-street-grift.png)

> "You can't just go building a better world for people. Only people can build a better world for people. Otherwise it's just a cage." - Terry Pratchett, *Witches Abroad*

## Welcome to the Wumpy Zone

So you've stumbled into our corner of the multiverse. Good. Excellent, even. You're about to enter a text-based Multi-User Dungeon that exists at the precise intersection of:

- Your childhood nostalgia (the good parts AND the weird parts)
- The glorious 90s MUD tradition (LooneyMUD veterans know what's up)
- The philosophical question: "What if we could kick Wumpies?"
- A D20 combat system (because violence needs structure)
- Terry Pratchett's wit meeting Stephen King's atmosphere in a dark alley

![The Circular Login](figures/logo-circular-login.png)

This is **The Wumpy and Grift**, a passion project, a digital hangout, and a place where the Transformers have a guild with a hottub. Because why not? The Yellow Wumpy insisted, and honestly, you don't say no to Yellow Wumpy when they're vibrating with that much enthusiasm.

## What Even IS This?

Picture Sesame Street. Now picture it slightly... off. There are Wumpies wandering around - color-coded for your kicking convenience. There's Reality Street at the end of the block (don't go there unless you're ready). There's a bar, a general store, and somewhere, Gronk the Wumpy Gladiator is wearing a suit of armor made from the bones of their fallen kin. It's fine. Everything is fine.

This MUD features:

- **D20 Combat System** - Proficiency-based violence with dice rolls, modifiers, and tactical regret
- **Kickable Wumpies** - Red ones suspect you owe them money. Purple ones maintain perfect posture while airborne. Blue ones accept their fate philosophically. Yellow ones go "WHEEEEE!" Green ones are filing incident reports.
- **Item System** - Weapons, armor, consumables, and that one sword that's "optimistically pre-weathered"
- **NPC Encounters** - Intelligent enemies with loot tables and questionable life choices
- **Corpse System** - Death creates lootable corpses with decay timers (it's like composting, but sadder)
- **Persistent World** - Room-based navigation where your stuff stays where you left it
- **Admin Tools** - Role-based permissions for when things inevitably get weird

![Banner: Street with Portals](figures/banner-street-portals.png)

## Quick Start (For the Impatient)

The Yellow Wumpy wrote this section. Green Wumpy edited it for accuracy.

```bash
npm install
npm start
```

Connect via telnet: `telnet localhost 4000`

That's it. You're in. Start kicking things. We won't judge. (Green Wumpy will judge. Green Wumpy judges EVERYTHING.)

## For the Organized Minds (Green Wumpy Approved)

Our documentation uses two complementary systems - choose your path:

### Navigation Hub
**[Documentation Navigation Guide](docs/_NAVIGATION.md)** - Lost? Start here to find your way

**[Documentation Index](docs/_INDEX.md)** - Complete map of all documentation (yes, we have maps)

**[Wiki](docs/wiki/_wiki-index.md)** - Authoritative system documentation (how things work)

### Quick Paths by Purpose

**Understanding Systems (Wiki):**
- **Systems**: [Combat](docs/wiki/systems/combat-overview.md), [Items](docs/wiki/systems/item-system.md), [Corpses](docs/wiki/systems/corpse-system.md)
- **Architecture**: [Commands](docs/wiki/architecture/command-system.md), [Combat Flow](docs/wiki/architecture/combat-flow.md), [Timers](docs/wiki/architecture/timer-system.md), [Events](docs/wiki/architecture/event-system.md), [Data Schemas](docs/wiki/architecture/data-schemas.md)
- **Patterns**: [Adding Commands](docs/wiki/patterns/adding-commands.md), [Creating Items](docs/wiki/patterns/creating-items-basics.md), [Creating NPCs](docs/wiki/patterns/creating-npcs.md)

**Quick Reference Tables:**
- [Combat Stats](docs/reference/combat-stats.md)
- [Item Properties](docs/reference/item-properties.md)

**Practical Guides (Library):**
- [Combat Quick Start](docs/library/combat/COMBAT_QUICK_START.md) - Player guide
- [Agent Guidelines](docs/library/general/AGENTS.md) - For AI contributors
- [Features Roadmap](docs/plans-roadmaps/FEATURES_ROADMAP.md) - Planned features

### For AI Agents & Contributors

**[Documentation Standards](/.claude/DOC_STANDARDS.md)** - Required reading before contributing (Green Wumpy wrote these)

Quick reference for AI agents (Yellow Wumpy translation: "THE RULES!"):
1. Update existing wiki pages rather than creating new files (we have ENOUGH files, thank you)
2. Use templates from `/docs/_TEMPLATES/` for any new documents (consistency is beautiful)
3. Work logs go in `/docs/work-logs/` for session summaries (document EVERYTHING)
4. Check `/docs/_INDEX.md` for the current documentation structure (no, seriously, check it)

### Common Tasks (aka "I Want To...")

**I want to add a new command** → [Adding Commands Pattern](docs/wiki/patterns/adding-commands.md)

**I want to create new items** → [Creating Items Basics](docs/wiki/patterns/creating-items-basics.md) and [Advanced](docs/wiki/patterns/creating-items-advanced.md)

**I want to create NPCs** → [Creating NPCs Pattern](docs/wiki/patterns/creating-npcs.md)

**I want to understand combat mechanics** → [Combat System Overview](docs/wiki/systems/combat-overview.md) + [Combat Stats Reference](docs/reference/combat-stats.md)

**I want to understand the item system** → [Item System Overview](docs/wiki/systems/item-system.md)

**I want to see recent changes** → [Work Logs](docs/work-logs/README.md)

**I want to kick a Wumpy** → Just do it. They're expecting it. Some of them WANT it. (Looking at you, Yellow.)

![Banner: Late Night Session](figures/banner-late-night-session.png)

## Project Structure (The Map)

```
/src/                 - Core game engine code (the important bits)
  /commands/          - Player command implementations (kick, look, attack, etc.)
  /combat/            - Combat engine and mechanics (dice go clicky-clack)
  /systems/           - Game systems (corpses, inventory, existential dread)
  /admin/             - Administrative tools (for when you need to smite someone)
/world/               - Room definitions and world data (where the Wumpies live)
/data/                - NPCs, items, and configuration (the stuff IN the world)
/tests/               - Test suites (proof that we occasionally test things)
/docs/                - All project documentation (SO. MUCH. DOCUMENTATION.)
  /wiki/              - Primary documentation (systems, architecture, patterns)
  /reference/         - Quick lookup tables (for when you need answers NOW)
  /work-logs/         - Session logs (the archaeological record)
  /archive/           - Historical documentation (the ancient texts)
/figures/             - Images and banners (pretty pictures!)
```

## Development (For the Brave)

### Running Tests

```bash
npm test                    # Run all tests (brace yourself)
npm run test:combat         # Combat system tests (violence verification)
npm run test:dice           # Dice rolling tests (RNG archaeology)
npm run test:modifiers      # Modifier calculation tests (math, ugh)
npm run test:integration    # Integration tests (does it all work together?)
```

### Key Technologies

- **Node.js** - Server runtime (the foundation)
- **Net Module** - Telnet server implementation (old school cool)
- **JSON Files** - Data persistence (players, items, NPCs stored as readable text)
- **Event-Driven Architecture** - Game loop and timer management (the heartbeat)

## The World (Where You'll Spend Your Time)

The initial realm is **Sesame Street** - but not the one you remember. Well, maybe the one you remember if you spent the 90s on LooneyMUD. It features:

- A general store (Oscar's Discount Emporium - "If it's not broken, we broke it!")
- A bar (123 Sesame Speakeasy - where the Wumpies drink their feelings)
- Wandering Wumpies (they're everywhere, they're color-coded, they're kickable)
- Twisted versions of beloved characters (they've seen some things)
- A teleport booth (for accessing other realms, when we build them)
- The entrance to Reality Street (don't go there, seriously, Yellow Wumpy tried once and came back different)

Future realms in development:
- **Reality Street** - The dark mirror of Sesame Street (drugs, danger, existential dread)
- **The Simpsons**, **Florida**, **Texas**, **Disney World** - Additional satirical playgrounds
- **Saturday Morning Cartoons** - Where cartoon universes collide (and it's someone else's problem)
- **Wumpy University** - The esteemed institution of higher learning (Go Fighting Wumpies!)

## Documentation Status (Green Wumpy's Pride)

Phase 2 of documentation reorganization is complete, and Green Wumpy is VERY pleased:

- Foundation and directory structure (everything has a place)
- 3 system overview pages (combat, items, corpses)
- 5 architecture pages (commands, combat flow, timers, events, data schemas)
- 4 pattern/how-to pages (commands, items basic/advanced, NPCs)
- Navigation enhancement with frontmatter and cross-links (HYPER-ORGANIZED)
- Archive cleanup (65+ historical files properly filed away)
- Reference tables for quick lookup (answers at your fingertips)

See [Documentation Index](docs/_INDEX.md) for complete status and organization. Green Wumpy updates it religiously.

## Contributing (Join the Chaos)

This project follows these key principles (as dictated by Green Wumpy, approved by Yellow Wumpy):

1. **Documentation First** - Update docs before or alongside code changes (or face Green Wumpy's judgment)
2. **Test Coverage** - Add tests for new features (we like knowing things work)
3. **Clear Commits** - Use conventional commit format (git log should tell a story)
4. **No AI Branding** - Keep outputs clean (see `.claude/instructions.md`)
5. **Have Fun** - If you're not enjoying yourself, you're doing it wrong (Yellow Wumpy's only rule)

Read [Documentation Standards](/.claude/DOC_STANDARDS.md) before contributing to documentation. Green Wumpy is watching.

## A Note From the Wumpies

**Yellow Wumpy**: "HI! WELCOME! This is going to be SO MUCH FUN! Are you ready? I'm ready! LET'S GO!"

**Green Wumpy**: "Please read the documentation thoroughly. Everything is documented. We have standards. Also, Yellow Wumpy, stop shouting."

**Blue Wumpy**: "You're here now. That's... that's fine. We're all here. Together. In this text-based reality. It's all very existential."

**Purple Wumpy**: "I suppose you'll do. Try not to break anything. I have standards."

**Red Wumpy**: "You owe me money. Don't think I've forgotten."

**Gronk the Wumpy Gladiator**: "Welcome to the arena. The bone armor? Don't ask. Just... don't ask."

## License

ISC

---

*Built with Node.js, questionable life choices, and an unreasonable amount of enthusiasm for kicking Wumpies.*

*For Death's sake, make sure the exits actually connect to real rooms.*
