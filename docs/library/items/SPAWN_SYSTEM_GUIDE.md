# Item Spawnability System - Creator Guide

**Version:** 1.0  
**Date:** November 6, 2025  
**For:** Phase 2 Item System

---

## Overview

The Item Spawnability System gives creators fine-grained control over where and how items appear in random loot. Instead of manually placing every item, creators can tag items with spawn properties, allowing the system to generate appropriate loot for treasure chests, NPC corpses, and other random sources.

## Quick Start

### Making an Item Spawnable

Add these two properties to any item definition:

```javascript
{
  id: 'iron_sword',
  name: 'Iron Sword',
  // ... other properties ...
  spawnable: true,  // Enables random spawning
  spawnTags: [      // Controls WHERE it spawns
    SpawnTag.TYPE_WEAPON,
    SpawnTag.WEAPON_MELEE,
    SpawnTag.REALM_GENERIC
  ]
}
```

### Generating Random Loot

```javascript
const loot = LootGenerator.generateLoot({
  lootTables: ['common_loot'],
  spawnTags: [SpawnTag.REALM_SESAME_STREET],
  level: 5,
  itemCount: 3
});
```

---

## Core Concepts

### 1. Spawnable Flag

The `spawnable` property controls whether an item CAN spawn randomly:

- **`spawnable: true`** - Item can appear in random loot
- **`spawnable: false`** - Item must be manually placed
- **undefined** - Defaults to `false` (safe default)

**Auto-Override Rules:**
- Quest items are **NEVER** spawnable (even if marked true)
- Artifact rarity items are **NEVER** spawnable
- Currency is **ALWAYS** spawnable

### 2. Spawn Tags

Tags categorize items for filtering during loot generation. Tags are organized into categories:

#### Realm Tags
Where the item thematically fits:
- `SpawnTag.REALM_SESAME_STREET`
- `SpawnTag.REALM_NARNIA`
- `SpawnTag.REALM_FLORIDA`
- `SpawnTag.REALM_TEXAS`
- `SpawnTag.REALM_DISNEY`
- `SpawnTag.REALM_GENERIC` - Fits anywhere

#### Type Tags
Broad item categories:
- `SpawnTag.TYPE_WEAPON`
- `SpawnTag.TYPE_ARMOR`
- `SpawnTag.TYPE_CONSUMABLE`
- `SpawnTag.TYPE_MATERIAL`
- `SpawnTag.TYPE_CURRENCY`

#### Weapon Subcategory Tags
- `SpawnTag.WEAPON_MELEE`
- `SpawnTag.WEAPON_RANGED`
- `SpawnTag.WEAPON_MAGIC`
- `SpawnTag.WEAPON_SIMPLE`
- `SpawnTag.WEAPON_MARTIAL`
- `SpawnTag.WEAPON_EXOTIC`

#### Armor Subcategory Tags
- `SpawnTag.ARMOR_LIGHT`
- `SpawnTag.ARMOR_MEDIUM`
- `SpawnTag.ARMOR_HEAVY`
- `SpawnTag.ARMOR_SHIELD`

#### Consumable Subcategory Tags
- `SpawnTag.CONSUMABLE_HEALING`
- `SpawnTag.CONSUMABLE_FOOD`
- `SpawnTag.CONSUMABLE_BUFF`
- `SpawnTag.CONSUMABLE_SCROLL`

#### Special Purpose Tags
- `SpawnTag.STARTER_GEAR` - Good for new players
- `SpawnTag.TRASH_MOB` - Low-value drops from weak enemies
- `SpawnTag.ELITE_DROP` - Higher-value drops from elite enemies
- `SpawnTag.BOSS_DROP` - Boss-specific loot
- `SpawnTag.VENDOR_TRASH` - Junk items to sell
- `SpawnTag.MAGICAL` - Has magical properties
- `SpawnTag.MUNDANE` - No magical properties

###  3. Loot Tables

Loot tables are predefined categories for different loot sources:

- `common_loot` - Common treasure chests, low-level monsters
- `uncommon_loot` - Mid-tier chests, tougher enemies
- `rare_loot` - High-level chests, elite enemies
- `epic_loot` - Epic chests, boss encounters
- `legendary_loot` - Legendary chests, world bosses
- `boss_drops` - Specific boss loot tables
- `vendor_only` - Only available from vendors, never spawned
- `trash_loot` - Junk items from trash mobs
- `crafting_drops` - Materials and crafting components
- `quest_rewards` - Items given as quest rewards

### 4. Spawn Weight

Determines how likely an item is to spawn (higher = more common):

**Rarity-Based Weights (defaults):**
- Common: 100
- Uncommon: 40
- Rare: 15
- Epic: 5
- Legendary: 1
- Artifact: 0 (never random)

**Custom Weight:**
```javascript
{
  spawnable: true,
  spawnWeight: 75  // Override default rarity weight
}
```

---

## Complete Item Examples

### Starter Weapon (Generic Realm)

```javascript
{
  id: 'rusty_dagger',
  name: 'Rusty Dagger',
  description: 'A small, rusted dagger. It has seen better days.',
  keywords: ['dagger', 'rusty', 'knife', 'blade'],
  itemType: ItemType.WEAPON,
  weight: 1,
  value: 2,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  
  // Spawnability configuration
  spawnable: true,
  lootTables: ['common_loot', 'trash_loot'],
  spawnTags: [
    SpawnTag.TYPE_WEAPON,
    SpawnTag.WEAPON_MELEE,
    SpawnTag.WEAPON_SIMPLE,
    SpawnTag.STARTER_GEAR,
    SpawnTag.TRASH_MOB,
    SpawnTag.MUNDANE,
    SpawnTag.REALM_GENERIC
  ],
  
  weaponProperties: {
    damageDice: '1d4',
    damageType: DamageType.PIERCING,
    weaponClass: WeaponClass.SIMPLE_MELEE,
    isTwoHanded: false,
    isRanged: false,
    isLight: true,
    isFinesse: true
  }
}
```

### Realm-Specific Consumable

```javascript
{
  id: 'sesame_bread',
  name: 'Sesame Street Bread',
  description: 'Fresh bread from Hooper\'s Store.',
  keywords: ['bread', 'food', 'sesame'],
  itemType: ItemType.CONSUMABLE,
  weight: 0.5,
  value: 1,
  rarity: ItemRarity.COMMON,
  isStackable: true,
  
  // Spawnability configuration
  spawnable: true,
  lootTables: ['common_loot', 'trash_loot'],
  spawnTags: [
    SpawnTag.TYPE_CONSUMABLE,
    SpawnTag.CONSUMABLE_FOOD,
    SpawnTag.VENDOR_TRASH,
    SpawnTag.REALM_SESAME_STREET  // Only spawns in Sesame Street
  ],
  
  consumableProperties: {
    consumableType: ConsumableType.FOOD,
    healAmount: 5
  }
}
```

### Magical Boss Drop

```javascript
{
  id: 'flaming_sword',
  name: 'Flaming Sword',
  description: 'An enchanted blade wreathed in dancing flames.',
  keywords: ['sword', 'flaming', 'fire', 'enchanted', 'magical'],
  itemType: ItemType.WEAPON,
  weight: 3,
  value: 500,
  rarity: ItemRarity.RARE,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  requiresAttunement: true,
  requiredLevel: 5,
  
  // Spawnability configuration
  spawnable: true,
  lootTables: ['rare_loot', 'boss_drops'],
  spawnTags: [
    SpawnTag.TYPE_WEAPON,
    SpawnTag.WEAPON_MELEE,
    SpawnTag.WEAPON_MARTIAL,
    SpawnTag.MAGICAL,
    SpawnTag.BOSS_DROP,
    SpawnTag.ELITE_DROP,
    SpawnTag.REALM_GENERIC
  ],
  
  weaponProperties: {
    damageDice: '1d8+1',
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    attackBonus: 1,
    magicalProperties: [
      { type: 'extra_damage', value: '1d6', description: '+1d6 fire damage' },
      { type: 'attack_bonus', value: 1, description: '+1 to attack rolls' }
    ]
  }
}
```

### Non-Spawnable Quest Item

```javascript
{
  id: 'ancient_key',
  name: 'Ancient Key',
  description: 'An ornate key covered in strange runes.',
  keywords: ['key', 'ancient', 'magical', 'ornate'],
  itemType: ItemType.QUEST,
  weight: 0.1,
  value: 0,
  rarity: ItemRarity.ARTIFACT,
  isQuestItem: true,
  isDroppable: false,
  isTradeable: false,
  
  // Quest items CANNOT be spawnable (validation will fail if true)
  spawnable: false,  // Explicit false, but enforced by system anyway
  
  consumableProperties: {
    questId: 'ancient_temple_quest',
    questStage: 'find_key'
  }
}
```

---

## Using the Loot Generator

### For NPC Corpses

```javascript
const npc = {
  name: 'Goblin Scout',
  level: 3,
  lootTables: ['common_loot', 'trash_loot'],
  spawnTags: [SpawnTag.TRASH_MOB],
  isBoss: false
};

const loot = LootGenerator.generateNPCLoot(npc);
// Returns array of item instances
```

### For Treasure Chests

```javascript
const chest = {
  level: 5,
  lootTables: ['uncommon_loot', 'rare_loot'],
  spawnTags: [SpawnTag.REALM_NARNIA],
  itemCount: 4
};

const loot = LootGenerator.generateChestLoot(chest);
```

### Custom Loot Generation

```javascript
const loot = LootGenerator.generateLoot({
  lootTables: ['rare_loot', 'boss_drops'],  // Tables to pull from
  spawnTags: [SpawnTag.MAGICAL, SpawnTag.BOSS_DROP],  // Filter by tags
  requireAllTags: false,  // ANY tag matches (default)
  level: 10,  // For rarity gating
  itemCount: 3,  // Number of items to generate
  allowDuplicates: false,  // No duplicate items (default)
  includeCurrency: true  // Add currency in addition to items (default)
});
```

### Tag Filtering Options

**ANY Tag (OR logic):**
```javascript
spawnTags: [SpawnTag.WEAPON_MELEE, SpawnTag.WEAPON_RANGED],
requireAllTags: false  // Item needs ONE of these tags
```

**ALL Tags (AND logic):**
```javascript
spawnTags: [SpawnTag.TYPE_WEAPON, SpawnTag.MAGICAL, SpawnTag.REALM_NARNIA],
requireAllTags: true  // Item needs ALL of these tags
```

---

## Configuration Options

All spawn behavior is configurable in `src/config/itemsConfig.js`:

### Rarity Weights
```javascript
rarityWeights: {
  common: 100,
  uncommon: 40,
  rare: 15,
  epic: 5,
  legendary: 1
}
```

### Quantity Ranges (for stackable items)
```javascript
quantityRanges: {
  common: [1, 10],
  uncommon: [1, 5],
  rare: [1, 3],
  epic: [1, 2],
  legendary: [1, 1]
}
```

### Level Gating (minimum level for rare items)
```javascript
levelGating: {
  enabled: true,
  gates: {
    uncommon: 3,   // Level 3+ areas
    rare: 5,       // Level 5+ areas
    epic: 10,      // Level 10+ areas
    legendary: 15  // Level 15+ areas
  }
}
```

### Generation Defaults
```javascript
generation: {
  defaultItemCount: 3,
  emptyLootChance: 10,      // 10% chance for no loot
  bonusItemChance: 15,      // 15% chance for bonus item
  alwaysCurrency: true,
  allowDuplicates: false
}
```

---

## Best Practices

### 1. Tag Appropriately

✅ **Good:**
```javascript
spawnTags: [
  SpawnTag.TYPE_WEAPON,
  SpawnTag.WEAPON_MELEE,
  SpawnTag.STARTER_GEAR,
  SpawnTag.REALM_GENERIC
]
```

❌ **Too Few:**
```javascript
spawnTags: [SpawnTag.TYPE_WEAPON]  // Too broad, hard to filter
```

❌ **Too Many:**
```javascript
spawnTags: [/* 15+ tags */]  // Overly specific, rarely matches
```

### 2. Use Realm Tags Wisely

- Use `REALM_GENERIC` for items that fit anywhere
- Use specific realms only for thematic items
- An item can have multiple realm tags

```javascript
// Fits in both Sesame Street and generic contexts
spawnTags: [
  SpawnTag.REALM_SESAME_STREET,
  SpawnTag.REALM_GENERIC
]
```

### 3. Balance Loot Tables

Don't put everything in `common_loot`:
- **Common loot:** Basic gear, food, minor potions
- **Uncommon loot:** Better gear, useful consumables
- **Rare loot:** Magical items, rare materials
- **Boss drops:** Unique items, powerful gear

### 4. Test Your Loot

```javascript
// Get spawn stats for an item
const stats = LootGenerator.getItemSpawnStats('my_item_id');
console.log(stats);
// {
//   itemId: 'my_item_id',
//   spawnable: true,
//   spawnWeight: 100,
//   spawnTags: [...],
//   lootTables: [...],
//   rarity: 'common'
// }
```

### 5. Consider Auto-Tagging

Items automatically get tags based on their type and rarity:
- `itemType: WEAPON` → `SpawnTag.TYPE_WEAPON`
- `rarity: COMMON` → `SpawnTag.RARITY_COMMON`

You can rely on auto-tagging for basic filtering and add explicit tags for advanced needs.

---

## Validation Rules

The system enforces these rules:

1. **Spawn tags must be valid**
   - Each tag must exist in `SpawnTag` enum
   - Invalid tags cause validation error

2. **Quest items cannot be spawnable**
   - `itemType: QUEST` + `spawnable: true` = validation error
   - System enforces this even if validation is bypassed

3. **Artifacts cannot be spawnable**
   - `rarity: ARTIFACT` + `spawnable: true` = validation error
   - Artifacts must be manually placed

4. **Loot tables must be valid**
   - Each loot table must exist in config
   - Unknown loot tables cause validation error

---

## Common Patterns

### Pattern 1: Vendor-Only Item

```javascript
{
  spawnable: false,  // Never spawns
  lootTables: ['vendor_only']  // Explicitly vendor-only
}
```

### Pattern 2: Crafting Material

```javascript
{
  spawnable: true,
  lootTables: ['crafting_drops'],
  spawnTags: [
    SpawnTag.TYPE_MATERIAL,
    SpawnTag.CRAFTING_COMPONENT
  ]
}
```

### Pattern 3: Realm-Specific Elite Drop

```javascript
{
  spawnable: true,
  lootTables: ['rare_loot', 'elite_drop'],
  spawnTags: [
    SpawnTag.TYPE_ARMOR,
    SpawnTag.ARMOR_HEAVY,
    SpawnTag.MAGICAL,
    SpawnTag.ELITE_DROP,
    SpawnTag.REALM_NARNIA
  ]
}
```

### Pattern 4: Currency

```javascript
{
  itemType: ItemType.CURRENCY,
  // Currency is ALWAYS spawnable (no need to specify)
  // Auto-added to all standard loot tables
}
```

---

## Troubleshooting

### Item Not Spawning

1. Check `spawnable: true` is set
2. Verify loot tables match your generator call
3. Check spawn tags match your filter
4. Verify rarity isn't gated by level
5. Check item isn't quest/artifact type

### Too Many of One Item

- Increase `spawnWeight` of other items
- Decrease weight of over-represented item
- Disable `allowDuplicates` in generator

### Not Enough Variety

- Add more spawnable items to registry
- Use broader spawn tag filters
- Increase `itemCount` in generator

---

## Summary

The spawnability system gives creators powerful tools to control random loot generation:

1. **Mark items as `spawnable: true`**
2. **Tag items with `spawnTags` for filtering**
3. **Assign items to `lootTables` for categorization**
4. **Use `LootGenerator` to create random loot**
5. **Configure weights and quantities in `itemsConfig.js`**

This system allows for:
- Realm-specific loot
- Level-appropriate rewards
- Balanced random generation
- Manual placement when needed
- Flexible filtering and categorization

For questions or suggestions, see `/docs/plans-roadmaps/items/` for roadmap and implementation details.
