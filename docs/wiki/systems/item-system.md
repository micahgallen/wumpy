---
title: Item System
status: current
last_updated: 2025-11-10
related: [combat-overview, item-properties, creating-items]
---

# Item System

The Wumpy item system provides a comprehensive framework for weapons, armor, consumables, jewelry, quest items, and containers. Built on a registry pattern similar to the command system, it supports equipment slots, stat modifiers, combat integration, proficiency requirements, and magical properties.

## Overview

Items in Wumpy follow a definition-instance model where item definitions serve as templates registered in the ItemRegistry, and item instances represent actual in-game objects with state. The system integrates deeply with combat mechanics, equipment slots, inventory management, and the world loading system.

Items are organized by realm in the world structure and loaded at server startup. The architecture supports extensibility through hooks, custom behaviors, and domain-specific items while maintaining core functionality in shared utilities.

## Core Architecture

| Component | Purpose | Location |
|-----------|---------|----------|
| **ItemRegistry** | Central registry for all item definitions | `/src/items/core/ItemRegistry.js` |
| **ItemFactory** | Creates item instances from definitions | `/src/items/core/ItemFactory.js` |
| **ItemDefinition** | Base schema for item templates | `/src/items/core/ItemDefinition.js` |
| **ItemInstance** | Runtime item objects with state | `/src/items/core/ItemInstance.js` |
| **EquipmentManager** | Player equipment and slot management | `/src/items/equipment/EquipmentManager.js` |
| **InventoryManager** | Player inventory and encumbrance | `/src/items/inventory/InventoryManager.js` |

## Item Types

The system supports nine primary item types, each with specialized properties and behaviors:

| Type | Purpose | Key Properties | Example |
|------|---------|----------------|---------|
| **Weapon** | Combat offense | Damage dice, weapon class, proficiency | Longsword (1d8 slashing) |
| **Armor** | Combat defense | AC bonus, armor type, slot | Leather Chest (+2 AC) |
| **Jewelry** | Stat bonuses | Pure stat modifiers, no restrictions | Ring of Strength (+2 STR) |
| **Consumable** | One-time use effects | Charges, consume logic | Health Potion (heals 25 HP) |
| **Quest** | Story items | Non-droppable, quest flags | Big Bird's Letter |
| **Cosmetic** | Appearance mods | Description additions, emotes | Silly Hat |
| **Container** | Holds items | Capacity, loot tables | Treasure Chest |
| **Material** | Crafting components | Stackable resources | Iron Ingot |
| **Misc** | Uncategorized | General items | Rope, Torch |

See [Item Types Reference](../reference/item-types.md) for detailed breakdowns.

## Item Properties

Every item definition includes identity, classification, and flag properties:

| Property Category | Properties | Purpose |
|-------------------|------------|---------|
| **Identity** | id, name, description, keywords | Identification and targeting |
| **Classification** | itemType, subType, rarity | Organization and filtering |
| **Physical** | weight, value | Encumbrance and economy |
| **Flags** | isTakeable, isDroppable, isEquippable, isTradeable | Behavior restrictions |
| **Requirements** | requiredLevel, requiredClass, requiresAttunement | Usage restrictions |
| **Equipment** | slot, statModifiers | Equipment system integration |

See [Item Properties Reference](../reference/item-properties.md) for complete schemas.

## Equipment System

Players can equip items in 17 different slots with slot conflict management for two-handed weapons:

| Slot Category | Slots | Notes |
|---------------|-------|-------|
| **Weapons** | main_hand, off_hand, two_hand | Two-hand conflicts with main/off |
| **Armor** | head, neck, shoulders, chest, back, wrists, hands, waist, legs, feet | Standard D&D-style slots |
| **Jewelry** | ring_1, ring_2, trinket_1, trinket_2 | Stat bonus slots |

Equipment automatically recalculates player stats when items are equipped or removed. The system handles proficiency checks, level requirements, class restrictions, and attunement slots.

## Stat Calculation Flow

When equipment changes, the system recalculates derived stats:

```
Equip/Unequip Item
    ↓
Validate Requirements (level, class, attunement)
    ↓
Update Equipment Slot
    ↓
Trigger onEquip/onUnequip Hooks
    ↓
Recalculate Base Stats (STR, DEX, CON, INT, WIS, CHA)
    ↓
Recalculate Derived Stats (AC, maxHP, proficiency)
    ↓
Update Combat Stats (weapon damage, attack bonus)
```

See [Combat Integration](../reference/item-combat.md) for damage and AC formulas.

## Weapon System

Weapons integrate with the combat system through proficiency classes and damage types:

| Weapon Class | Examples | Typical Proficiency |
|--------------|----------|---------------------|
| **Simple Melee** | Club, dagger, quarterstaff | All classes |
| **Swords** | Longsword, shortsword, scimitar | Warrior, Rogue |
| **Axes** | Battleaxe, handaxe, greataxe | Warrior |
| **Maces** | Mace, warhammer, flail | Warrior, Cleric |
| **Polearms** | Spear, halberd, glaive | Warrior |
| **Bows** | Shortbow, longbow | Rogue, Ranger |
| **Crossbows** | Light, heavy, hand crossbow | Rogue, Warrior |
| **Wands** | Magic wands | Wizard, Sorcerer |
| **Staves** | Magical staves | Wizard, Cleric |

Non-proficient weapon use incurs a -4 attack penalty by default (configurable).

## Armor System

Armor provides AC bonuses with DEX modifier caps based on armor type:

| Armor Type | DEX Cap | Movement Penalty | Stealth Penalty | Example |
|------------|---------|------------------|-----------------|---------|
| **Light** | Unlimited | None | None | Leather (+2 AC) |
| **Medium** | +2 max | Minor | None | Chain Shirt (+4 AC) |
| **Heavy** | +0 | Major | Disadvantage | Plate (+8 AC) |
| **Shield** | N/A | None | None | Wooden Shield (+2 AC) |

Armor proficiency is guild-based. Wearing armor without proficiency may incur penalties (implementation pending).

## Magical Properties

Items can have magical properties that provide bonuses, effects, or proc abilities:

| Property Type | Effect | Example |
|---------------|--------|---------|
| **Extra Damage** | Additional damage dice | +1d6 fire damage |
| **Attack Bonus** | Bonus to hit rolls | +2 to attack |
| **Stat Bonus** | Attribute increase | +2 STR while equipped |
| **Resistance** | Damage reduction % | 50% fire resistance |
| **Life Steal** | Heal on hit | Heal 10% of damage dealt |
| **Autocast Spell** | Trigger spell | Cast Magic Missile on hit |

See [Item Systems Reference](../reference/item-systems.md) for attunement and identification rules.

## Inventory System

Players have inventory with configurable limits:

| Limit Type | Formula | Default |
|------------|---------|---------|
| **Slots** | `baseSlots + (STR * slotsPerStrength)` | 20 + (STR × 2) |
| **Weight** | `baseWeight + (STR * weightPerStrength)` | 100 + (STR × 15) lbs |

Consumables and materials stack up to 99 by default. Equipment items do not stack. Bound items cannot stack with unbound items.

## Container System

Containers can hold items and generate loot from loot tables:

| Container Property | Purpose | Example |
|-------------------|---------|---------|
| **canBeOpened** | Can players open it | true |
| **isLocked** | Requires key or lockpicking | true |
| **keyItemId** | Required key item | "rusty_key" |
| **capacity** | Max items | 10 |
| **lootTable** | Random generation | common_chest_loot |

Loot generation uses weighted random selection with per-item chance rolls.

## Shop System

NPCs with merchant properties can buy and sell items:

| Merchant Property | Purpose | Example |
|-------------------|---------|---------|
| **buyPriceMultiplier** | % of value merchant pays | 0.5 (50% of value) |
| **sellPriceMultiplier** | % markup player pays | 1.25 (125% of value) |
| **acceptsItemTypes** | What merchant buys | [weapon, armor] |
| **infiniteGold** | Never runs out of gold | true |
| **restockInterval** | Time between restocks | 3600000 (1 hour) |

## Item Location System

Items track their location for world persistence:

| Location Type | Description | Example |
|---------------|-------------|---------|
| **room** | On floor in room | `{ type: 'room', roomId: 'tavern' }` |
| **player_inventory** | In player inventory | `{ type: 'player_inventory', playerId: 'Alice' }` |
| **player_equipped** | Worn by player | `{ type: 'player_equipped', playerId: 'Alice', slot: 'main_hand' }` |
| **container** | Inside container | `{ type: 'container', containerId: 'chest_001' }` |
| **merchant** | In merchant inventory | `{ type: 'merchant', merchantId: 'hooper' }` |
| **corpse** | In corpse | `{ type: 'corpse', corpseId: 'corpse_123' }` |
| **void** | Destroyed/consumed | `{ type: 'void' }` |

## Lifecycle Hooks

Items support custom behaviors through lifecycle hooks:

| Hook | Trigger | Purpose | Return Value |
|------|---------|---------|--------------|
| **onEquip** | Item equipped | Apply effects, validate | boolean (allow/deny) |
| **onUnequip** | Item unequipped | Remove effects | boolean (allow/deny) |
| **onUse** | Player uses item | Consume, apply effect | Result object |
| **onExamine** | Player examines | Custom description | string |
| **onDrop** | Player drops | Validate, trigger effects | boolean (allow/deny) |
| **onPickup** | Player picks up | Bind, trigger events | void |
| **onIdentify** | Item identified | Reveal properties | void |

## Item Commands

Players interact with items through commands:

| Command | Purpose | Example Usage |
|---------|---------|---------------|
| **get/take** | Pick up item | `get sword` |
| **drop** | Drop item | `drop shield` |
| **inventory** | Show carried items | `inventory` or `i` |
| **equip/wear** | Equip item | `equip longsword` |
| **unequip/remove** | Remove item | `remove helmet` |
| **equipment** | Show worn items | `equipment` or `eq` |
| **use** | Use consumable | `use health potion` |
| **examine** | Inspect item | `examine sword` |
| **compare** | Compare items | `compare sword dagger` |
| **identify** | Reveal properties | `identify wand` |

## Combat Integration

The combat system queries equipped items for stats:

**Attack Calculation:**
```
Attack Bonus = Proficiency + Ability Mod + Weapon Attack Bonus - Non-proficiency Penalty
```

**Damage Calculation:**
```
Damage = Weapon Dice + Ability Mod + Magical Bonuses
Critical Damage = 2× Weapon Dice + Ability Mod + Magical Bonuses
```

**AC Calculation:**
```
AC = 10 + DEX Mod (capped by armor) + Armor AC + Shield AC + Misc Bonuses
```

See [Combat Stats Reference](../reference/combat-stats.md) for complete formulas.

## Domain Integration

Items are organized by realm following the world structure:

```
world/
  sesame_street/
    items/
      weapons/
        wooden_sword.js
        rubber_mallet.js
      armor/
        cookie_shield.js
      consumables/
        cookie.js
      quest/
        big_birds_letter.js
```

Items are loaded at server startup via the World loader, which recursively scans realm item directories and registers definitions.

## Configuration

Item system settings are centralized in `/src/config/itemsConfig.js`:

| Setting | Default | Purpose |
|---------|---------|---------|
| **attunement.maxSlots** | 3 | Max attuned items |
| **encumbrance.baseSlots** | 20 | Base inventory slots |
| **encumbrance.slotsPerStrength** | 2 | Slots gained per STR point |
| **proficiency.weaponPenalty** | -4 | Attack penalty without proficiency |
| **stacking.defaultStackSize** | 99 | Max stack size |
| **durability.lossOnDeath** | 10 | % durability lost on death |

## Serialization

Items serialize to JSON for persistence:

**Definition** → Stored in ItemRegistry (loaded at startup)
**Instance** → Saved to player data, room data, container data

Instance serialization includes:
- `instanceId` (UUID)
- `definitionId` (reference to definition)
- `location` (current location)
- `quantity` (stack size)
- `durability` (current/max)
- `boundTo` (player name if soulbound)
- `isIdentified` (whether properties revealed)
- `customName` and `customDescription` (player modifications)

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Core Registry | Complete | Tested, working |
| Item Types | Complete | All 9 types supported |
| Equipment System | Complete | 17 slots, stat calculation |
| Inventory Management | Complete | Slots, weight, stacking |
| Combat Integration | Complete | Attack, damage, AC |
| Proficiency System | Complete | Weapon and armor proficiency |
| Attunement System | Complete | 3-slot limit, validation |
| Container System | In Progress | Basic containers working, loot generation pending |
| Shop System | Planned | Phase 7 |
| Durability System | Partial | Death penalty implemented |
| Identification System | Partial | Framework exists, UI pending |

## See Also

- [Item Properties Reference](../reference/item-properties.md) - Complete property schemas
- [Item Types Reference](../reference/item-types.md) - Type details and examples
- [Item Combat Reference](../reference/item-combat.md) - Combat stats and formulas
- [Item Systems Reference](../reference/item-systems.md) - Attunement, proficiency, identification
- [Creating Items - Basics](../patterns/creating-items-basics.md) - Core item types guide
- [Creating Items - Advanced](../patterns/creating-items-advanced.md) - Hooks and testing guide
- [Combat System Overview](combat-overview.md) - Combat mechanics integration
