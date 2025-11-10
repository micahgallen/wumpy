---
title: Creating Items - Advanced
status: current
last_updated: 2025-11-10
related: [item-system, creating-items-basics, item-properties]
---

# Creating Items - Advanced

This guide covers advanced item creation topics including custom lifecycle hooks, domain organization, item instances, and testing. For basic item creation, see [Creating Items - Basics](creating-items-basics.md).

## Custom Lifecycle Hooks

Items support lifecycle hooks for custom behavior:

| Hook | Trigger | Purpose | Return Value |
|------|---------|---------|--------------|
| **onEquip** | Item equipped | Apply effects, validate | boolean (allow/deny) |
| **onUnequip** | Item unequipped | Remove effects | boolean (allow/deny) |
| **onUse** | Player uses item | Consume, apply effect | Result object |
| **onExamine** | Player examines | Custom description | string |
| **onDrop** | Player drops | Validate, trigger effects | boolean (allow/deny) |
| **onPickup** | Player picks up | Bind, trigger events | void |
| **onIdentify** | Item identified | Reveal properties | void |

### onEquip and onUnequip

```javascript
const vampiricSword = {
  id: 'vampiric_sword',
  name: 'Vampiric Blade',
  // ... base properties ...
  onEquip: (player, item) => {
    player.send('Dark energy flows through you as you grasp the blade.');
    return true;                       // Allow equip
  },
  onUnequip: (player, item) => {
    player.send('The dark energy fades as you release the blade.');
    return true;                       // Allow unequip
  }
};
```

### onExamine

```javascript
const mysteryBox = {
  id: 'mystery_box',
  name: 'Mystery Box',
  // ... base properties ...
  onExamine: (player, item) => {
    if (!item.isIdentified) {
      return 'The box hums with magical energy. Its true nature is unknown.';
    }
    return `${item.description}\nIt contains the secret to immortality!`;
  }
};
```

### onUse with Complex Logic

```javascript
const mysteryPotion = {
  id: 'mystery_potion',
  name: 'Mystery Potion',
  // ... base properties ...
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

## Domain Organization

Place items in appropriate realm directories:

```
world/
  sesame_street/
    items/
      weapons/           # Weapon items
      armor/             # Armor items
      consumables/       # Potions, food
      quest/             # Quest-specific items
      cosmetic/          # Fun items
      jewelry/           # Rings, amulets
```

Create item files as `.js` with module.exports:

```javascript
// world/sesame_street/items/weapons/cookie_sword.js
module.exports = {
  id: 'cookie_sword',
  name: 'Cookie Sword',
  // ... properties ...
};
```

## Loading Items

Items are auto-loaded at server startup from realm directories. To manually load:

```javascript
const { loadCoreItems } = require('./world/core/items/loadItems');

// Load all items in core realm
const result = loadCoreItems();
console.log(`Loaded ${result.successCount} items`);

// Items now available in registry
const sword = ItemRegistry.getItem('iron_longsword');
```

## Creating Item Instances

Use ItemFactory to create instances from definitions:

```javascript
const ItemFactory = require('./src/items/ItemFactory');
const ItemRegistry = require('./src/items/ItemRegistry');

// Get definition
const definition = ItemRegistry.getItem('iron_sword');

// Create instance
const sword = ItemFactory.createItem(definition);

// Create with custom properties
const stack = ItemFactory.createItem(definition, {
  quantity: 5,
  boundTo: 'PlayerName',
  location: { type: 'room', roomId: 'tavern' }
});
```

## Item Registry Queries

Find and query items in the registry:

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

## Testing Items

Test items before deploying to production:

```javascript
// Validate definition
const { validateItemDefinition } = require('./src/items/schemas/ItemValidator');
const result = validateItemDefinition(myItemDef);

if (!result.valid) {
  console.log('Validation errors:', result.errors);
} else {
  // Register and test
  ItemRegistry.registerItem(myItemDef, 'test');
  const instance = ItemFactory.createItem(myItemDef);

  // Test weapon damage
  if (instance.itemType === 'weapon') {
    console.log('Damage:', instance.rollDamage(false));
  }

  // Test armor AC
  if (instance.itemType === 'armor') {
    console.log('AC:', instance.calculateAC(3, true));
  }
}
```

### Unit Testing Pattern

```javascript
// tests/items/myItemTests.js
const ItemFactory = require('../../src/items/ItemFactory');
const ItemRegistry = require('../../src/items/ItemRegistry');

describe('Flaming Sword Tests', () => {
  let sword;

  beforeEach(() => {
    const def = ItemRegistry.getItem('flaming_sword');
    sword = ItemFactory.createItem(def);
  });

  test('should deal extra fire damage', () => {
    // Test magical property damage
    const damage = sword.rollDamage(false);
    expect(damage).toBeGreaterThan(0);
  });

  test('should grant +1 STR when equipped', () => {
    const player = { stats: { str: 10 } };
    sword.onEquip(player, sword);
    expect(player.stats.str).toBe(11);
  });
});
```

## Serialization & Persistence

Items serialize to JSON for persistence:

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

### Loading Item Instances

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

## Advanced Patterns

### Weapon Drop from Enemy

```javascript
function dropWeaponLoot(enemyLevel, roomId) {
  const weaponDef = ItemRegistry.getItem('iron_longsword');
  const weapon = ItemFactory.createItem(weaponDef, {
    location: { type: 'room', roomId: roomId }
  });

  return weapon;
}
```

### Equipment Requirements Check

```javascript
function canEquip(player, item) {
  // Check level
  if (item.requiredLevel && player.level < item.requiredLevel) {
    return { can: false, reason: `Requires level ${item.requiredLevel}` };
  }

  // Check class
  if (item.requiredClass && !item.requiredClass.includes(player.class)) {
    return { can: false, reason: 'Your class cannot use this item' };
  }

  // Check attunement
  if (item.requiresAttunement && !item.isAttuned) {
    return { can: false, reason: 'This item requires attunement' };
  }

  return { can: true };
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

### Bind on Equip Item

```javascript
const bindOnEquipItem = {
  // ... properties ...
  bindOnEquip: true,
  onEquip: (player, item) => {
    if (!item.boundTo) {
      item.boundTo = player.username;  // Use username for identity
      player.send(`The ${item.name} binds to you!`);
    }
    return true;
  },
  onDrop: (player, item) => {
    if (item.boundTo === player.username) {  // Use username for identity
      player.send('This item is bound to you and cannot be dropped.');
      return false;  // Block drop
    }
    return true;
  }
};
```

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

Ensure item was created via ItemFactory:
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

## Best Practices

1. **Always validate definitions** before registering items
2. **Use ItemFactory** for all instance creation
3. **Test in isolation** before adding to world
4. **Follow naming conventions**: snake_case for IDs, Title Case for names
5. **Document custom hooks** with inline comments
6. **Test edge cases**: What happens at 0 HP? Full inventory? No attunement slots?
7. **Balance carefully**: Consult item-combat.md for damage/AC formulas

## See Also

- [Creating Items - Basics](creating-items-basics.md) - Basic item types and examples
- [Item System Overview](../systems/item-system.md) - Architecture and components
- [Item Properties Reference](../reference/item-properties.md) - Complete property schemas
- [Item Combat Reference](../reference/item-combat.md) - Combat integration formulas
