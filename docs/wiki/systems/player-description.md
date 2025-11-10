---
title: Player Description System
status: current
last_updated: 2025-11-10
related: [command-system, data-schemas, creating-items]
---

# Player Description System

The Player Description System generates rich, narrative descriptions when players examine each other using the `look` command. The system combines base descriptions, level-based qualitative tiers, modular modifiers from game systems, and equipment displays into cohesive text that follows the MUD's Pratchett-inspired writing style.

## Core Concepts

Player descriptions assemble dynamically from six distinct components. The header displays the player's name with color formatting, ghost status indicator, and level number. A level tier provides qualitative narrative text based on character level, replacing raw numbers with descriptions like "a seasoned traveler" or "a living myth." The base description contains either player-customized text (via the `describe` command) or a randomized default. Description modifiers are sentences added by game systems such as guilds, tattoos, quests, or magical effects, each with a priority value controlling display order. Ghost status adds special ethereal text for deceased players. Equipment summary lists visible equipped items including weapons, armor, and jewelry.

## Component Structure

| Component | Source | Required | Example |
|-----------|--------|----------|---------|
| Header | Player name + level | Yes | "Shadowblade [Level 15]" |
| Level Tier | 7 narrative tiers | Yes | "You see a veteran campaigner..." |
| Base Description | Player-set or default | Yes | "A weathered warrior with keen eyes..." |
| Modifiers | Game systems | No | "The crimson tabard of the Warriors Guild..." |
| Ghost Status | Death system | Conditional | "Their form is translucent and ethereal..." |
| Equipment | EquipmentManager | Optional | "They are wielding Iron Sword..." |

## Level Tier System

Seven narrative tiers replace raw level numbers with thematic descriptions. Each tier includes a primary description and 2-3 variants shown randomly 30% of the time for variety.

| Level Range | Title | Theme |
|-------------|-------|-------|
| 1-3 | Fresh-faced novice | Naive optimism and belief in destiny |
| 4-7 | Promising adventurer | Learning from harsh lessons |
| 8-12 | Seasoned traveler | Confident from surviving dangers |
| 13-17 | Veteran campaigner | Battle-hardened awareness |
| 18-22 | Renowned champion | Power radiating visibly |
| 23-27 | Legendary hero | Epic-level prowess |
| 28-99 | Living myth | Reality-bending might |

## Description Modifiers

Modifiers are sentence fragments stored as objects with four properties: text (the description), source (unique identifier), priority (0-100 display order), and addedAt (timestamp). Game systems add modifiers to communicate visible character traits, temporary effects, or achievements.

Priority ranges organize modifiers by importance. Legendary achievements and divine blessings use 90-100. Guild membership and major affiliations use 70-89. Tattoos, scars, and permanent modifications use 50-69. Temporary magical effects and buffs use 30-49. Minor cosmetic effects use 10-29. Subtle background details use 0-9.

Source identifiers follow the naming convention `{system}_{specific_id}`, such as `guild_warriors`, `tattoo_dragon`, `quest_heroic_deed`, or `effect_arcane_aura`. This prevents collisions and makes the origin clear.

## API Usage

The PlayerDescriptionService provides the core functionality. To generate a complete description, call `generateDescription(player, options)` where options can specify `isSelf`, `showEquipment`, and `showLevel` flags.

Adding a modifier requires the player object, description text, unique source identifier, priority value, and optional playerDB for persistence:

```javascript
const PlayerDescriptionService = require('./systems/description/PlayerDescriptionService');

PlayerDescriptionService.addDescriptionModifier(
  player,
  'The crimson tabard of the Warriors Guild marks them as a trained combatant.',
  'guild_warriors',
  80,
  playerDB
);
```

Removing a modifier only requires the player object, source identifier, and optional playerDB:

```javascript
PlayerDescriptionService.removeDescriptionModifier(player, 'guild_warriors', playerDB);
```

Checking for existence uses `hasDescriptionModifier(player, source)` returning a boolean. Retrieving the full modifier object uses `getDescriptionModifier(player, source)` returning the object or null. Clearing all modifiers uses `clearDescriptionModifiers(player, playerDB)`.

## Integration Points

The system integrates with multiple game components. The Player class stores a `descriptionModifiers` array property. PlayerDB handles persistence, automatically saving modifiers when added or removed and loading them on player login with backwards compatibility. The look command in `src/commands/core/look.js` calls `generateDescription()` when examining players. EquipmentManager provides visible item details for the equipment summary section.

The equipment display shows the most visible equipped items: weapons (main_hand, off_hand), major armor pieces (chest, head, legs, feet, back), and prominent jewelry (neck). Other slots like rings, gloves, and trinkets are omitted to prevent description bloat.

## Writing Style Guidelines

All modifier text follows the mud-world-builder style guide. Use second-person perspective with "their," "they," and "them" rather than gendered pronouns. Show visible details rather than telling abstract qualities. Include subtle humor and clever observations in the Pratchett tradition. Engage multiple senses beyond just sight. Reference in-world locations, organizations, and culture. Keep descriptions concise at 1-2 sentences maximum. Maintain thematic consistency with the established tone.

Good examples demonstrate these principles effectively. "The scars might be hidden, but you can see them in the way they assess every room for exits and threats" shows experience through behavior. "Reality itself seems slightly uncertain around them, as if checking whether it needs their permission to continue existing" conveys epic power with wit. "They probably know seventeen ways to kill you with a pine cone" adds humor while implying dangerous skill.

Avoid generic descriptions like "They are a member of the Warriors Guild" which lacks flavor. Avoid abstract statements like "This person is very powerful" which tell rather than show. Avoid overly long descriptions that break the 1-2 sentence guideline.

## Example Implementations

Two complete example systems demonstrate the modifier API. The guild system in `examples/description-modifiers/guildModifiers.js` implements eight guilds (Warriors, Mages, Thieves, Healers, Rangers, Merchants, Bards, Necromancers) with functions to add, remove, and check guild modifiers. The tattoo parlor in `examples/description-modifiers/tattooSystem.js` implements ten tattoo designs with currency-based pricing, slot-based collision prevention, and shop interface commands.

## Common Use Cases

Quest rewards grant permanent description modifiers at high priority to commemorate major achievements. Temporary buffs add glowing effects or magical auras at medium priority, removing them after a duration expires. Curses and debuffs add ominous descriptions that persist until the curse is lifted. Environmental effects add temporary modifiers based on location, such as being covered in swamp muck. Reputation systems can add visible marks of fame or infamy. Achievement systems grant modifiers for legendary accomplishments.

## Data Persistence

The PlayerDB system persists modifiers to the `players.json` file. When creating new players, `descriptionModifiers` initializes as an empty array. During authentication, the system loads existing modifiers or initializes the array for legacy players lacking the property. The `savePlayer()` method writes the complete modifiers array to disk. All modifier management functions accept an optional playerDB parameter to trigger automatic persistence.

## Performance Characteristics

Description generation runs in O(n) time where n equals the number of modifiers, typically fewer than 10 per player. Modifier management operations use linear array searches, acceptable for small collections. Database writes occur only when adding or removing modifiers, not on every look command. Memory overhead remains minimal at approximately 1KB per player for typical modifier counts.

## Testing

The test suite in `tests/test_player_description.js` provides comprehensive coverage including basic defaults, custom descriptions, high-level characters, multiple modifiers, equipment display, ghost status, self versus other view, priority ordering, level tier accuracy, and modifier management API. All tests pass successfully.

Manual testing should verify base description appearance, modifier addition and display, correct priority ordering, equipment formatting, ghost status handling, and persistence across logout and login cycles.

## Extending the System

Creating new systems that add modifiers follows a simple pattern. Import PlayerDescriptionService, define modifier text with appropriate priority, call `addDescriptionModifier()` when the effect occurs, and call `removeDescriptionModifier()` when the effect ends. The system handles all formatting, ordering, persistence, and display automatically.

Future enhancements could include dynamic modifiers that change text based on time, location, or conditions. A reaction system could make NPCs respond differently based on visible modifiers. Racial traits could auto-generate modifiers for different character races. Age and experience modifiers could evolve as players level. Environmental effects could add temporary modifiers from weather or location. Modifier conflicts could prevent contradictory descriptions from appearing simultaneously.

## See Also

- [Command System](../architecture/command-system.md) - How commands parse and execute
- [Data Schemas](../architecture/data-schemas.md) - Player object structure
- [Player Description Architecture](../architecture/player-description.md) - Technical implementation details
- [Player Description Examples](../../reference/player-description-examples.md) - Example output showcase
- [Creating Items](../patterns/creating-items-basics.md) - Equipment integration
