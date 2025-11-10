# Item Properties Reference

Quick lookup tables for item system properties, types, and configuration.

## Item Types

| Type | Purpose | Stackable | Equippable |
|------|---------|-----------|------------|
| `weapon` | Combat weapons | No | Yes |
| `armor` | Protective gear | No | Yes |
| `jewelry` | Rings, necklaces, trinkets | No | Yes |
| `consumable` | Potions, food, scrolls | Yes | No |
| `quest` | Quest-related items | No | No |
| `cosmetic` | Appearance items | No | Yes |
| `material` | Crafting components | Yes | No |
| `container` | Bags, chests | No | No |
| `currency` | Gold, coins | Yes | No |
| `misc` | Miscellaneous items | Varies | No |

**Implementation:** `/src/items/schemas/ItemTypes.js:ItemType`

## Item Rarity

| Rarity | Typical Use | Color Code |
|--------|-------------|------------|
| `common` | Basic items | Gray/White |
| `uncommon` | Enhanced items | Green |
| `rare` | Superior items | Blue |
| `epic` | Exceptional items | Purple |
| `legendary` | Unique powerful items | Orange |
| `artifact` | Extremely rare quest items | Red/Gold |

**Implementation:** `/src/items/schemas/ItemTypes.js:ItemRarity`

## Equipment Slots

| Slot | Type | Restrictions |
|------|------|--------------|
| `main_hand` | Weapon | One-handed or two-handed weapons |
| `off_hand` | Weapon/Shield | Shields, one-handed weapons, empty if two-handed equipped |
| `head` | Armor | Helms, hats, circlets |
| `neck` | Jewelry | Amulets, necklaces |
| `shoulders` | Armor | Pauldrons, cloaks |
| `chest` | Armor | Chestplates, robes, shirts |
| `back` | Armor | Cloaks, capes |
| `wrists` | Armor | Bracers, wristbands |
| `hands` | Armor | Gloves, gauntlets |
| `waist` | Armor | Belts |
| `legs` | Armor | Leggings, pants |
| `feet` | Armor | Boots, shoes |
| `ring_1` | Jewelry | Rings |
| `ring_2` | Jewelry | Rings |
| `trinket_1` | Jewelry | Special items |
| `trinket_2` | Jewelry | Special items |

**Implementation:** `/src/items/schemas/ItemTypes.js:EquipmentSlot`

## Core Item Properties

| Property | Type | Required | Purpose | Default |
|----------|------|----------|---------|---------|
| `name` | string | Yes | Display name | - |
| `description` | string | Yes | Flavor text | - |
| `keywords` | array | Yes | Words to identify item | - |
| `itemType` | enum | Yes | ItemType value | - |
| `subType` | string | No | Specific category | null |
| `weight` | number | Yes | Weight in pounds | - |
| `value` | number | Yes | Gold value | - |
| `rarity` | enum | No | ItemRarity value | "common" |
| `isTakeable` | boolean | No | Can be picked up | true |
| `isDroppable` | boolean | No | Can be dropped | true |
| `isEquippable` | boolean | No | Can be equipped | false |
| `isTradeable` | boolean | No | Can be traded | true |
| `isQuestItem` | boolean | No | Quest-related | false |
| `isStackable` | boolean | No | Stacks in inventory | false |
| `slot` | enum | No | Equipment slot | null |
| `requiredLevel` | number | No | Minimum level to use | 0 |
| `requiredClass` | string | No | Required guild/class | null |

**Implementation:** `/src/items/BaseItem.js`

## Weapon Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `weaponClass` | enum | Weapon category | "swords", "bows" |
| `damageDice` | string | Damage roll | "1d8", "2d6" |
| `damageDiceTwo` | string | Two-handed damage (versatile) | "1d10" |
| `damageType` | enum | Type of damage | "slashing", "fire" |
| `isFinesse` | function | Can use DEX instead of STR | Returns boolean |
| `isRanged` | function | Ranged weapon | Returns boolean |
| `isVersatile` | function | One or two-handed | Returns boolean |
| `isTwoHanded` | boolean | Requires both hands | true/false |
| `isLight` | boolean | Can dual-wield | true/false |
| `attackBonus` | number | Magical attack bonus | +1, +2, +3 |
| `damageBonus` | number | Magical damage bonus | +1, +2, +3 |

**Implementation:** Defined in item definitions, used by `/src/combat/combatResolver.js`

## Armor Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `armorClass` | enum | Armor weight category | "light", "medium", "heavy" |
| `baseAC` | number | Base armor class value | 11, 14, 18 |
| `maxDexBonus` | number/null | DEX modifier cap | 2, 0, null (unlimited) |
| `acBonus` | number | Magical AC bonus | +1, +2, +3 |
| `stealthDisadvantage` | boolean | Imposes disadvantage on stealth | true/false |

**Implementation:** `/src/systems/equipment/EquipmentManager.js:calculateAC()`

### Armor Type Details

| Armor Type | Base AC | Max DEX | Proficiency Required | Example |
|------------|---------|---------|----------------------|---------|
| Light | 11-12 | Unlimited | Light armor | Leather |
| Medium | 13-15 | +2 | Medium armor | Chain shirt, Breastplate |
| Heavy | 16-18 | 0 | Heavy armor | Chain mail, Plate |
| Shield | +2 | N/A | Shields | Wooden shield, Tower shield |

**Config:** `/src/config/itemsConfig.js:armorDexCaps`

## Magical Properties

| Property Type | Purpose | Example Effect |
|--------------|---------|----------------|
| `extra_damage` | Additional damage dice | +1d6 fire damage |
| `damage_bonus` | Flat damage bonus | +2 damage |
| `attack_bonus` | Attack roll bonus | +1 to hit |
| `critical_improvement` | Better critical range | Crit on 19-20 |
| `life_steal` | HP on hit | Restore 10% of damage |
| `mana_steal` | Resource on hit | Restore 5% of damage as mana |
| `chance_to_stun` | Stun chance | 10% chance to stun |
| `chance_to_slow` | Slow chance | 15% chance to slow |
| `on_hit_effect` | Custom effect on hit | Cast spell on hit |
| `on_kill_effect` | Effect on killing blow | Heal on kill |
| `stat_bonus` | Stat increase | +2 STR, +1 DEX |
| `armor_class_bonus` | AC bonus | +1 AC |
| `resistance` | Damage resistance | 50% fire resistance |

**Implementation:** `/src/items/schemas/ItemTypes.js:MagicalPropertyType`

## Consumable Properties

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `consumableType` | enum | Type of consumable | "potion", "food" |
| `effect` | object | What happens on use | Healing, buffs |
| `charges` | number | Uses before consumed | 1 (single-use), 3 (multi) |
| `cooldown` | number | Milliseconds until can use again | 30000 (30 sec) |

### Consumable Types

| Type | Purpose | Typical Effects |
|------|---------|----------------|
| `potion` | Drinkable potions | Healing, buffs, effects |
| `food` | Edible items | HP restore, temporary buffs |
| `scroll` | Magic scrolls | Cast spell, learn spell |
| `elixir` | Powerful brews | Major buffs, transformations |
| `poison` | Harmful substances | Weapon coating, traps |
| `tool` | Usable tools | Utility effects |

**Implementation:** `/src/items/schemas/ItemTypes.js:ConsumableType`

## Damage Types

| Type | Description | Typical Source |
|------|-------------|----------------|
| `physical` | Generic physical damage | Unarmed, basic weapons |
| `slashing` | Cutting damage | Swords, axes |
| `piercing` | Penetrating damage | Arrows, spears |
| `bludgeoning` | Impact damage | Maces, hammers |
| `fire` | Burning damage | Fire spells, flaming weapons |
| `ice` | Freezing damage | Ice spells, frost weapons |
| `lightning` | Electric damage | Lightning spells, shock weapons |
| `poison` | Toxic damage | Poisoned weapons, venom |
| `necrotic` | Death energy | Dark magic, undead |
| `radiant` | Holy energy | Divine spells, blessed weapons |
| `psychic` | Mental damage | Mind spells |
| `force` | Pure magical force | Magic missiles |

**Implementation:** `/src/items/schemas/ItemTypes.js:DamageType`

## Weapon Classes

| Class | Category | Proficiency | Examples |
|-------|----------|-------------|----------|
| `simple_melee` | Simple | Simple weapons | Club, dagger, quarterstaff |
| `swords` | Martial | Swords | Shortsword, longsword, greatsword |
| `axes` | Martial | Axes | Handaxe, battleaxe, greataxe |
| `maces` | Martial | Maces | Mace, morningstar, flail |
| `polearms` | Martial | Polearms | Spear, halberd, glaive |
| `exotic_melee` | Exotic | Exotic weapons | Special unique melee weapons |
| `simple_ranged` | Simple | Simple weapons | Sling, light crossbow |
| `bows` | Martial | Bows | Shortbow, longbow |
| `crossbows` | Martial | Crossbows | Heavy crossbow, hand crossbow |
| `thrown` | Martial | Thrown weapons | Throwing axe, javelin |
| `exotic_ranged` | Exotic | Exotic weapons | Special unique ranged weapons |
| `wands` | Magical | Wands | Magic wands |
| `staves` | Magical | Staves | Magic staves, quarterstaffs |

**Implementation:** `/src/items/schemas/ItemTypes.js:WeaponClass`

## Attunement System

| Property | Value | Purpose |
|----------|-------|---------|
| `requiresAttunement` | boolean | Item requires attunement to use magic properties |
| `isAttuned` | boolean | Currently attuned to a character |
| `attunedTo` | string | Character name attuned to |
| Max attunement slots | 3 | Maximum items a character can attune |

**Config:** `/src/config/itemsConfig.js:attunement`

**Rules:**
- Magical items with `requiresAttunement: true` don't grant bonuses unless attuned
- Attuning requires a short rest (not yet implemented)
- Maximum 3 attuned items per character
- Un-attuning frees a slot

## Binding System

| Property | Value | Purpose |
|----------|-------|---------|
| `bindOnPickup` | boolean | Binds when picked up |
| `bindOnEquip` | boolean | Binds when equipped |
| `boundTo` | string | Character name bound to |

**Config:** `/src/config/itemsConfig.js:binding`

**Rules:**
- Bound items cannot be traded (config: `allowTradeWhenBound: false`)
- Bound items cannot be dropped (config: `allowDropWhenBound: false`)
- Binding is permanent

## Encumbrance System

| Property | Formula | Default |
|----------|---------|---------|
| Inventory slots | `baseSlots + (slotsPerStrength × STR_modifier)` | 20 + (2 × STR_mod) |
| Weight capacity | `baseWeight + (weightPerStrength × STR_score)` | 150 + (15 × STR) |

**Config:** `/src/config/itemsConfig.js:encumbrance`

**Examples:**

| STR Score | STR Mod | Inventory Slots | Weight Capacity (lbs) |
|-----------|---------|----------------|----------------------|
| 10        | 0       | 20             | 300                  |
| 14        | +2      | 24             | 360                  |
| 18        | +4      | 28             | 420                  |

## Stacking Rules

| Item Type | Max Stack Size | Config Key |
|-----------|----------------|------------|
| Consumables | 99 | `consumableStackSize` |
| Currency | 9999 | `currencyStackSize` |
| Materials | 999 | `materialStackSize` |
| Default | 99 | `defaultStackSize` |

**Config:** `/src/config/itemsConfig.js:stacking`

## Durability System

| Property | Value | Purpose |
|----------|-------|---------|
| `maxDurability` | number | Maximum durability value |
| `durability` | number | Current durability |
| Loss on death | 10% | Percentage of max durability lost on death |
| Repair cost | 20% | `item_value × durability_lost × 0.2` |
| Broken penalty | 50% | Stats reduced by 50% when durability = 0 |

**Config:** `/src/config/itemsConfig.js:durability`

## Proficiency Penalties

| Proficiency Type | Penalty | Notes |
|-----------------|---------|-------|
| Weapon (not proficient) | -4 | Attack roll penalty |
| Light armor (not proficient) | 0 | No penalty |
| Medium armor (not proficient) | -2 | Attack roll penalty |
| Heavy armor (not proficient) | -4 | Attack roll penalty |

**Config:** `/src/config/itemsConfig.js:proficiency`

## Identification System

| Property | Value | Purpose |
|----------|-------|---------|
| `isIdentified` | boolean | Whether magical properties are known |
| Hide magical properties | true | Magic hidden until identified |
| Identify cost (NPC) | 50 gold | Cost to identify at merchant |
| Identify scroll cost | 25 gold | Cost for identify scroll |

**Config:** `/src/config/itemsConfig.js:identification`

## Dual Wielding

| Property | Value | D&D 5e Rule |
|----------|-------|-------------|
| Off-hand damage modifier | 0.5 (flag) | Don't add ability mod to off-hand damage |
| Requires light weapons | true | Both weapons must be light property |
| Auto-attack | true | Off-hand attacks automatically |

**Config:** `/src/config/itemsConfig.js:dualWield`

**Note:** The `offHandDamageMultiplier: 0.5` is used as a flag in combat code to indicate off-hand attacks shouldn't add ability modifier (D&D 5e standard).

## Spawn Tags

Tags for loot generation filtering. Items can have multiple tags.

### Realm Tags

| Tag | Purpose |
|-----|---------|
| `realm:sesame_street` | Sesame Street themed items |
| `realm:narnia` | Narnia themed items |
| `realm:florida` | Florida themed items |
| `realm:texas` | Texas themed items |
| `realm:disney` | Disney themed items |
| `realm:generic` | Fits any realm |

### Type Tags

| Tag | Purpose |
|-----|---------|
| `type:weapon` | Weapon items |
| `type:armor` | Armor items |
| `type:jewelry` | Jewelry items |
| `type:consumable` | Consumable items |
| `type:material` | Crafting materials |
| `type:currency` | Currency items |

### Special Tags

| Tag | Purpose |
|-----|---------|
| `starter_gear` | Good for new players |
| `trash_mob` | Low-value drops from weak enemies |
| `elite_drop` | Higher-value drops from elite enemies |
| `boss_drop` | Boss-specific loot |
| `crafting_component` | Used in crafting |
| `vendor_trash` | Junk items to sell |
| `magical` | Has magical properties |
| `mundane` | No magical properties |

**Implementation:** `/src/items/schemas/ItemTypes.js:SpawnTag`

## Code Reference

| System | Primary File | Key Functions |
|--------|--------------|---------------|
| Item Creation | `/src/items/ItemRegistry.js` | `createItem()`, `getItem()` |
| Equipment | `/src/systems/equipment/EquipmentManager.js` | `equip()`, `unequip()`, `calculateAC()` |
| Item Properties | `/src/items/BaseItem.js` | Item class definition |
| Type Definitions | `/src/items/schemas/ItemTypes.js` | All enums and types |
| Configuration | `/src/config/itemsConfig.js` | System tunables |
