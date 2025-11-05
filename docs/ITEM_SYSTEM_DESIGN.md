# Item System Architecture Design

**Project:** The Wumpy and Grift MUD
**Document Version:** 1.0
**Date:** November 5, 2025
**Author:** MUD Architect (Claude)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Item Framework](#core-item-framework)
4. [Item Type Specifications](#item-type-specifications)
5. [Equipment and Inventory Systems](#equipment-and-inventory-systems)
6. [Combat Integration](#combat-integration)
7. [Container System](#container-system)
8. [Shop System](#shop-system)
9. [Domain Integration Pattern](#domain-integration-pattern)
10. [File Organization](#file-organization)
11. [Implementation Plan](#implementation-plan)
12. [Key Design Questions](#key-design-questions)
13. [Appendices](#appendices)

---

## Executive Summary

This document defines a comprehensive item system for The Wumpy and Grift MUD, following the modular pattern established by the emote and command systems. The design supports:

- **Weapons** (one-handed, two-handed, melee, ranged, magical)
- **Armor** (slot-based D&D/Diablo style with proficiency requirements)
- **Jewelry** (rings, amulets, trinkets)
- **Quest Items** (special, non-droppable items)
- **Cosmetic Items** (description modifiers, fun items)

The system is designed for extensibility, allowing domain creators to easily add new items while maintaining core functionality in shared utilities.

**Design Philosophy:**
- Core framework in `/src/items/` for MUD-wide item mechanics
- Domain-specific items in `/world/<realm>/items/` following existing world structure
- Registry-based system similar to command and emote patterns
- Template-driven item creation with hooks for custom behaviors
- Full integration with existing combat, inventory, and world systems

---

## Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ITEM SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐        ┌──────────────────┐            │
│  │  Core Framework  │───────▶│  Item Registry   │            │
│  │  /src/items/     │        │  (singleton)     │            │
│  └──────────────────┘        └──────────────────┘            │
│           │                            │                       │
│           │                            │                       │
│           ▼                            ▼                       │
│  ┌──────────────────┐        ┌──────────────────┐            │
│  │  Item Types      │        │  Item Instances  │            │
│  │  (definitions)   │        │  (in game)       │            │
│  └──────────────────┘        └──────────────────┘            │
│           │                            │                       │
│           └────────────┬───────────────┘                       │
│                        │                                       │
│           ┌────────────▼────────────┐                         │
│           │   Domain Items          │                         │
│           │   /world/<realm>/items/ │                         │
│           └─────────────────────────┘                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      INTEGRATION POINTS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Equipment   │  │   Inventory  │  │   Combat     │        │
│  │  System      │  │   System     │  │   System     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                  │                   │               │
│         └──────────────────┼───────────────────┘               │
│                            │                                   │
│                    ┌───────▼────────┐                          │
│                    │   Container    │                          │
│                    │   System       │                          │
│                    └────────────────┘                          │
│                            │                                   │
│                    ┌───────▼────────┐                          │
│                    │   Shop         │                          │
│                    │   System       │                          │
│                    └────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Design Patterns

Following the established MUD patterns:

1. **Registry Pattern** (like command system)
   - Central ItemRegistry for all item definitions
   - O(1) lookup by item ID
   - Validation on registration
   - Supports item templates and instances

2. **Factory Pattern** (like emote creation)
   - `createItem()` factory for item instances
   - `createWeapon()`, `createArmor()` specialized factories
   - Template-based item generation
   - Instance tracking and cleanup

3. **Modular Organization** (like command/emote structure)
   - Core utilities in `/src/items/`
   - Domain items in `/world/<realm>/items/`
   - Clear separation of concerns
   - Easy to extend without modifying core

4. **Definition vs Instance** (like NPC system)
   - Item definitions are templates
   - Item instances are in-game objects
   - Instances reference definitions
   - State tracked per instance

---

## Core Item Framework

### Item Definition Schema

Every item has a base definition that defines its template:

```typescript
interface ItemDefinition {
  // Identity
  id: string;                      // Unique identifier (e.g., "iron_sword")
  name: string;                    // Display name
  description: string;             // Detailed description
  keywords: string[];              // For player targeting

  // Type Classification
  itemType: ItemType;              // weapon, armor, jewelry, quest, cosmetic, consumable
  subType?: string;                // weapon: "sword", armor: "plate", etc.

  // Basic Properties
  weight: number;                  // For encumbrance (pounds)
  value: number;                   // Base gold value
  rarity: ItemRarity;              // common, uncommon, rare, epic, legendary

  // Flags
  isTakeable: boolean;             // Can be picked up
  isDroppable: boolean;            // Can be dropped (false for quest items)
  isEquippable: boolean;           // Can be equipped
  isTradeable: boolean;            // Can be sold/traded
  isQuestItem: boolean;            // Special quest flag

  // Equipment (if isEquippable)
  slot?: EquipmentSlot;            // Which slot it occupies
  requiredLevel?: number;          // Minimum level to use
  requiredClass?: string[];        // Class restrictions

  // Stats (if provides bonuses)
  statModifiers?: StatModifiers;   // Stat bonuses/penalties

  // Weapon Properties (if itemType === 'weapon')
  weaponProperties?: WeaponProperties;

  // Armor Properties (if itemType === 'armor')
  armorProperties?: ArmorProperties;

  // Consumable Properties (if itemType === 'consumable')
  consumableProperties?: ConsumableProperties;

  // Hooks for Custom Behavior
  onEquip?: (player: Player, item: ItemInstance) => void;
  onUnequip?: (player: Player, item: ItemInstance) => void;
  onUse?: (player: Player, item: ItemInstance, context: Context) => boolean;
  onExamine?: (player: Player, item: ItemInstance) => string;
  onDrop?: (player: Player, item: ItemInstance, room: Room) => boolean;

  // Metadata
  createdBy?: string;              // Builder name
  realm?: string;                  // Which realm it belongs to
  loreText?: string;               // Optional flavor text
}
```

### Item Instance

When an item exists in the game world, it becomes an instance:

```typescript
interface ItemInstance {
  instanceId: string;              // Unique instance ID (UUID)
  definitionId: string;            // Reference to ItemDefinition

  // Location
  location: ItemLocation;          // Where the item currently is

  // State
  quantity: number;                // Stack size (for stackable items)
  durability?: number;             // Current durability (if applicable)
  maxDurability?: number;          // Maximum durability

  // Dynamic Properties
  enchantments?: Enchantment[];    // Applied magical effects
  customName?: string;             // Player-renamed item
  customDescription?: string;      // Modified description

  // Ownership
  boundTo?: string;                // Player ID (if soulbound)
  createdAt: number;               // Timestamp
  modifiedAt: number;              // Last modification

  // Transient State
  isEquipped: boolean;             // Currently equipped
  equippedSlot?: EquipmentSlot;    // Which slot (if equipped)
}
```

### Item Location System

Items can exist in multiple locations:

```typescript
type ItemLocation =
  | { type: 'room', roomId: string }
  | { type: 'player_inventory', playerId: string }
  | { type: 'player_equipped', playerId: string, slot: EquipmentSlot }
  | { type: 'container', containerId: string }
  | { type: 'merchant', merchantId: string }
  | { type: 'corpse', corpseId: string }
  | { type: 'void' };  // Destroyed/consumed
```

### Core Enums and Types

```typescript
enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  JEWELRY = 'jewelry',
  CONSUMABLE = 'consumable',
  QUEST = 'quest',
  COSMETIC = 'cosmetic',
  MATERIAL = 'material',
  CONTAINER = 'container',
  MISC = 'misc'
}

enum ItemRarity {
  COMMON = 'common',         // White
  UNCOMMON = 'uncommon',     // Green
  RARE = 'rare',             // Blue
  EPIC = 'epic',             // Purple
  LEGENDARY = 'legendary',   // Orange
  ARTIFACT = 'artifact'      // Red (unique items)
}

enum EquipmentSlot {
  // Weapons
  MAIN_HAND = 'main_hand',
  OFF_HAND = 'off_hand',
  TWO_HAND = 'two_hand',

  // Armor
  HEAD = 'head',
  NECK = 'neck',
  SHOULDERS = 'shoulders',
  CHEST = 'chest',
  BACK = 'back',
  WRISTS = 'wrists',
  HANDS = 'hands',
  WAIST = 'waist',
  LEGS = 'legs',
  FEET = 'feet',

  // Jewelry
  RING_1 = 'ring_1',
  RING_2 = 'ring_2',
  TRINKET_1 = 'trinket_1',
  TRINKET_2 = 'trinket_2'
}

interface StatModifiers {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  maxHp?: number;
  maxResource?: number;
  armorClass?: number;
}
```

---

## Item Type Specifications

### Weapons

Weapons are the primary offensive equipment, integrated with the combat system.

#### Weapon Properties

```typescript
interface WeaponProperties {
  // Damage
  damageDice: string;              // e.g., "1d8", "2d6+2"
  damageType: DamageType;          // physical, fire, ice, etc.

  // Classification
  weaponClass: WeaponClass;        // For proficiency system
  isTwoHanded: boolean;            // Requires both hands
  isRanged: boolean;               // Ranged vs melee
  range?: number;                  // Max range in rooms (for ranged)

  // Attack Modifiers
  attackBonus?: number;            // Bonus to hit
  criticalRange?: number;          // Crit on X-20 (default 20 only)
  criticalMultiplier?: number;     // Damage multiplier on crit (default 2)

  // Special Properties
  enchantmentSlots?: number;       // How many enchantments it can hold
  magicalProperties?: MagicalProperty[];

  // Proficiency Requirements
  requiredProficiency?: WeaponClass[];
  penaltyWithoutProficiency?: number;  // Attack penalty if not proficient
}

enum WeaponClass {
  // Simple Melee
  SIMPLE_MELEE = 'simple_melee',   // Clubs, daggers, quarterstaffs

  // Martial Melee
  SWORDS = 'swords',               // Longswords, shortswords, scimitars
  AXES = 'axes',                   // Battleaxes, handaxes, greataxes
  MACES = 'maces',                 // Maces, warhammers, flails
  POLEARMS = 'polearms',           // Spears, halberds, glaives
  EXOTIC_MELEE = 'exotic_melee',   // Whips, flails, exotic weapons

  // Simple Ranged
  SIMPLE_RANGED = 'simple_ranged', // Slings, darts, light crossbows

  // Martial Ranged
  BOWS = 'bows',                   // Shortbows, longbows, composite
  CROSSBOWS = 'crossbows',         // Light, heavy, hand crossbows
  THROWN = 'thrown',               // Throwing axes, javelins
  EXOTIC_RANGED = 'exotic_ranged', // Special ranged weapons

  // Magical
  WANDS = 'wands',                 // Spell-casting wands
  STAVES = 'staves'                // Magical staves
}

enum DamageType {
  PHYSICAL = 'physical',
  FIRE = 'fire',
  ICE = 'ice',
  LIGHTNING = 'lightning',
  POISON = 'poison',
  NECROTIC = 'necrotic',
  RADIANT = 'radiant',
  PSYCHIC = 'psychic',
  FORCE = 'force'
}
```

#### Magical Weapon Properties

```typescript
interface MagicalProperty {
  type: MagicalPropertyType;
  value: number | string;
  description: string;
}

enum MagicalPropertyType {
  // Damage Enhancements
  EXTRA_DAMAGE = 'extra_damage',           // +1d6 fire damage
  DAMAGE_BONUS = 'damage_bonus',           // +2 to damage rolls

  // Attack Enhancements
  ATTACK_BONUS = 'attack_bonus',           // +1 to hit
  CRITICAL_IMPROVEMENT = 'critical_improvement',  // Crit on 19-20

  // Special Effects
  LIFE_STEAL = 'life_steal',               // Heal on hit
  MANA_STEAL = 'mana_steal',               // Restore resource on hit
  CHANCE_TO_STUN = 'chance_to_stun',       // % chance to stun
  CHANCE_TO_SLOW = 'chance_to_slow',       // % chance to slow

  // Spell Effects
  AUTOCAST_SPELL = 'autocast_spell',       // Cast spell on hit
  PROC_EFFECT = 'proc_effect',             // Random effect trigger

  // Passive Bonuses
  STAT_BONUS = 'stat_bonus',               // +2 STR while equipped
  RESISTANCE = 'resistance',               // Resistance to damage type
  IMMUNITY = 'immunity'                    // Immunity to effect
}
```

#### Example Weapon Definitions

```javascript
// Basic Iron Sword
{
  id: 'iron_sword',
  name: 'an iron sword',
  description: 'A well-crafted iron sword with a leather-wrapped hilt.',
  keywords: ['sword', 'iron', 'blade'],
  itemType: 'weapon',
  subType: 'sword',
  weight: 3,
  value: 50,
  rarity: 'common',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'main_hand',
  requiredLevel: 1,
  weaponProperties: {
    damageDice: '1d8',
    damageType: 'physical',
    weaponClass: 'swords',
    isTwoHanded: false,
    isRanged: false
  }
}

// Magical Flaming Greatsword
{
  id: 'flaming_greatsword',
  name: 'Flamebrand, the Scorching Blade',
  description: 'A massive greatsword wreathed in eternal flames. The metal glows red-hot yet the hilt remains cool to the touch.',
  keywords: ['sword', 'greatsword', 'flaming', 'flamebrand'],
  itemType: 'weapon',
  subType: 'greatsword',
  weight: 8,
  value: 2500,
  rarity: 'epic',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'two_hand',
  requiredLevel: 10,
  weaponProperties: {
    damageDice: '2d6+2',
    damageType: 'physical',
    weaponClass: 'swords',
    isTwoHanded: true,
    isRanged: false,
    attackBonus: 2,
    magicalProperties: [
      {
        type: 'extra_damage',
        value: '1d6',
        description: 'Deals an additional 1d6 fire damage on hit'
      },
      {
        type: 'resistance',
        value: 'fire:50',
        description: 'Grants 50% resistance to fire damage while equipped'
      }
    ]
  },
  loreText: 'Forged in the heart of Mount Sesame by the legendary blacksmith Big Bird.'
}

// Spell-Casting Wand
{
  id: 'wand_of_magic_missiles',
  name: 'Wand of Magic Missiles',
  description: 'A slender wand carved from ancient oak, topped with a glowing crystal.',
  keywords: ['wand', 'magic', 'missiles', 'crystal'],
  itemType: 'weapon',
  subType: 'wand',
  weight: 0.5,
  value: 1000,
  rarity: 'rare',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'main_hand',
  requiredLevel: 5,
  requiredClass: ['wizard', 'sorcerer'],
  weaponProperties: {
    damageDice: '1d4',
    damageType: 'force',
    weaponClass: 'wands',
    isTwoHanded: false,
    isRanged: true,
    range: 3,
    magicalProperties: [
      {
        type: 'autocast_spell',
        value: 'magic_missile',
        description: 'Can cast Magic Missile 3 times per day'
      }
    ]
  },
  statModifiers: {
    int: 1
  }
}
```

### Armor

Armor provides defensive capabilities with a slot-based equipment system.

#### Armor Properties

```typescript
interface ArmorProperties {
  // Defense
  armorClass: number;              // AC bonus provided
  armorType: ArmorType;            // For proficiency system

  // Classification
  armorMaterial: ArmorMaterial;    // Cloth, leather, mail, plate
  slot: EquipmentSlot;             // Which body part

  // Restrictions
  requiredProficiency?: ArmorType[];
  movementPenalty?: number;        // Movement speed reduction
  stealthPenalty?: number;         // Penalty to stealth checks

  // Special Properties
  enchantmentSlots?: number;
  magicalProperties?: MagicalProperty[];

  // Damage Mitigation
  damageReduction?: number;        // Flat damage reduction
  resistances?: Record<DamageType, number>;  // % resistance per type
}

enum ArmorType {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  SHIELD = 'shield'
}

enum ArmorMaterial {
  // Light Armor
  CLOTH = 'cloth',
  LEATHER = 'leather',
  STUDDED_LEATHER = 'studded_leather',

  // Medium Armor
  HIDE = 'hide',
  CHAIN_SHIRT = 'chain_shirt',
  SCALE_MAIL = 'scale_mail',

  // Heavy Armor
  RING_MAIL = 'ring_mail',
  CHAIN_MAIL = 'chain_mail',
  SPLINT = 'splint',
  PLATE = 'plate',

  // Special
  MAGICAL = 'magical',
  ORGANIC = 'organic',
  EXOTIC = 'exotic'
}
```

#### Example Armor Definitions

```javascript
// Basic Leather Chest
{
  id: 'leather_chest',
  name: 'a leather chestpiece',
  description: 'Sturdy leather armor covering the torso.',
  keywords: ['chest', 'leather', 'armor', 'chestpiece'],
  itemType: 'armor',
  subType: 'chest',
  weight: 10,
  value: 50,
  rarity: 'common',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'chest',
  requiredLevel: 1,
  armorProperties: {
    armorClass: 2,
    armorType: 'light',
    armorMaterial: 'leather'
  }
}

// Plate Helmet with Enchantments
{
  id: 'helm_of_valor',
  name: 'Helm of Valor',
  description: 'A gleaming steel helmet inscribed with ancient runes of protection.',
  keywords: ['helm', 'helmet', 'valor', 'steel'],
  itemType: 'armor',
  subType: 'helmet',
  weight: 5,
  value: 1500,
  rarity: 'rare',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'head',
  requiredLevel: 8,
  armorProperties: {
    armorClass: 3,
    armorType: 'heavy',
    armorMaterial: 'plate',
    requiredProficiency: ['heavy'],
    magicalProperties: [
      {
        type: 'resistance',
        value: 'psychic:25',
        description: 'Grants 25% resistance to psychic damage'
      }
    ]
  },
  statModifiers: {
    wis: 1,
    cha: 1
  }
}
```

### Jewelry

Jewelry provides stat bonuses and special effects without armor restrictions.

```typescript
interface JewelryProperties {
  jewelryType: JewelryType;
  slot: EquipmentSlot;

  // Bonuses (jewelry is pure stat/effect bonuses)
  statModifiers?: StatModifiers;
  magicalProperties?: MagicalProperty[];

  // Special
  setName?: string;                // Part of an item set
  setBonus?: SetBonus;             // Bonus when wearing full set
}

enum JewelryType {
  RING = 'ring',
  AMULET = 'amulet',
  NECKLACE = 'necklace',
  TRINKET = 'trinket',
  EARRING = 'earring',
  BRACELET = 'bracelet'
}
```

#### Example Jewelry

```javascript
{
  id: 'ring_of_strength',
  name: 'Ring of Giant Strength',
  description: 'A thick iron band with a miniature barbell engraved on it.',
  keywords: ['ring', 'strength', 'iron'],
  itemType: 'jewelry',
  subType: 'ring',
  weight: 0.1,
  value: 800,
  rarity: 'uncommon',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'ring_1',  // Can go in ring_1 or ring_2
  requiredLevel: 5,
  statModifiers: {
    str: 2
  }
}
```

### Quest Items

Quest items are special items tied to quest progression.

```typescript
interface QuestItemProperties {
  questId: string;                 // Which quest this belongs to
  isKeyItem: boolean;              // Cannot be dropped/sold
  questStage?: number;             // Which stage it's needed for

  // Special behaviors
  onAcquire?: (player: Player) => void;
  onComplete?: (player: Player) => void;
}
```

### Cosmetic Items

Items that modify player appearance or provide fun interactions.

```typescript
interface CosmeticProperties {
  modifiesDescription: boolean;    // Changes player look description
  descriptionAddition?: string;    // Text to append
  emoteOverrides?: Record<string, string>;  // Override emote text

  // Fun interactions
  canUse: boolean;
  useMessage?: string;
  useCooldown?: number;
}
```

#### Example Cosmetic Item

```javascript
{
  id: 'silly_hat',
  name: 'a ridiculously silly hat',
  description: 'This hat defies all known laws of fashion and good taste. It is magnificent.',
  keywords: ['hat', 'silly', 'ridiculous'],
  itemType: 'cosmetic',
  subType: 'hat',
  weight: 0.5,
  value: 10,
  rarity: 'common',
  isTakeable: true,
  isDroppable: true,
  isEquippable: true,
  slot: 'head',
  cosmeticProperties: {
    modifiesDescription: true,
    descriptionAddition: 'They are wearing a ridiculously silly hat that somehow makes them look both foolish and endearing.',
    canUse: true,
    useMessage: 'You tip your silly hat with a flourish. Everyone is impressed. Or horrified. Hard to tell.',
    useCooldown: 30000  // 30 seconds
  }
}
```

---

## Equipment and Inventory Systems

### Inventory System

Building on the existing partial implementation:

```typescript
interface PlayerInventory {
  items: ItemInstance[];           // Unequipped items
  maxWeight: number;               // Weight capacity
  maxSlots: number;                // Item slot limit

  // Computed properties
  currentWeight: number;           // Sum of item weights
  currentSlots: number;            // Number of items

  // Methods
  addItem(item: ItemInstance): boolean;
  removeItem(instanceId: string): ItemInstance | null;
  findItem(keyword: string): ItemInstance | null;
  canAddItem(item: ItemInstance): boolean;
  sortBy(criteria: 'name' | 'type' | 'value' | 'weight'): void;
}
```

### Equipment System

```typescript
interface PlayerEquipment {
  // Weapon Slots
  mainHand: ItemInstance | null;
  offHand: ItemInstance | null;
  twoHand: ItemInstance | null;     // Exclusive with mainHand + offHand

  // Armor Slots
  head: ItemInstance | null;
  neck: ItemInstance | null;
  shoulders: ItemInstance | null;
  chest: ItemInstance | null;
  back: ItemInstance | null;
  wrists: ItemInstance | null;
  hands: ItemInstance | null;
  waist: ItemInstance | null;
  legs: ItemInstance | null;
  feet: ItemInstance | null;

  // Jewelry Slots
  ring1: ItemInstance | null;
  ring2: ItemInstance | null;
  trinket1: ItemInstance | null;
  trinket2: ItemInstance | null;

  // Methods
  equip(player: Player, item: ItemInstance): EquipResult;
  unequip(player: Player, slot: EquipmentSlot): UnequipResult;
  getEquippedInSlot(slot: EquipmentSlot): ItemInstance | null;
  getAllEquipped(): ItemInstance[];
  getTotalArmorClass(): number;
  getTotalStatModifiers(): StatModifiers;
  getWeaponStats(): WeaponStats;
}

interface EquipResult {
  success: boolean;
  reason?: string;
  unequippedItems?: ItemInstance[];  // Items removed to make room
}
```

### Equipment Logic

```typescript
function equipItem(player: Player, item: ItemInstance): EquipResult {
  const def = ItemRegistry.get(item.definitionId);

  // Validation
  if (!def.isEquippable) {
    return { success: false, reason: 'That item cannot be equipped.' };
  }

  if (def.requiredLevel && player.level < def.requiredLevel) {
    return { success: false, reason: `You must be level ${def.requiredLevel} to use that.` };
  }

  if (def.requiredClass && !def.requiredClass.includes(player.guildId)) {
    return { success: false, reason: 'Your class cannot use that item.' };
  }

  // Handle two-handed weapons
  if (def.slot === 'two_hand') {
    const unequipped = [];
    if (player.equipment.mainHand) {
      unequipped.push(player.equipment.mainHand);
      player.equipment.mainHand = null;
    }
    if (player.equipment.offHand) {
      unequipped.push(player.equipment.offHand);
      player.equipment.offHand = null;
    }
    player.equipment.twoHand = item;
    return { success: true, unequippedItems: unequipped };
  }

  // Handle main hand equipping (incompatible with two-hand)
  if (def.slot === 'main_hand') {
    const unequipped = [];
    if (player.equipment.twoHand) {
      unequipped.push(player.equipment.twoHand);
      player.equipment.twoHand = null;
    }
    if (player.equipment.mainHand) {
      unequipped.push(player.equipment.mainHand);
    }
    player.equipment.mainHand = item;
    return { success: true, unequippedItems: unequipped };
  }

  // Regular slot handling
  const currentItem = player.equipment[def.slot];
  if (currentItem) {
    player.inventory.addItem(currentItem);
  }

  player.equipment[def.slot] = item;
  item.isEquipped = true;
  item.equippedSlot = def.slot;

  // Trigger onEquip hook
  if (def.onEquip) {
    def.onEquip(player, item);
  }

  // Update player stats
  recalculatePlayerStats(player);

  return { success: true };
}
```

### Stat Calculation System

```typescript
function recalculatePlayerStats(player: Player): void {
  // Reset to base stats
  const baseStats = { ...player.baseStats };

  // Apply stat modifiers from all equipped items
  const equipped = player.equipment.getAllEquipped();
  for (const item of equipped) {
    const def = ItemRegistry.get(item.definitionId);
    if (def.statModifiers) {
      applyStatModifiers(baseStats, def.statModifiers);
    }
  }

  // Update player stats
  player.stats = baseStats;

  // Recalculate derived stats
  player.armorClass = calculateArmorClass(player);
  player.maxHp = calculateMaxHp(player);
  player.proficiency = calculateProficiency(player.level);

  // Update current weapon stats for combat
  player.currentWeapon = getEquippedWeaponStats(player);
}

function calculateArmorClass(player: Player): number {
  let ac = 10; // Base AC

  // Add DEX modifier (max +2 for medium armor, unlimited for light)
  const dexMod = getModifier(player.stats.dex);
  ac += dexMod;

  // Add armor bonuses from all equipped armor
  const equipped = player.equipment.getAllEquipped();
  for (const item of equipped) {
    const def = ItemRegistry.get(item.definitionId);
    if (def.armorProperties) {
      ac += def.armorProperties.armorClass;
    }
  }

  // Add shield bonus if equipped
  if (player.equipment.offHand) {
    const def = ItemRegistry.get(player.equipment.offHand.definitionId);
    if (def.armorProperties?.armorType === 'shield') {
      ac += def.armorProperties.armorClass;
    }
  }

  return ac;
}
```

---

## Combat Integration

### Weapon Integration with Combat System

The combat system (already implemented) needs to read weapon stats from equipped items:

```typescript
// In combat AttackRoll.js
function getAttackBonus(player: Player): number {
  let bonus = 0;

  // Base proficiency bonus
  bonus += player.proficiency;

  // Ability modifier (STR for melee, DEX for ranged/finesse)
  const weapon = player.currentWeapon;
  if (weapon.isRanged || weapon.hasFinesse) {
    bonus += getModifier(player.stats.dex);
  } else {
    bonus += getModifier(player.stats.str);
  }

  // Weapon's built-in attack bonus
  if (weapon.attackBonus) {
    bonus += weapon.attackBonus;
  }

  // Check proficiency penalty
  if (!player.hasProficiency(weapon.weaponClass)) {
    bonus -= weapon.penaltyWithoutProficiency || 2;
  }

  return bonus;
}

// In combat DamageCalculator.js
function rollWeaponDamage(player: Player, isCritical: boolean): number {
  const weapon = player.currentWeapon;

  // Roll base weapon damage
  let damage = rollDice(weapon.damageDice, isCritical);

  // Add ability modifier to damage
  const abilityMod = weapon.isRanged ?
    getModifier(player.stats.dex) :
    getModifier(player.stats.str);
  damage += abilityMod;

  // Add magical bonus damage
  if (weapon.magicalProperties) {
    for (const prop of weapon.magicalProperties) {
      if (prop.type === 'extra_damage') {
        damage += rollDice(prop.value, isCritical);
      } else if (prop.type === 'damage_bonus') {
        damage += prop.value;
      }
    }
  }

  return Math.max(1, damage);
}
```

### Weapon Proficiency System

```typescript
interface WeaponProficiency {
  proficiencies: Set<WeaponClass>;  // Which weapon types player knows

  // Methods
  hasProficiency(weaponClass: WeaponClass): boolean;
  addProficiency(weaponClass: WeaponClass): void;
  getProficiencyBonus(weaponClass: WeaponClass): number;
}

// Guild-based proficiencies
const GUILD_PROFICIENCIES = {
  warrior: [
    'simple_melee', 'swords', 'axes', 'maces',
    'polearms', 'simple_ranged', 'thrown'
  ],
  rogue: [
    'simple_melee', 'swords', 'simple_ranged',
    'bows', 'crossbows', 'thrown'
  ],
  wizard: [
    'simple_melee', 'wands', 'staves'
  ],
  cleric: [
    'simple_melee', 'maces', 'simple_ranged'
  ]
};
```

### Armor Proficiency System

```typescript
interface ArmorProficiency {
  proficiencies: Set<ArmorType>;

  hasProficiency(armorType: ArmorType): boolean;
  canWear(armor: ArmorProperties): boolean;
  getMovementPenalty(armor: ArmorProperties): number;
}

// Guild-based armor proficiencies
const GUILD_ARMOR_PROFICIENCIES = {
  warrior: ['light', 'medium', 'heavy', 'shield'],
  rogue: ['light', 'medium'],
  wizard: ['light'],
  cleric: ['light', 'medium', 'shield']
};
```

### Damage Type Resistance System

Already partially implemented in combat system, enhanced for items:

```typescript
function calculateDamageWithResistances(
  target: Player,
  baseDamage: number,
  damageType: DamageType
): number {
  let multiplier = 1.0;

  // Base resistances from character
  if (target.resistances[damageType]) {
    multiplier -= target.resistances[damageType] / 100;
  }

  // Add resistances from equipped items
  const equipped = target.equipment.getAllEquipped();
  for (const item of equipped) {
    const def = ItemRegistry.get(item.definitionId);

    // Check armor resistances
    if (def.armorProperties?.resistances?.[damageType]) {
      multiplier -= def.armorProperties.resistances[damageType] / 100;
    }

    // Check magical property resistances
    if (def.weaponProperties?.magicalProperties) {
      for (const prop of def.weaponProperties.magicalProperties) {
        if (prop.type === 'resistance' && prop.value.startsWith(damageType)) {
          const resistValue = parseInt(prop.value.split(':')[1]);
          multiplier -= resistValue / 100;
        }
      }
    }
  }

  // Cap at 0 (can't heal from damage)
  multiplier = Math.max(0, multiplier);

  return Math.round(baseDamage * multiplier);
}
```

---

## Container System

Containers are objects that can hold other items.

### Container Definition

```typescript
interface ContainerProperties {
  isContainer: boolean;
  canBeOpened: boolean;
  isOpen: boolean;
  isLocked: boolean;
  lockDifficulty?: number;         // For lockpicking
  keyItemId?: string;              // Required key item ID

  capacity: number;                // Max number of items
  weightCapacity: number;          // Max weight

  contents: ItemInstance[];        // Items inside

  // Generation
  lootTable?: LootTable;           // For random generation
  hasBeenLooted: boolean;          // Track if already opened
}

interface LootTable {
  minItems: number;
  maxItems: number;
  entries: LootEntry[];
}

interface LootEntry {
  itemId: string;
  chance: number;                  // 0.0 - 1.0
  minQuantity: number;
  maxQuantity: number;
  weight: number;                  // For weighted random selection
}
```

### Container Commands

```typescript
// commands/core/open.js
{
  name: 'open',
  aliases: ['op'],
  execute: function(player, args, context) {
    if (!args[0]) {
      player.send('\nOpen what?\n');
      return;
    }

    const room = context.world.getRoom(player.currentRoom);
    const container = findContainer(args[0], room, player);

    if (!container) {
      player.send('\nYou don\'t see that here.\n');
      return;
    }

    const result = openContainer(player, container);
    player.send(`\n${result.message}\n`);

    if (result.success && result.contents.length > 0) {
      player.send('It contains:\n');
      for (const item of result.contents) {
        player.send(`  ${item.name}\n`);
      }
    }
  }
}

// commands/core/get.js (enhanced)
{
  name: 'get',
  aliases: ['take', 'g'],
  execute: function(player, args, context) {
    // Handle "get <item> from <container>"
    if (args.includes('from')) {
      const fromIndex = args.indexOf('from');
      const itemName = args.slice(0, fromIndex).join(' ');
      const containerName = args.slice(fromIndex + 1).join(' ');

      return getItemFromContainer(player, itemName, containerName, context);
    }

    // Normal get from room
    getItemFromRoom(player, args.join(' '), context);
  }
}
```

### Container System Implementation

```typescript
function openContainer(player: Player, container: GameObject): OpenResult {
  const props = container.containerProperties;

  if (!props.canBeOpened) {
    return {
      success: false,
      message: 'That cannot be opened.'
    };
  }

  if (props.isLocked) {
    // Check for key
    if (props.keyItemId) {
      const hasKey = player.inventory.findItem(props.keyItemId);
      if (!hasKey) {
        return {
          success: false,
          message: 'It\'s locked. You need a key.'
        };
      }
    } else {
      return {
        success: false,
        message: 'It\'s locked.'
      };
    }
  }

  if (props.isOpen) {
    return {
      success: false,
      message: 'It\'s already open.'
    };
  }

  // Open it
  props.isOpen = true;

  // Generate loot if first time opening
  if (!props.hasBeenLooted && props.lootTable) {
    props.contents = generateLoot(props.lootTable);
    props.hasBeenLooted = true;
  }

  return {
    success: true,
    message: `You open the ${container.name}.`,
    contents: props.contents
  };
}

function generateLoot(lootTable: LootTable): ItemInstance[] {
  const items: ItemInstance[] = [];
  const numItems = randomInt(lootTable.minItems, lootTable.maxItems);

  for (let i = 0; i < numItems; i++) {
    const entry = selectWeightedRandom(lootTable.entries);

    if (Math.random() <= entry.chance) {
      const quantity = randomInt(entry.minQuantity, entry.maxQuantity);
      const itemDef = ItemRegistry.get(entry.itemId);

      for (let q = 0; q < quantity; q++) {
        items.push(createItemInstance(itemDef));
      }
    }
  }

  return items;
}
```

---

## Shop System

NPCs can function as merchants, buying and selling items.

### Merchant NPC Properties

```typescript
interface MerchantProperties {
  isMerchant: boolean;

  // Inventory
  inventory: ItemInstance[];       // Items for sale
  restockInterval: number;         // Milliseconds between restocks
  lastRestock: number;             // Timestamp

  // Pricing
  buyPriceMultiplier: number;      // % of value merchant pays (0.0-1.0)
  sellPriceMultiplier: number;     // % of value player pays (1.0+)

  // Restrictions
  acceptsItemTypes: ItemType[];    // What merchant will buy
  sellsItemTypes: ItemType[];      // What merchant sells

  // Currency
  gold: number;                    // Merchant's current gold
  infiniteGold: boolean;           // Never runs out

  // Reputation (future)
  reputationRequired?: number;     // Min reputation to trade
}
```

### Shop Commands

```typescript
// commands/core/list.js
{
  name: 'list',
  aliases: ['ls'],
  execute: function(player, args, context) {
    const room = context.world.getRoom(player.currentRoom);
    const merchant = findMerchant(room);

    if (!merchant) {
      player.send('\nThere is no merchant here.\n');
      return;
    }

    player.send(`\n${merchant.name}'s Inventory:\n`);
    player.send('─'.repeat(60) + '\n');

    for (const item of merchant.merchantProperties.inventory) {
      const def = ItemRegistry.get(item.definitionId);
      const price = Math.ceil(def.value * merchant.merchantProperties.sellPriceMultiplier);

      player.send(
        `${def.name.padEnd(40)} ${price.toString().padStart(6)} gold\n`
      );
    }

    player.send('─'.repeat(60) + '\n');
  }
}

// commands/core/buy.js
{
  name: 'buy',
  aliases: ['purchase'],
  execute: function(player, args, context) {
    if (!args[0]) {
      player.send('\nBuy what?\n');
      return;
    }

    const room = context.world.getRoom(player.currentRoom);
    const merchant = findMerchant(room);

    if (!merchant) {
      player.send('\nThere is no merchant here.\n');
      return;
    }

    const result = buyItem(player, args.join(' '), merchant);
    player.send(`\n${result.message}\n`);
  }
}

// commands/core/sell.js
{
  name: 'sell',
  aliases: [],
  execute: function(player, args, context) {
    if (!args[0]) {
      player.send('\nSell what?\n');
      return;
    }

    const room = context.world.getRoom(player.currentRoom);
    const merchant = findMerchant(room);

    if (!merchant) {
      player.send('\nThere is no merchant here.\n');
      return;
    }

    const result = sellItem(player, args.join(' '), merchant);
    player.send(`\n${result.message}\n`);
  }
}
```

### Shop Transaction Logic

```typescript
function buyItem(player: Player, itemName: string, merchant: NPC): TransactionResult {
  const merchantProps = merchant.merchantProperties;
  const item = findItemInInventory(itemName, merchantProps.inventory);

  if (!item) {
    return {
      success: false,
      message: `${merchant.name} doesn't have that item.`
    };
  }

  const def = ItemRegistry.get(item.definitionId);
  const price = Math.ceil(def.value * merchantProps.sellPriceMultiplier);

  if (player.gold < price) {
    return {
      success: false,
      message: `You don't have enough gold. You need ${price} gold.`
    };
  }

  if (!player.inventory.canAddItem(item)) {
    return {
      success: false,
      message: 'You don\'t have enough room in your inventory.'
    };
  }

  // Complete transaction
  player.gold -= price;
  player.inventory.addItem(item);
  merchantProps.inventory = merchantProps.inventory.filter(i => i.instanceId !== item.instanceId);
  merchantProps.gold += price;

  return {
    success: true,
    message: `You buy ${def.name} for ${price} gold.`
  };
}

function sellItem(player: Player, itemName: string, merchant: NPC): TransactionResult {
  const merchantProps = merchant.merchantProperties;
  const item = player.inventory.findItem(itemName);

  if (!item) {
    return {
      success: false,
      message: 'You don\'t have that item.'
    };
  }

  const def = ItemRegistry.get(item.definitionId);

  if (!def.isTradeable) {
    return {
      success: false,
      message: 'That item cannot be sold.'
    };
  }

  if (!merchantProps.acceptsItemTypes.includes(def.itemType)) {
    return {
      success: false,
      message: `${merchant.name} doesn't buy ${def.itemType}s.`
    };
  }

  const price = Math.floor(def.value * merchantProps.buyPriceMultiplier);

  if (!merchantProps.infiniteGold && merchantProps.gold < price) {
    return {
      success: false,
      message: `${merchant.name} doesn't have enough gold.`
    };
  }

  // Complete transaction
  player.inventory.removeItem(item.instanceId);
  player.gold += price;
  merchantProps.inventory.push(item);
  if (!merchantProps.infiniteGold) {
    merchantProps.gold -= price;
  }

  return {
    success: true,
    message: `You sell ${def.name} for ${price} gold.`
  };
}
```

---

## Domain Integration Pattern

Following the existing world structure, items are organized by realm:

### Directory Structure

```
world/
  sesame_street/
    items/
      weapons/
        wooden_sword.js
        rubber_mallet.js
      armor/
        cookie_shield.js
        fuzzy_slippers.js
      quest/
        big_birds_letter.js
      cosmetic/
        grouchy_glasses.js
    npcs/
      (existing NPCs, some become merchants)
    rooms/
      (existing rooms)
    objects/
      (existing objects, some become containers)
```

### Domain Item Template

Items in domains follow a simple JSON structure, loaded by the item system:

```javascript
// world/sesame_street/items/weapons/rubber_mallet.js
{
  "id": "rubber_mallet",
  "name": "Oscar's Rubber Mallet",
  "description": "A comically oversized rubber mallet. It makes a satisfying *BOING* sound when it hits things.",
  "keywords": ["mallet", "rubber", "hammer"],
  "itemType": "weapon",
  "subType": "mace",
  "weight": 5,
  "value": 25,
  "rarity": "common",
  "isTakeable": true,
  "isDroppable": true,
  "isEquippable": true,
  "slot": "main_hand",
  "requiredLevel": 1,
  "weaponProperties": {
    "damageDice": "1d6",
    "damageType": "physical",
    "weaponClass": "maces",
    "isTwoHanded": false,
    "isRanged": false
  },
  "realm": "sesame_street"
}
```

### Item Loading System

The World loader is extended to load items:

```javascript
// In src/world.js - add to loadRealm()
loadRealm(realmName) {
  const realmPath = path.join(this.worldDir, realmName);

  // Existing loaders
  this.loadDirectory(path.join(realmPath, 'rooms'), this.rooms, realmName);
  this.loadDirectory(path.join(realmPath, 'npcs'), this.npcs);
  this.loadDirectory(path.join(realmPath, 'objects'), this.objects);

  // NEW: Load items
  this.loadItemsRecursively(path.join(realmPath, 'items'), realmName);
}

loadItemsRecursively(itemsPath, realmName) {
  if (!fs.existsSync(itemsPath)) return;

  const loadDir = (dirPath) => {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recurse into subdirectories
        loadDir(fullPath);
      } else if (file.endsWith('.js')) {
        // Load item definition
        const data = fs.readFileSync(fullPath, 'utf8');
        const itemDef = JSON.parse(data);

        if (itemDef.id) {
          itemDef.realm = realmName;
          ItemRegistry.register(itemDef);
        }
      }
    }
  };

  loadDir(itemsPath);
}
```

### Spawning Items in Rooms

Items can be placed in rooms at server start:

```javascript
// world/sesame_street/rooms/general_store.js
{
  "id": "general_store",
  "name": "Hooper's General Store",
  // ... existing room properties ...
  "objects": ["store_counter", "shelves", "cookie_jar"],

  // NEW: Items in room (on floor)
  "items": ["iron_sword", "leather_chest"],

  // NEW: Items in containers
  "containers": {
    "cookie_jar": {
      "items": ["chocolate_chip_cookie", "chocolate_chip_cookie", "oatmeal_cookie"]
    }
  }
}
```

---

## File Organization

### Complete File Structure

```
src/
├── items/
│   ├── README.md                    # Item system documentation
│   │
│   ├── core/
│   │   ├── ItemRegistry.js          # Central item registry (singleton)
│   │   ├── ItemFactory.js           # Item instance creation
│   │   ├── ItemInstance.js          # ItemInstance class
│   │   └── ItemDefinition.js        # ItemDefinition class/schema
│   │
│   ├── equipment/
│   │   ├── EquipmentManager.js      # Player equipment management
│   │   ├── EquipmentSlots.js        # Slot definitions and validation
│   │   ├── StatCalculator.js        # Stat recalculation from equipment
│   │   └── ProficiencySystem.js     # Weapon/armor proficiency checks
│   │
│   ├── inventory/
│   │   ├── InventoryManager.js      # Player inventory management
│   │   ├── InventoryUtils.js        # Helper functions (sorting, finding)
│   │   └── WeightSystem.js          # Encumbrance calculations
│   │
│   ├── types/
│   │   ├── WeaponSystem.js          # Weapon-specific logic
│   │   ├── ArmorSystem.js           # Armor-specific logic
│   │   ├── JewelrySystem.js         # Jewelry-specific logic
│   │   ├── ConsumableSystem.js      # Consumable items (potions, etc.)
│   │   └── CosmeticSystem.js        # Cosmetic item behaviors
│   │
│   ├── containers/
│   │   ├── ContainerManager.js      # Container system
│   │   ├── LootGenerator.js         # Random loot generation
│   │   └── LootTables.js            # Loot table definitions
│   │
│   ├── shops/
│   │   ├── MerchantSystem.js        # NPC merchant logic
│   │   ├── ShopCommands.js          # Buy/sell command handlers
│   │   └── PricingSystem.js         # Dynamic pricing
│   │
│   ├── enchantments/
│   │   ├── EnchantmentSystem.js     # Magical property application
│   │   └── EnchantmentRegistry.js   # Available enchantments
│   │
│   └── utils/
│       ├── ItemUtils.js             # General item utilities
│       ├── ItemValidator.js         # Definition validation
│       └── ItemSerializer.js        # Save/load item instances
│
├── commands/
│   ├── items/
│   │   ├── equip.js                 # Equip command
│   │   ├── unequip.js               # Unequip/remove command
│   │   ├── equipment.js             # Show equipped items
│   │   ├── use.js                   # Use consumable/cosmetic
│   │   ├── compare.js               # Compare two items
│   │   └── identify.js              # Identify magical properties
│   │
│   └── shop/
│       ├── list.js                  # List merchant inventory
│       ├── buy.js                   # Buy from merchant
│       ├── sell.js                  # Sell to merchant
│       └── value.js                 # Check item value
│
└── data/
    └── ItemLocation.js              # Item location tracking

world/
└── <realm>/
    └── items/
        ├── weapons/                 # Realm-specific weapons
        ├── armor/                   # Realm-specific armor
        ├── jewelry/                 # Realm-specific jewelry
        ├── quest/                   # Quest items for this realm
        ├── cosmetic/                # Fun items
        └── consumables/             # Potions, food, etc.
```

### Core Module Exports

```javascript
// src/items/index.js - Main export
module.exports = {
  // Core
  ItemRegistry: require('./core/ItemRegistry'),
  ItemFactory: require('./core/ItemFactory'),
  ItemInstance: require('./core/ItemInstance'),

  // Equipment
  EquipmentManager: require('./equipment/EquipmentManager'),
  StatCalculator: require('./equipment/StatCalculator'),
  ProficiencySystem: require('./equipment/ProficiencySystem'),

  // Inventory
  InventoryManager: require('./inventory/InventoryManager'),

  // Containers
  ContainerManager: require('./containers/ContainerManager'),
  LootGenerator: require('./containers/LootGenerator'),

  // Shops
  MerchantSystem: require('./shops/MerchantSystem'),

  // Utils
  ItemUtils: require('./utils/ItemUtils'),
  ItemValidator: require('./utils/ItemValidator')
};
```

---

## Implementation Plan

### Phase 1: Core Foundation (Week 1)

**Dependencies:** None
**Goal:** Basic item framework that can load and display items

**Tasks:**
1. Create `/src/items/` directory structure
2. Implement `ItemRegistry.js` (singleton registry pattern)
3. Implement `ItemDefinition.js` (base item schema)
4. Implement `ItemInstance.js` (instance class)
5. Implement `ItemFactory.js` (create instances from definitions)
6. Extend `World.js` to load items from realms
7. Create first test items in `/world/sesame_street/items/`
8. Implement `examine` command enhancements for items

**Deliverables:**
- Items can be defined in JSON
- Items load at server startup
- Items can be examined by players
- Item registry accessible throughout codebase

**Testing:**
- Unit tests for ItemRegistry
- Unit tests for ItemFactory
- Integration test: Load items from disk
- Manual test: Examine items in-game

---

### Phase 2: Inventory System (Week 2)

**Dependencies:** Phase 1
**Goal:** Players can pick up, carry, and drop items

**Tasks:**
1. Implement `InventoryManager.js`
2. Extend Player schema with inventory array
3. Enhance existing `get` command for items
4. Enhance existing `drop` command for items
5. Enhance existing `inventory` command to show items
6. Implement weight/encumbrance system (optional)
7. Add item sorting and filtering
8. Persist inventory in `players.json`

**Deliverables:**
- Players can pick up items from rooms
- Players can drop items
- Inventory persists across sessions
- `inventory` command shows all carried items

**Testing:**
- Unit tests for InventoryManager
- Integration test: Pick up and drop items
- Test inventory persistence
- Test weight limits (if implemented)

---

### Phase 3: Equipment System (Week 3-4)

**Dependencies:** Phase 2
**Goal:** Players can equip items and gain stat bonuses

**Tasks:**
1. Implement `EquipmentManager.js`
2. Implement `EquipmentSlots.js` (slot definitions)
3. Implement `StatCalculator.js` (recalculate stats from equipment)
4. Extend Player schema with equipment object
5. Implement `equip` command
6. Implement `unequip/remove` command
7. Implement `equipment` command (show worn items)
8. Handle two-handed weapon logic
9. Implement stat recalculation hooks
10. Create weapon and armor items for testing

**Deliverables:**
- Players can equip/unequip items
- Equipment modifies player stats
- Two-handed weapons work correctly
- `equipment` command shows all worn items

**Testing:**
- Unit tests for EquipmentManager
- Unit tests for StatCalculator
- Integration test: Equip item and verify stats
- Test two-handed weapon slot conflicts
- Test stat bonuses from multiple items

---

### Phase 4: Weapon Types & Combat Integration (Week 5)

**Dependencies:** Phase 3, existing combat system
**Goal:** Different weapon types with varied properties

**Tasks:**
1. Implement `WeaponSystem.js`
2. Define weapon classes and proficiency system
3. Implement `ProficiencySystem.js`
4. Integrate weapons with existing `AttackRoll.js`
5. Integrate weapons with existing `DamageCalculator.js`
6. Create diverse weapon items (swords, axes, wands, bows)
7. Implement proficiency penalties/bonuses
8. Test all weapon types in combat

**Deliverables:**
- Multiple weapon types available
- Weapons modify attack and damage rolls
- Proficiency system affects combat
- Damage dice and types work correctly

**Testing:**
- Unit tests for weapon damage calculation
- Unit tests for proficiency system
- Integration test: Attack with different weapons
- Test damage type resistances

---

### Phase 5: Armor System (Week 6)

**Dependencies:** Phase 3
**Goal:** Slot-based armor with AC bonuses

**Tasks:**
1. Implement `ArmorSystem.js`
2. Define armor types and materials
3. Implement armor proficiency system
4. Create armor items for all slots
5. Integrate with AC calculation
6. Implement armor restrictions (DEX caps, movement penalties)
7. Test armor stacking

**Deliverables:**
- Multiple armor slots available
- Armor increases AC
- Armor proficiency system works
- Movement penalties apply (if implemented)

**Testing:**
- Unit tests for AC calculation
- Integration test: Equip armor and verify AC
- Test armor proficiency penalties
- Test DEX modifier caps for armor types

---

### Phase 6: Container System (Week 7)

**Dependencies:** Phase 2
**Goal:** Chests and containers with loot

**Tasks:**
1. Implement `ContainerManager.js`
2. Implement `LootGenerator.js`
3. Define loot table format
4. Enhance existing objects to be containers
5. Implement `open` command
6. Implement `close` command
7. Implement `look in <container>` command
8. Enhance `get` command for containers (`get <item> from <container>`)
9. Enhance `put` command (`put <item> in <container>`)
10. Implement locked containers with keys

**Deliverables:**
- Containers can be opened and closed
- Items can be retrieved from containers
- Loot generates randomly in containers
- Locked containers require keys

**Testing:**
- Unit tests for LootGenerator
- Integration test: Open container and get items
- Test locked containers
- Test loot table generation

---

### Phase 7: Shop System (Week 8)

**Dependencies:** Phase 2
**Goal:** Buy and sell items from NPC merchants

**Tasks:**
1. Implement `MerchantSystem.js`
2. Implement `PricingSystem.js`
3. Extend NPC definitions with merchant properties
4. Convert existing NPCs to merchants (Mr. Hooper, Grover)
5. Implement `list` command
6. Implement `buy` command
7. Implement `sell` command
8. Implement `value` command (appraise item)
9. Implement merchant restocking
10. Add currency (gold) to player schema

**Deliverables:**
- NPCs can function as merchants
- Players can buy items
- Players can sell items
- Dynamic pricing works
- Merchants restock periodically

**Testing:**
- Unit tests for pricing calculations
- Integration test: Buy and sell items
- Test insufficient funds
- Test merchant gold limits
- Test restock mechanism

---

### Phase 8: Advanced Features (Week 9-10)

**Dependencies:** Phases 1-7
**Goal:** Polish and advanced item features

**Tasks:**
1. Implement jewelry system (rings, amulets)
2. Implement consumable items (potions, food)
3. Implement quest items (non-droppable, special flags)
4. Implement cosmetic items (description modifiers)
5. Implement enchantment system basics
6. Implement item comparison command
7. Implement item identification (for magical items)
8. Implement item durability (optional)
9. Implement item repair (optional)
10. Create comprehensive item sets for Sesame Street realm

**Deliverables:**
- Full item type coverage
- Consumable items work (healing potions, etc.)
- Quest items cannot be dropped/sold
- Cosmetic items modify descriptions
- Compare command shows stat differences

**Testing:**
- Test each item type thoroughly
- Test consumable effects
- Test quest item restrictions
- Test cosmetic description modifications
- Test item comparison accuracy

---

### Phase 9: Polish & Optimization (Week 11)

**Dependencies:** Phases 1-8
**Goal:** Performance, balance, and user experience

**Tasks:**
1. Optimize item lookup performance
2. Add item caching where appropriate
3. Implement item cleanup (destroyed items)
4. Balance weapon damage and armor AC values
5. Balance shop prices
6. Add color-coding for item rarities
7. Improve item display formatting
8. Add item tooltips/detailed stats
9. Comprehensive documentation
10. Create builder's guide for item creation

**Deliverables:**
- Optimized performance
- Balanced gameplay
- Polished UI
- Complete documentation
- Builder-friendly templates

**Testing:**
- Performance testing with many items
- Balance testing across item types
- User experience testing
- Documentation review

---

## Key Design Questions

These questions require user decisions before implementation:

### 1. Encumbrance System

**Question:** Should the inventory system have weight limits and encumbrance penalties?

**Options:**
- **Option A: Simple Slot Limit** - Players have X item slots (e.g., 20)
  - Pros: Simple, easy to understand, no math
  - Cons: Doesn't distinguish between feather and anvil

- **Option B: Weight-Based** - Players have weight capacity based on STR
  - Pros: More realistic, STR becomes more valuable
  - Cons: More complex, requires balance tuning

- **Option C: Hybrid** - Both slot limit AND weight limit
  - Pros: Most realistic, prevents both spam and cheese
  - Cons: Most complex, most restrictive

**Recommendation:** Start with Option A, add Option C later if needed.

---

### 2. Weapon Proficiency Penalties

**Question:** What happens when a player uses a weapon they're not proficient with?

**Options:**
- **Option A: Cannot Equip** - Block equipping non-proficient weapons
  - Pros: Clear restriction, prevents mistakes
  - Cons: Less player freedom

- **Option B: Attack Penalty** - Can equip but suffer attack penalty (-2 or -4)
  - Pros: Allows experimentation, emergency use
  - Cons: Requires tracking proficiency

- **Option C: Damage Penalty** - Can equip but deal less damage
  - Pros: Still useful in emergency
  - Cons: Math complexity

**Recommendation:** Option B (attack penalty of -2)

---

### 3. Armor DEX Modifier Caps

**Question:** Should heavy armor limit DEX bonuses to AC (like D&D 5e)?

**Options:**
- **Option A: No Cap** - Full DEX bonus always applies
  - Pros: Simpler, DEX always useful
  - Cons: Less strategic choice, heavy armor less distinct

- **Option B: Tiered Caps** - Light (unlimited), Medium (+2 max), Heavy (0)
  - Pros: Authentic D&D feel, strategic choice
  - Cons: More complex, requires clear communication

- **Option C: Percentage Reduction** - Heavy armor reduces DEX bonus by 50%
  - Pros: Balanced compromise
  - Cons: Math complexity

**Recommendation:** Option B (D&D-style caps)

---

### 4. Item Durability

**Question:** Should items degrade over time and require repair?

**Options:**
- **Option A: No Durability** - Items never break
  - Pros: Simple, no maintenance busywork
  - Cons: Less economy sink, less realism

- **Option B: Durability System** - Items degrade, need repair
  - Pros: Gold sink, crafting relevance, realism
  - Cons: Annoying maintenance, complex to implement

- **Option C: Death Penalty Only** - Items only lose durability on death
  - Pros: Death penalty without constant maintenance
  - Cons: Still requires repair system

**Recommendation:** Option A initially, Option C later if needed

---

### 5. Magical Item Identification

**Question:** Should magical properties be hidden until identified?

**Options:**
- **Option A: All Properties Visible** - Players see everything immediately
  - Pros: No frustration, clear choices
  - Cons: Less mystery, no identification gameplay

- **Option B: Identify Required** - Must use Identify spell/scroll/NPC
  - Pros: Classic D&D feel, adds depth
  - Cons: Requires Identify system, can frustrate

- **Option C: Gradual Discovery** - Properties revealed through use
  - Pros: Organic discovery, encourages experimentation
  - Cons: Complex to implement

**Recommendation:** Option A initially, Option C as enhancement

---

### 6. Item Binding (Soulbound)

**Question:** Should some items be bound to players?

**Options:**
- **Option A: No Binding** - All items tradeable
  - Pros: Free economy, maximum player choice
  - Cons: Quest rewards can be sold, less prestige

- **Option B: Bind on Equip** - Binds when first equipped
  - Pros: Prevents accidental trading, keeps quest rewards
  - Cons: Limits trading, must be careful

- **Option C: Bind on Pickup** - Binds immediately
  - Pros: Clear from start
  - Cons: Very restrictive

**Recommendation:** Option A with selective Option C for specific quest items

---

### 7. Currency System

**Question:** What currency system should shops use?

**Options:**
- **Option A: Gold Only** - Single currency (gold pieces)
  - Pros: Simple, clear
  - Cons: Less flavor

- **Option B: Multi-Currency** - Copper, silver, gold (D&D style)
  - Pros: More authentic, better for tiny/huge prices
  - Cons: More complex, conversion math

- **Option C: Realm Currencies** - Different currency per realm
  - Pros: Thematic, forces exploration
  - Cons: Complex, exchange rate headaches

**Recommendation:** Option A (gold only)

---

### 8. Loot Distribution in Groups

**Question:** How should loot work when multiple players kill an NPC?

**Options:**
- **Option A: Individual Loot** - Each player gets their own loot table roll
  - Pros: No disputes, everyone gets something
  - Cons: Generates more items, economy inflation

- **Option B: Round Robin** - Players take turns
  - Pros: Fair over time
  - Cons: Requires order tracking, disputes

- **Option C: Free-For-All** - First to grab gets it
  - Pros: Realistic, fast
  - Cons: Unfair to slow players, encourages greed

**Recommendation:** Option A (individual loot)

---

### 9. Item Stacking

**Question:** Should identical items stack in inventory?

**Options:**
- **Option A: No Stacking** - Each item is separate
  - Pros: Simple, each item unique
  - Cons: Inventory fills quickly with currency/potions

- **Option B: Full Stacking** - All identical items stack infinitely
  - Pros: Saves inventory space
  - Cons: Can trivialize weight limits

- **Option C: Limited Stacks** - Stack up to X (like Minecraft)
  - Pros: Balanced compromise
  - Cons: Most complex

**Recommendation:** Option B for consumables and currency, Option A for equipment

---

### 10. Starting Equipment

**Question:** What equipment should new players start with?

**Options:**
- **Option A: Unarmed** - Start with nothing, find/buy equipment
  - Pros: Forces interaction with systems
  - Cons: Harsh for new players

- **Option B: Basic Kit** - Start with starter weapon, armor, and 100 gold
  - Pros: Immediately useful, less frustrating
  - Cons: Skips early progression

- **Option C: Guild-Specific** - Starting gear based on chosen guild
  - Pros: Thematic, reinforces class identity
  - Cons: Requires guild system first

**Recommendation:** Option B, with Option C when guilds are implemented

---

## Appendices

### Appendix A: Example Item Set (Sesame Street)

```javascript
// Cookie-Themed Weapon Set
{
  id: 'cookie_sword',
  name: 'The Cookie Cutter',
  description: 'A sword shaped like a giant cookie cutter. It smells faintly of vanilla.',
  rarity: 'uncommon',
  weaponProperties: {
    damageDice: '1d6+1',
    damageType: 'physical',
    weaponClass: 'swords'
  }
}

// Trash-Themed Armor (Oscar's Gear)
{
  id: 'trash_can_lid_shield',
  name: 'Oscar\'s Trash Can Lid',
  description: 'A dented trash can lid that somehow provides excellent protection.',
  rarity: 'common',
  armorProperties: {
    armorClass: 2,
    armorType: 'shield',
    armorMaterial: 'exotic'
  }
}

// Letter-Themed Quest Items
{
  id: 'letter_of_the_day',
  name: 'The Letter C',
  description: 'A large wooden letter C. Today\'s episode is brought to you by the letter C!',
  itemType: 'quest',
  isQuestItem: true,
  isDroppable: false
}
```

### Appendix B: Loot Table Example

```javascript
{
  "container_id": "treasure_chest_common",
  "lootTable": {
    "minItems": 2,
    "maxItems": 5,
    "entries": [
      {
        "itemId": "iron_sword",
        "chance": 0.15,
        "minQuantity": 1,
        "maxQuantity": 1,
        "weight": 10
      },
      {
        "itemId": "gold_coin",
        "chance": 0.80,
        "minQuantity": 5,
        "maxQuantity": 20,
        "weight": 50
      },
      {
        "itemId": "healing_potion",
        "chance": 0.40,
        "minQuantity": 1,
        "maxQuantity": 3,
        "weight": 25
      },
      {
        "itemId": "leather_boots",
        "chance": 0.20,
        "minQuantity": 1,
        "maxQuantity": 1,
        "weight": 15
      }
    ]
  }
}
```

### Appendix C: Integration Checklist

Before deploying to production, verify:

- [ ] All item definitions validated at load time
- [ ] Item instances properly tracked and cleaned up
- [ ] Equipment stat calculations correct
- [ ] Combat integration working (weapons affect damage)
- [ ] Inventory persistence working
- [ ] Container loot generation balanced
- [ ] Shop prices balanced
- [ ] All commands registered and working
- [ ] Error messages clear and helpful
- [ ] Performance acceptable with 100+ items
- [ ] Documentation complete
- [ ] Tests passing (unit and integration)

---

## Conclusion

This item system design provides a comprehensive, extensible foundation for The Wumpy and Grift MUD. By following the established patterns (registry-based, modular, domain-organized), it integrates seamlessly with existing systems while providing rich gameplay possibilities.

The phased implementation plan allows for incremental development and testing, with each phase delivering working functionality. The design questions highlight key decisions that affect gameplay balance and player experience.

**Next Steps:**
1. Review this document with the user
2. Get answers to key design questions
3. Begin Phase 1 implementation
4. Create test items for Sesame Street realm
5. Iterate based on testing and feedback

**Estimated Total Implementation Time:** 11 weeks for full system
**Estimated MVP Time:** 4 weeks (Phases 1-3: core + inventory + equipment)
