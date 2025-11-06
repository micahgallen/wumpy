# Item System Quick Start Guide

**Version:** 1.0 (Phase 1 Complete)
**Last Updated:** 2025-11-06

---

## Overview

The WumpyMUD item system provides a complete framework for weapons, armor, consumables, quest items, and more. This guide shows you how to use the core features.

---

## Creating Items

### Basic Item Definition

```javascript
const { ItemType, ItemRarity, EquipmentSlot, WeaponClass, DamageType } = require('./src/items/schemas/ItemTypes');

const swordDefinition = {
  id: 'iron_sword',
  name: 'Iron Sword',
  description: 'A simple iron sword.',
  keywords: ['sword', 'iron', 'blade'],
  itemType: ItemType.WEAPON,
  weight: 3,
  value: 15,
  rarity: ItemRarity.COMMON,
  isEquippable: true,
  slot: EquipmentSlot.MAIN_HAND,
  weaponProperties: {
    damageDice: '1d8',
    damageType: DamageType.SLASHING,
    weaponClass: WeaponClass.SWORDS,
    isTwoHanded: false,
    isRanged: false
  }
};
```

### Register Item

```javascript
const ItemRegistry = require('./src/items/ItemRegistry');

ItemRegistry.registerItem(swordDefinition, 'core');
```

### Create Item Instance

```javascript
const ItemFactory = require('./src/items/ItemFactory');

// Get definition from registry
const definition = ItemRegistry.getItem('iron_sword');

// Create instance
const sword = ItemFactory.createItem(definition);

console.log(sword.name);        // "Iron Sword"
console.log(sword.instanceId);  // UUID
console.log(sword.quantity);    // 1
```

---

## Using Items

### Weapons

```javascript
const weapon = ItemFactory.createItem(weaponDefinition);

// Roll damage
const normalDamage = weapon.rollDamage(false);  // 1d8
const criticalDamage = weapon.rollDamage(true); // 2d8

// Get attack bonus
const attackBonus = weapon.getAttackBonus(true);  // With proficiency
const penalty = weapon.getAttackBonus(false);    // Without proficiency (-4)

// Check properties
if (weapon.isFinesse()) {
  // Use DEX instead of STR
}

if (weapon.isTwoHanded()) {
  // Requires both hands
}

// Get critical range
const critRange = weapon.getCriticalRange();  // 20 (default)
```

### Armor

```javascript
const armor = ItemFactory.createItem(armorDefinition);

// Calculate AC
const playerDexMod = 3;
const ac = armor.calculateAC(playerDexMod, true);  // Base AC + capped DEX

// Get armor properties
const baseAC = armor.getBaseAC();              // 11 (for leather)
const maxDex = armor.getMaxDexBonus();         // Infinity (for light)
const armorClass = armor.getArmorClass();      // 'light'
const stealthPenalty = armor.hasStealthDisadvantage();  // false

// Check requirements
const canWear = armor.canBeWornBy(player);
if (!canWear.canWear) {
  console.log(canWear.reason);  // "You must be level 5..."
}
```

### Consumables

```javascript
const potion = ItemFactory.createItem(potionDefinition, { quantity: 5 });

// Consume item
const player = { hp: 50, maxHp: 100 };
const result = potion.consume(player, {});

if (result.success) {
  console.log(result.message);   // "You drink the Health Potion..."
  console.log(player.hp);        // 75 (healed 25 HP)
  console.log(potion.quantity);  // 4 (one consumed)
}

// Check remaining uses
console.log(potion.getRemainingUses());  // 4
```

---

## Attunement System

### Attune to Item

```javascript
const AttunementManager = require('./src/systems/equipment/AttunementManager');

const magicalSword = ItemFactory.createItem(magicalSwordDefinition);
const player = { name: 'Gandalf', level: 10, class: 'wizard' };

// Check if can attune
const canAttune = AttunementManager.canAttuneToItem(player, magicalSword);
if (canAttune.canAttune) {
  // Attune
  const result = AttunementManager.attuneToItem(player, magicalSword);
  console.log(result.message);  // "You have attuned to Flaming Sword."
}

// Check attunement status
const status = AttunementManager.getAttunementStatus(player);
console.log(`${status.usedSlots}/${status.maxSlots} slots used`);  // "1/3 slots used"
```

### Break Attunement

```javascript
// Break attunement
AttunementManager.breakAttunement(player, magicalSword);

// Check if player is attuned to specific item
const isAttuned = AttunementManager.isAttunedTo(player.name, magicalSword.instanceId);
console.log(isAttuned);  // false
```

---

## Item Lifecycle Hooks

### Custom Equip Behavior

```javascript
const enchantedArmor = {
  id: 'armor_of_protection',
  name: 'Armor of Protection',
  // ... other properties ...
  onEquip: (player, item) => {
    player.hp += 10;  // Grant 10 bonus HP
    console.log(`${player.name} feels protected.`);
    return true;  // Allow equip
  },
  onUnequip: (player, item) => {
    player.hp -= 10;  // Remove bonus HP
    return true;  // Allow unequip
  }
};
```

### Custom Use Behavior

```javascript
const mysteryPotion = {
  id: 'mystery_potion',
  name: 'Mystery Potion',
  // ... other properties ...
  onUse: (player, item, context) => {
    const roll = Math.random();
    if (roll < 0.5) {
      player.hp += 50;
      return { success: true, message: 'You feel great!' };
    } else {
      player.hp -= 10;
      return { success: true, message: 'You feel sick!' };
    }
  }
};
```

---

## Item Registry Queries

### Find Items

```javascript
// Get item by ID
const sword = ItemRegistry.getItem('iron_sword');

// Find by keyword
const swords = ItemRegistry.findItemsByKeyword('sword');
console.log(`Found ${swords.length} swords`);

// Get all items in domain
const coreItems = ItemRegistry.getItemsByDomain('core');

// Get all items
const allItems = ItemRegistry.getAllItems();

// Check if exists
if (ItemRegistry.hasItem('iron_sword')) {
  // Item exists
}
```

### Registry Statistics

```javascript
const stats = ItemRegistry.getStats();
console.log(`Total items: ${stats.totalItems}`);
console.log(`Total domains: ${stats.totalDomains}`);
console.log(`Weapons: ${stats.byType.weapon}`);
console.log(`Armor: ${stats.byType.armor}`);
console.log(`Consumables: ${stats.byType.consumable}`);
```

---

## Serialization & Persistence

### Save Item

```javascript
const sword = ItemFactory.createItem(swordDefinition);

// Modify state
sword.boundTo = 'PlayerName';
sword.durability = 75;

// Serialize to JSON
const json = sword.toJSON();

// Save to database/file
saveToDatabase(json);
```

### Load Item

```javascript
// Load from database/file
const json = loadFromDatabase();

// Get definition
const definition = ItemRegistry.getItem(json.definitionId);

// Restore item
const sword = ItemFactory.restoreItem(json, definition);

console.log(sword.boundTo);      // 'PlayerName'
console.log(sword.durability);   // 75
```

---

## Stacking Items

```javascript
// Create stackable items
const potion1 = ItemFactory.createItem(potionDef, { quantity: 5 });
const potion2 = ItemFactory.createItem(potionDef, { quantity: 3 });

// Check if can stack
if (potion1.canStackWith(potion2)) {
  // Combine stacks
  potion1.quantity += potion2.quantity;  // 8 total
  // Remove potion2
}

// Bound items don't stack
const boundPotion = ItemFactory.createItem(potionDef, { boundTo: 'Player1' });
console.log(potion1.canStackWith(boundPotion));  // false
```

---

## Durability System

```javascript
const sword = ItemFactory.createItem(swordDef);
sword.durability = 100;
sword.maxDurability = 100;

// Player dies
const durabilityLoss = Math.floor(sword.maxDurability * 0.1);  // 10% loss
const broke = sword.reduceDurability(durabilityLoss);

console.log(sword.durability);  // 90

// Repair item
sword.repair(10);
console.log(sword.durability);  // 100
```

---

## Identification System

```javascript
const magicalSword = ItemFactory.createItem(magicalSwordDef);
console.log(magicalSword.isIdentified);  // false

// Properties hidden until identified
const desc = magicalSword.getDescription(player);
// Shows: "This item has properties that have not been identified."

// Identify item
const identified = magicalSword.onIdentify(player);
console.log(magicalSword.isIdentified);  // true

// Now shows full properties
const fullDesc = magicalSword.getDescription(player);
```

---

## Binding System

### Bind on Equip

```javascript
const bindOnEquipItem = {
  // ... properties ...
  bindOnEquip: true
};

const item = ItemFactory.createItem(bindOnEquipItem);
console.log(item.boundTo);  // null

// Player equips
item.onEquip(player);
console.log(item.boundTo);  // 'PlayerName'

// Cannot trade or drop
console.log(item.isTradeable);  // true (but checked elsewhere)
console.log(item.isDroppable);  // true (but onDrop hook will block)
```

### Bind on Pickup

```javascript
const bindOnPickupItem = {
  // ... properties ...
  bindOnPickup: true
};

const item = ItemFactory.createItem(bindOnPickupItem);

// Player picks up
item.onPickup(player);
console.log(item.boundTo);  // 'PlayerName'
```

---

## Configuration

All game balance values are in `/src/config/itemsConfig.js`:

```javascript
const config = require('./src/config/itemsConfig');

// Attunement
console.log(config.attunement.maxSlots);  // 3

// Encumbrance
console.log(config.encumbrance.baseSlots);  // 20
console.log(config.encumbrance.slotsPerStrength);  // 2

// Proficiency
console.log(config.proficiency.weaponPenalty);  // -4

// Stacking
console.log(config.stacking.defaultStackSize);  // 99

// Durability
console.log(config.durability.lossOnDeath);  // 10 (percent)
```

---

## Loading Sample Items

```javascript
const { loadCoreItems } = require('./world/core/items/loadItems');

// Load all core items
const result = loadCoreItems();
console.log(`Loaded ${result.successCount} items`);

// Items now available in registry
const sword = ItemRegistry.getItem('iron_longsword');
const potion = ItemRegistry.getItem('health_potion');
```

---

## Testing

Run the item system tests:

```bash
# All item tests
node tests/itemTests.js

# Sample items load test
node tests/sampleItemsLoadTest.js
```

---

## Common Patterns

### Creating a Weapon Drop

```javascript
// Enemy drops weapon
function dropWeaponLoot(enemyLevel) {
  const weaponDef = ItemRegistry.getItem('iron_longsword');
  const weapon = ItemFactory.createItem(weaponDef, {
    location: { type: 'room', roomId: player.currentRoom }
  });

  return weapon;
}
```

### Checking Equipment Requirements

```javascript
function canEquip(player, item) {
  // Check level
  if (item.requiredLevel && player.level < item.requiredLevel) {
    return false;
  }

  // Check class
  if (item.requiredClass && !item.requiredClass.includes(player.class)) {
    return false;
  }

  // Check attunement
  if (item.requiresAttunement && !item.isAttuned) {
    return false;
  }

  return true;
}
```

### Healing with Potion

```javascript
function drinkPotion(player, potion) {
  const result = potion.consume(player, {});

  if (result.success) {
    sendToPlayer(player, result.message);

    if (result.consumed) {
      // Remove from inventory
      removeItem(player, potion);
    }
  } else {
    sendToPlayer(player, 'You cannot use that item.');
  }
}
```

---

## Next Steps

Phase 1 (Core Item Framework) is complete. Future phases will add:

- **Phase 2:** Inventory management, encumbrance system, persistence
- **Phase 3:** Equipment commands (equip, unequip, inspect, identify)
- **Phase 4:** Combat integration (damage, AC, proficiencies)
- **Phase 5:** Economy, shops, loot generation
- **Phase 6:** Domain-specific items, tutorial quest items

---

## Troubleshooting

### Item Won't Register

Check validation errors:
```javascript
const { validateItemDefinition } = require('./src/items/schemas/ItemValidator');
const result = validateItemDefinition(myItemDef);
if (!result.valid) {
  console.log('Errors:', result.errors);
}
```

### Mixin Methods Missing

Ensure item was created via ItemFactory, not direct BaseItem construction:
```javascript
// Wrong
const item = new BaseItem(definition);

// Right
const item = ItemFactory.createItem(definition);
```

### Tests Failing

Clear registries between test runs:
```javascript
ItemRegistry.clearRegistry();
AttunementManager.clearAllAttunements();
```

---

## Resources

- **Implementation Plan:** `/docs/plans-roadmaps/items/ITEM_COMBAT_FINAL_IMPLEMENTATION_PLAN.md`
- **Design Document:** `/docs/systems/items/ITEM_SYSTEM_DESIGN.md`
- **Completion Summary:** `/docs/plans-roadmaps/items/PHASE_1_COMPLETION_SUMMARY.md`
- **Progress Log:** `/docs/plans-roadmaps/items/IMPLEMENTATION_PROGRESS.md`
- **Sample Items:** `/world/core/items/sampleItems.js`
- **Tests:** `/tests/itemTests.js`, `/tests/sampleItemsLoadTest.js`
