# Consumable Commands Implementation Plan

**Project:** The Wumpy and Grift MUD
**Document Version:** 1.0
**Date:** November 9, 2025
**Branch:** feature/consumable-commands
**Status:** Implementation Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Analysis](#problem-analysis)
3. [Solution Design](#solution-design)
4. [Command Architecture](#command-architecture)
5. [Implementation Details](#implementation-details)
6. [Testing Strategy](#testing-strategy)
7. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The consumable item system is fully implemented with proper mixins, item definitions, and consumption logic. However, there is a **critical bug** preventing players from using consumables: the `use` command calls the wrong method (`onUse()` instead of `consume()`).

This document outlines the fix and enhancement plan for consumable commands, including:

- **Bug Fix:** Unify the consumable interface by adding `onUse()` override to ConsumableMixin
- **Enhanced Commands:** Create specialized `eat` and `drink` commands for better immersion
- **Improved Feedback:** Better messaging and room notifications
- **Edge Case Handling:** Validation for dead players, full health, etc.

**Implementation Approach:** Option 2 (Interface Unification) - Most elegant and maintainable

---

## Problem Analysis

### Current State

#### What Works ✅

1. **Item System Infrastructure:**
   - `BaseItem` class with lifecycle hooks (onUse, onEquip, etc.)
   - `ItemRegistry` for definitions
   - `ItemFactory` for instance creation with mixins
   - `ConsumableMixin` with complete consumption logic

2. **Consumable Definitions:**
   - Health potions, cookies, milk, etc. properly defined
   - `consumableProperties` with healAmount, consumableType, flavorText
   - Stackable items with quantity tracking
   - Proper item types and enums

3. **Consumption Logic:**
   - `ConsumableMixin.consume()` method with proper healing
   - Type-specific handlers (consumePotion, consumeFood, etc.)
   - Quantity reduction and result objects
   - Support for custom onUse hooks in definitions

#### What's Broken ❌

**The Critical Bug:**

```javascript
// In src/commands/core/use.js line 75:
const success = item.onUse(player, useContext);
```

**The Problem:**
1. Consumable items don't define `onUse` hooks in their definitions
2. `BaseItem.onUse()` checks for definition-level onUse, finds none, returns `false`
3. `ConsumableMixin.consume()` has all the logic but is **never called**
4. Result: "You can't use a health potion right now."

**Why This Happened:**

The architecture has two different approaches for item usage:
- **Lifecycle Hook Pattern:** `onUse()` in definitions (for custom items)
- **Mixin Method Pattern:** `consume()` in ConsumableMixin (for consumables)

The `use` command was written to only support the first pattern, but consumables use the second.

### Architecture Mismatch Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USE COMMAND (use.js)                     │
│                                                             │
│  player types: "use potion"                                 │
│           ↓                                                 │
│  item = findItemInInventory('potion')                       │
│           ↓                                                 │
│  item.onUse(player, context)  ← CALLS THIS                 │
│           ↓                                                 │
│  BaseItem.onUse() {                                         │
│    if (definition.onUse exists) {                           │
│      return definition.onUse(...)                           │
│    }                                                        │
│    return false; ← RETURNS THIS (no definition onUse)      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              CONSUMABLE MIXIN (never called)                │
│                                                             │
│  ConsumableMixin.consume(player, context) {                 │
│    // All the healing logic is here! ← NEVER REACHED       │
│    if (healAmount) {                                        │
│      player.hp += healAmount;                               │
│      return { success: true, message: "..." };              │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Solution Design

### Approach: Option 2 - Interface Unification

**Strategy:** Make `ConsumableMixin` override the `onUse()` method to provide a unified interface.

**Why This Approach?**

1. **No changes to use command** - Works immediately with existing code
2. **Unified interface** - All usable items use `onUse()` consistently
3. **Proper encapsulation** - ConsumableMixin transparently handles `consume()` internally
4. **Backwards compatible** - Custom definition-level onUse hooks still work
5. **Extensible** - Other item types can override onUse similarly

### Architecture After Fix

```
┌─────────────────────────────────────────────────────────────┐
│                    USE COMMAND (use.js)                     │
│                                                             │
│  player types: "use potion"                                 │
│           ↓                                                 │
│  item.onUse(player, context)  ← CALLS THIS                 │
│           ↓                                                 │
│  ConsumableMixin.onUse() {  ← OVERRIDDEN!                  │
│    const result = this.consume(player, context);            │
│    player.send(result.message);                             │
│    return result.success;                                   │
│  }                                                          │
│           ↓                                                 │
│  ConsumableMixin.consume() {                                │
│    // Healing logic executes! ✓                             │
│    player.hp += healAmount;                                 │
│    return { success: true, message: "..." };                │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Single Responsibility:** Each command has a clear purpose
2. **Interface Consistency:** All items use `onUse()` as the primary hook
3. **Type Safety:** Commands validate item types before use
4. **User Feedback:** Clear messages for success, failure, and edge cases
5. **Immersion:** Specialized commands (eat/drink) enhance roleplay

---

## Command Architecture

### Command Hierarchy

```
use (general command)
├── Core functionality: Call item.onUse()
├── Works with ANY usable item (consumables, magical items, tools)
└── Aliases: use, consume

eat (specialized command)
├── Delegates to use command
├── Validates item is food before consumption
├── Better roleplay flavor
├── Error if used on non-food items
└── Aliases: eat

drink (specialized command)
├── Delegates to use command
├── Validates item is potion/elixir/beverage
├── Better roleplay flavor
├── Error if used on non-drinkable items
└── Aliases: drink, quaff
```

### Command Routing Logic

#### Use Command (General)

**Purpose:** Universal item usage command

**Behavior:**
- Accepts ANY usable item (consumables, wands, scrolls, tools, etc.)
- Calls `item.onUse(player, context)`
- No type restrictions
- Fallback command when eat/drink don't apply

**Examples:**
```
use potion          → Consumable (via ConsumableMixin.onUse)
use wand            → Magical item (via definition.onUse hook)
use lockpick        → Tool item (via definition.onUse hook)
use scroll          → Scroll consumable (via ConsumableMixin.onUse)
consume cookie      → Alias for use
```

**When to Use:**
- Any item that has an `onUse` implementation
- When you're unsure of item type
- For non-consumable usable items (wands, tools, etc.)

#### Eat Command (Food-Specific)

**Purpose:** Immersive command for eating food

**Behavior:**
- Validates `item.consumableProperties.consumableType === 'food'`
- If validation passes: delegates to use command
- If validation fails: error message suggesting correct command

**Examples:**
```
eat cookie          → ✓ Delegates to use (food type)
eat bread           → ✓ Delegates to use (food type)
eat potion          → ✗ Error: "You can't eat a potion. Try drinking it."
eat wand            → ✗ Error: "You can't eat a wand. Try using it."
```

**Error Messages:**
- For potions: "You can't eat {item}. Try drinking it instead."
- For other items: "You can't eat {item}. Try using it instead."

#### Drink Command (Beverage-Specific)

**Purpose:** Immersive command for drinking potions/beverages

**Behavior:**
- Validates `item.consumableProperties.consumableType in ['potion', 'elixir']`
- If validation passes: delegates to use command
- If validation fails: error message suggesting correct command

**Examples:**
```
drink potion        → ✓ Delegates to use (potion type)
quaff elixir        → ✓ Delegates to use (elixir type)
drink milk          → ✓ Delegates to use (could be food or potion)
drink cookie        → ✗ Error: "You can't drink a cookie. Try eating it."
```

**Error Messages:**
- For food: "You can't drink {item}. Try eating it instead."
- For other items: "You can't drink {item}. Try using it instead."

### Command Relationship to Magical Items

**Distinction:**

- **Consumables (eat/drink/use):**
  - Items with `itemType: 'consumable'`
  - Use `ConsumableMixin.consume()` logic
  - Typically destroyed after use (quantity - 1)
  - Examples: potions, food, scrolls

- **Magical Items (use only):**
  - Items with custom `onUse` hooks in definition
  - Not destroyed after use (usually)
  - Examples: wands, staffs, magical tools, enchanted items

**Examples:**

```javascript
// Consumable Scroll (destroyed after use)
{
  id: 'scroll_of_fireball',
  itemType: 'consumable',
  consumableProperties: {
    consumableType: 'scroll',
    spellEffect: 'fireball',
    onUse: function(player, item, context) {
      // Cast fireball spell
      // Scroll is consumed
      return { success: true, message: 'The scroll burns up!' };
    }
  }
}
// Command: use scroll → Consumed ✓
// Command: eat scroll → Error ✗
// Command: drink scroll → Error ✗

// Magical Wand (reusable)
{
  id: 'wand_of_magic_missiles',
  itemType: 'weapon',  // Not consumable!
  onUse: function(player, item, context) {
    // Cast magic missile
    // Wand is NOT consumed
    item.charges -= 1;
    return true;
  }
}
// Command: use wand → Works, not consumed ✓
// Command: eat wand → Error ✗
// Command: drink wand → Error ✗
```

**Summary Table:**

| Item Type | use | eat | drink | Consumed? |
|-----------|-----|-----|-------|-----------|
| Food (cookie) | ✓ | ✓ | ✗ | Yes |
| Potion | ✓ | ✗ | ✓ | Yes |
| Elixir | ✓ | ✗ | ✓ | Yes |
| Scroll | ✓ | ✗ | ✗ | Yes |
| Wand | ✓ | ✗ | ✗ | No |
| Tool | ✓ | ✗ | ✗ | Varies |

---

## Implementation Details

### Phase 1: Fix ConsumableMixin (Critical Bug Fix)

**File:** `src/items/mixins/ConsumableMixin.js`

**Changes:** Add `onUse()` method override

```javascript
/**
 * Override onUse to call consume for consumables
 * This provides a unified interface for all usable items
 * @param {Object} player - Player using the item
 * @param {Object} context - Additional context
 * @returns {boolean} True if use succeeded (for backwards compatibility)
 */
onUse(player, context = {}) {
  const colors = require('../../colors');

  // Call the consume method which has all the logic
  const result = this.consume(player, context);

  // Send message to player
  if (result.message) {
    player.send('\n' + (result.success ? colors.success(result.message) : colors.error(result.message)) + '\n');
  }

  // Show remaining quantity if item is stackable
  if (result.success && this.isStackable && this.quantity > 0) {
    player.send(colors.gray(`(${this.quantity} remaining)\n`));
  }

  // Return boolean for backwards compatibility with use command
  return result.success;
},
```

**Why this works:**

1. **Method Resolution:** When `item.onUse()` is called on a consumable:
   - JavaScript looks for `onUse` on the item instance
   - Finds `ConsumableMixin.onUse()` (applied via Object.assign)
   - Calls that instead of `BaseItem.onUse()`

2. **Backwards Compatible:** Returns boolean like `BaseItem.onUse()` expects

3. **Proper Messaging:** Handles success/error colors internally

4. **Quantity Display:** Shows remaining count for stackable items

### Phase 2: Enhance Use Command

**File:** `src/commands/core/use.js`

**Changes:** Better feedback and room notifications

**Add after line 75 (after item.onUse call):**

```javascript
// Notify others in the room about the consumption
if (success && context.world && player.currentRoom && item.itemType === 'consumable') {
  const consumableType = item.consumableProperties?.consumableType;
  let action = 'uses';

  switch (consumableType) {
    case 'food':
      action = 'eats';
      break;
    case 'potion':
    case 'elixir':
      action = 'drinks';
      break;
    case 'scroll':
      action = 'reads';
      break;
  }

  // NOTE: player.name in this design doc will be player.getDisplayName() in implementation
  context.world.sendToRoom(
    player.currentRoom,
    `\n${player.name} ${action} ${item.name}.\n`,
    player.name  // Exclude the player
  );
}
```

**Add validation (after line 60, before onUse call):**

```javascript
// Additional validation for consumables
if (item.itemType === 'consumable') {
  // Can't consume while dead
  if (player.hp <= 0 || player.isGhost) {
    player.send('\n' + colors.error('You cannot consume items while dead.\n'));
    return;
  }

  // Optional: Warn if healing at full health
  if (item.consumableProperties?.healAmount && player.hp >= player.maxHp) {
    player.send('\n' + colors.warning('You are already at full health, but you consume it anyway.\n'));
    // Don't return - allow consumption, just warn
  }
}
```

### Phase 3: Create Eat Command

**File:** `src/commands/core/eat.js` (NEW FILE)

```javascript
/**
 * Eat Command
 *
 * Specialized command for eating food items.
 * Validates item type and delegates to use command.
 */

const colors = require('../../colors');

/**
 * Execute the eat command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Eat what?\n'));
    player.send(colors.hint('Usage: eat <food>\n'));
    player.send(colors.hint('Example: eat cookie\n'));
    return;
  }

  const keyword = args.join(' ').toLowerCase();

  // Find the item in inventory
  let item = null;
  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      if (invItem && typeof invItem === 'object' && invItem.keywords) {
        const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
        const partialMatch = invItem.keywords.some(kw =>
          kw.toLowerCase().includes(keyword) || keyword.includes(kw.toLowerCase())
        );

        if (exactMatch || partialMatch) {
          item = invItem;
          break;
        }
      }
    }
  }

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Validate it's a consumable
  if (item.itemType !== 'consumable') {
    player.send('\n' + colors.error(`You can't eat ${item.getDisplayName()}. It's not edible.\n`));
    player.send(colors.hint('Try using it instead: use ' + item.name + '\n'));
    return;
  }

  // Validate it's food type
  const consumableType = item.consumableProperties?.consumableType;
  if (consumableType !== 'food') {
    if (consumableType === 'potion' || consumableType === 'elixir') {
      player.send('\n' + colors.error(`You can't eat ${item.getDisplayName()}. Try drinking it instead.\n`));
      player.send(colors.hint('Command: drink ' + item.name + '\n'));
    } else {
      player.send('\n' + colors.error(`You can't eat ${item.getDisplayName()}. Try using it instead.\n`));
      player.send(colors.hint('Command: use ' + item.name + '\n'));
    }
    return;
  }

  // Delegate to use command
  const useCommand = require('./use');
  useCommand.execute(player, args, context);
}

module.exports = {
  name: 'eat',
  aliases: [],
  execute,
  help: {
    description: 'Eat food items',
    usage: 'eat <food>',
    examples: [
      'eat cookie - Eat a cookie',
      'eat bread - Eat bread'
    ]
  }
};
```

### Phase 4: Create Drink Command

**File:** `src/commands/core/drink.js` (NEW FILE)

```javascript
/**
 * Drink Command
 *
 * Specialized command for drinking potions and beverages.
 * Validates item type and delegates to use command.
 */

const colors = require('../../colors');

/**
 * Execute the drink command
 * @param {Object} player - Player object
 * @param {Array<string>} args - Command arguments
 * @param {Object} context - Command context
 */
function execute(player, args, context) {
  if (args.length === 0) {
    player.send('\n' + colors.error('Drink what?\n'));
    player.send(colors.hint('Usage: drink <potion>\n'));
    player.send(colors.hint('Example: drink potion\n'));
    return;
  }

  const keyword = args.join(' ').toLowerCase();

  // Find the item in inventory
  let item = null;
  if (player.inventory && player.inventory.length > 0) {
    for (const invItem of player.inventory) {
      if (invItem && typeof invItem === 'object' && invItem.keywords) {
        const exactMatch = invItem.keywords.some(kw => kw.toLowerCase() === keyword);
        const partialMatch = invItem.keywords.some(kw =>
          kw.toLowerCase().includes(keyword) || keyword.includes(kw.toLowerCase())
        );

        if (exactMatch || partialMatch) {
          item = invItem;
          break;
        }
      }
    }
  }

  if (!item) {
    player.send('\n' + colors.error(`You don't have '${keyword}' in your inventory.\n`));
    return;
  }

  // Validate it's a consumable
  if (item.itemType !== 'consumable') {
    player.send('\n' + colors.error(`You can't drink ${item.getDisplayName()}. It's not drinkable.\n`));
    player.send(colors.hint('Try using it instead: use ' + item.name + '\n'));
    return;
  }

  // Validate it's a drinkable type (potion, elixir, or food that's a beverage)
  const consumableType = item.consumableProperties?.consumableType;
  const drinkableTypes = ['potion', 'elixir'];

  // Allow drinking food items with 'drink' related keywords (milk, water, etc.)
  const hasDrinkKeyword = item.keywords.some(kw =>
    ['milk', 'water', 'juice', 'ale', 'beer', 'wine', 'beverage', 'drink'].includes(kw.toLowerCase())
  );

  if (!drinkableTypes.includes(consumableType) && !hasDrinkKeyword) {
    if (consumableType === 'food') {
      player.send('\n' + colors.error(`You can't drink ${item.getDisplayName()}. Try eating it instead.\n`));
      player.send(colors.hint('Command: eat ' + item.name + '\n'));
    } else {
      player.send('\n' + colors.error(`You can't drink ${item.getDisplayName()}. Try using it instead.\n`));
      player.send(colors.hint('Command: use ' + item.name + '\n'));
    }
    return;
  }

  // Delegate to use command
  const useCommand = require('./use');
  useCommand.execute(player, args, context);
}

module.exports = {
  name: 'drink',
  aliases: ['quaff'],
  execute,
  help: {
    description: 'Drink potions and beverages',
    usage: 'drink <potion>',
    examples: [
      'drink potion - Drink a health potion',
      'drink milk - Drink milk',
      'quaff elixir - Quaff an elixir (alternative)'
    ]
  }
};
```

### Command Registration

**Note:** Commands in `src/commands/core/` are automatically registered by the command loader. No additional registration needed.

---

## Testing Strategy

### Unit Tests

**File:** `tests/items/ConsumableMixin.test.js`

Test cases:
1. ✓ `onUse()` calls `consume()` internally
2. ✓ `onUse()` returns boolean (true on success, false on failure)
3. ✓ `onUse()` sends proper colored messages to player
4. ✓ Quantity is reduced after consumption
5. ✓ Custom definition onUse hooks are respected

### Integration Tests

**File:** `tests/commands/consumables.integration.test.js`

Test scenarios:

```javascript
describe('Consumable Commands', () => {

  test('use potion - heals player', async () => {
    // Given: Player with 50/100 HP and a health potion (+25 HP)
    // When: Player types "use potion"
    // Then: Player HP increases to 75
    // And: Potion quantity decreases by 1
    // And: Player sees success message
  });

  test('eat cookie - heals player', async () => {
    // Given: Player with a chocolate chip cookie (+5 HP)
    // When: Player types "eat cookie"
    // Then: Player HP increases by 5
    // And: Cookie is consumed
  });

  test('drink potion - same as use', async () => {
    // Given: Player with health potion
    // When: Player types "drink potion"
    // Then: Same behavior as "use potion"
  });

  test('eat potion - error message', async () => {
    // Given: Player with health potion
    // When: Player types "eat potion"
    // Then: Error: "You can't eat a potion. Try drinking it."
  });

  test('drink cookie - error message', async () => {
    // Given: Player with cookie
    // When: Player types "drink cookie"
    // Then: Error: "You can't drink a cookie. Try eating it."
  });

  test('use wand - magical item works', async () => {
    // Given: Player with magical wand (has onUse hook)
    // When: Player types "use wand"
    // Then: Wand effect triggers
    // And: Wand is NOT consumed
  });

  test('eat wand - error message', async () => {
    // Given: Player with wand
    // When: Player types "eat wand"
    // Then: Error: "You can't eat a wand. Try using it."
  });

  test('use potion while dead - prevented', async () => {
    // Given: Dead player (hp <= 0) with potion
    // When: Player types "use potion"
    // Then: Error: "You cannot consume items while dead."
  });

  test('room notification - others see consumption', async () => {
    // Given: Two players in same room, one with cookie
    // When: Player1 types "eat cookie"
    // Then: Player2 sees "Player1 eats a chocolate chip cookie."
  });

  test('stackable items - quantity tracking', async () => {
    // Given: Player with 3 cookies
    // When: Player types "eat cookie"
    // Then: Message shows "(2 remaining)"
    // And: Stack size is 2
  });

  test('last item consumed - removed from inventory', async () => {
    // Given: Player with 1 cookie
    // When: Player types "eat cookie"
    // Then: Cookie removed from inventory
    // And: No "remaining" message
  });
});
```

### Manual Testing Checklist

- [ ] Use health potion → heals player
- [ ] Eat cookie → heals player with food message
- [ ] Drink milk → consumable works (beverage food type)
- [ ] Eat potion → error with helpful suggestion
- [ ] Drink cookie → error with helpful suggestion
- [ ] Use wand → magical item works, not consumed
- [ ] Eat wand → error message
- [ ] Use potion while dead → prevented
- [ ] Use potion at full health → warning but allowed
- [ ] Consume last item in stack → removed from inventory
- [ ] Consume middle item in stack → quantity decreases
- [ ] Room notification → other players see action
- [ ] Persistence → consumed items saved correctly

---

## File Changes Summary

### Modified Files

1. **`src/items/mixins/ConsumableMixin.js`**
   - Add `onUse()` method override
   - Add messaging and quantity display

2. **`src/commands/core/use.js`**
   - Add room notifications
   - Add validation (dead check, full health warning)
   - Improve feedback messages

### New Files

3. **`src/commands/core/eat.js`**
   - Food-specific consumption command
   - Type validation
   - Delegates to use command

4. **`src/commands/core/drink.js`**
   - Potion/beverage consumption command
   - Type validation with keyword checking
   - Delegates to use command

5. **`docs/systems/items/consumables/CONSUMABLE_COMMANDS_DESIGN.md`**
   - This documentation file

### Testing Files

6. **`tests/items/ConsumableMixin.test.js`** (optional)
   - Unit tests for mixin

7. **`tests/commands/consumables.integration.test.js`** (optional)
   - Integration tests for commands

---

## Future Enhancements

### Phase 5: Combat Restrictions (Optional)

Add turn-based potion usage:

```javascript
// In use.js
if (player.inCombat && item.consumableProperties?.consumableType === 'potion') {
  // Using a potion in combat takes your full action
  player.combatAction = 'using_item';
  player.send(colors.warning('\nUsing a potion takes your full turn!\n'));
}
```

### Phase 6: Cooldowns (Optional)

Add cooldown system for powerful consumables:

```javascript
// In ConsumableMixin
if (this.consumableProperties.cooldown) {
  const lastUsed = player.consumableCooldowns?.[this.definitionId] || 0;
  const cooldownRemaining = (lastUsed + this.consumableProperties.cooldown) - Date.now();

  if (cooldownRemaining > 0) {
    return {
      success: false,
      message: `You must wait ${Math.ceil(cooldownRemaining / 1000)}s before using this again.`
    };
  }
}
```

### Phase 7: Buff System (Optional)

Implement temporary stat buffs from elixirs:

```javascript
// Buff tracking structure
player.activeBuffs = [
  {
    sourceItem: 'elixir_of_strength',
    effect: { strength: +5 },
    duration: 300000, // 5 minutes
    expiresAt: Date.now() + 300000
  }
];
```

### Phase 8: Overdose/Satiation System (Optional)

Prevent potion spam:

```javascript
// In consumePotion
player.potionSatiation = (player.potionSatiation || 0) + 1;

if (player.potionSatiation > 3) {
  return {
    success: false,
    message: 'Your body rejects the potion. You feel oversaturated with magic.'
  };
}

// Decay over time
setTimeout(() => {
  player.potionSatiation = Math.max(0, player.potionSatiation - 1);
}, 60000); // 1 minute
```

---

## Implementation Checklist

### Phase 1: Core Fix
- [ ] Add `onUse()` to ConsumableMixin
- [ ] Test basic consumption (use potion)
- [ ] Verify quantity reduction
- [ ] Verify messaging works

### Phase 2: Enhanced Use Command
- [ ] Add room notifications
- [ ] Add dead player validation
- [ ] Add full health warning
- [ ] Test edge cases

### Phase 3: Eat Command
- [ ] Create eat.js
- [ ] Add type validation
- [ ] Add delegation to use
- [ ] Test with food items
- [ ] Test errors with non-food

### Phase 4: Drink Command
- [ ] Create drink.js
- [ ] Add type validation
- [ ] Add keyword checking for beverages
- [ ] Test with potions
- [ ] Test with beverage foods (milk)
- [ ] Test errors with solid food

### Phase 5: Testing
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Manual testing
- [ ] Performance testing (many items)

### Phase 6: Documentation
- [ ] Update command help text
- [ ] Update player guide (if exists)
- [ ] Add examples to README

---

## Success Criteria

Implementation is complete when:

1. ✅ Players can consume health potions with "use potion"
2. ✅ Players can eat cookies with "eat cookie"
3. ✅ Players can drink potions with "drink potion"
4. ✅ Healing amounts are correct (25 HP for potion, 5 HP for cookie)
5. ✅ Quantity tracking works (3 cookies → 2 cookies → 1 cookie → 0)
6. ✅ Appropriate errors for wrong command (eat potion → suggests drink)
7. ✅ Room notifications work (others see "Player eats a cookie")
8. ✅ Dead players cannot consume items
9. ✅ Magical items still work with "use" command
10. ✅ All existing tests pass
11. ✅ No regressions in item system

---

## Conclusion

This design provides a comprehensive solution to the consumable commands issue by:

1. **Fixing the critical bug** with a clean interface unification approach
2. **Adding immersive commands** (eat/drink) for better roleplay
3. **Maintaining flexibility** for magical items and custom onUse hooks
4. **Ensuring robustness** with proper validation and edge case handling
5. **Planning for the future** with optional enhancement phases

The implementation is backwards compatible, extensible, and follows the established MUD patterns.

**Ready for mud-architect agent implementation.**
