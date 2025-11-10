# Phase 5: Corpse Looting System - Implementation Complete

## Overview

Phase 5 of the corpse and respawn system implements the ability for players to loot items from corpses. This completes the full corpse lifecycle: creation → decay → respawn, with full looting functionality.

## Implementation Date
2025-11-09

## Status
✅ **COMPLETE** - All features implemented and tested

## Features Implemented

### 1. Extended `get` Command

**File:** `/src/commands/core/get.js`

The existing `get` command has been extended to support container syntax:

```javascript
get <item> from <container>        // Get specific item
get <qty> <item> from <container>  // Get specific quantity
get all <item> from <container>    // Get all of one item type
get all from <container>            // Get everything
```

**Key Implementation Details:**
- Detects "from" keyword in command arguments
- Routes to `executeGetFromContainer()` function
- Finds containers (corpses) in room by keywords
- Supports partial stack pickups (e.g., "get 2 potion from corpse")
- Properly handles item stacking in player inventory
- Enforces encumbrance (weight and slot limits)
- Broadcasts actions to other players in room
- Shows "corpse is empty" message when last item taken

**New Functions Added:**
- `executeGetFromContainer(player, args, context, fromIndex)` - Main handler
- `getAllFromContainer(player, containerArgs, context)` - "get all from X" handler
- `findContainerInRoom(room, keyword)` - Locate containers by keywords
- `findItemInContainer(container, keyword)` - Locate items within container

### 2. New `loot` Command

**File:** `/src/commands/core/loot.js`

A convenience command for quick-looting all items from a container at once.

```javascript
loot <container>  // Quick-loot everything
```

**Features:**
- Takes all items in one command
- Shows itemized list of what was looted
- Shows items that couldn't be taken (encumbrance limits)
- Updates encumbrance display
- Broadcasts to other players
- Handles empty corpses gracefully

**Registration:** Added to `/src/commands.js` command registry

### 3. Container Finding System

Both commands use a flexible keyword matching system:

```javascript
get sword from corpse        // Matches "corpse" keyword
get sword from goblin        // Matches NPC name in corpse keywords
get sword from wumpy         // Matches NPC name
get sword from body          // Matches "body" keyword
```

**How It Works:**
- Corpses have keywords array: `['corpse', 'body', npc.id, ...npc.name.split()]`
- Finding checks both `item.name` and `item.keywords` arrays
- Uses case-insensitive matching
- Prioritizes exact matches, falls back to partial matches

### 4. Item Transfer Logic

**Proper Item Handling:**
1. Find item in corpse inventory (serialized data)
2. Restore item instance using `ItemFactory.restoreItem()`
3. Check player encumbrance with `InventoryManager.canAddItem()`
4. Add to player inventory with `InventoryManager.addItem()` (handles stacking)
5. Remove from corpse inventory (or update quantity for partial stacks)
6. Save player inventory to database

**Stacking Behavior:**
- Stackable items (consumables, currency) automatically stack
- Non-stackable items (equipment) create new inventory slots
- Stacking occurs when `definitionId` matches and items are unbound/unenchanted

### 5. Encumbrance Integration

**Weight and Slot Limits:**
- Max Weight = 150 lbs (base 50 + STR * 10)
- Max Slots = 20 (base 10 + STR * 1)
- Items blocked if either limit would be exceeded
- Clear error messages: "Too heavy!" or "No room!"

**Partial Looting:**
- If inventory fills up mid-loot, shows what was taken
- Shows what couldn't be taken
- Items remain in corpse for later retrieval

### 6. Room Messages

**Player Sees:**
```
You take Rusty Sword from the corpse of Goblin Warrior.
Weight: 5.0/150 lbs | Slots: 1/20
```

**Others See:**
```
Adventurer takes Rusty Sword from the corpse of Goblin Warrior.
```

**Empty Corpse:**
```
The corpse of Goblin Warrior is now empty.
```

## Testing

### Unit Tests
**File:** `/tests/corpseLootingTests.js`

**12 comprehensive tests covering:**
- ✅ Get single item from corpse
- ✅ Get multiple stackable items (partial stacks)
- ✅ Get all of one item type
- ✅ Get all items from corpse
- ✅ Loot command functionality
- ✅ Encumbrance limits (inventory full)
- ✅ Empty corpse handling
- ✅ Non-existent item handling
- ✅ Non-existent corpse handling
- ✅ Corpse keyword finding (by NPC name)
- ✅ Item stacking behavior
- ✅ Concurrent looting (multiple players)

**Test Results:** All 12 tests passing ✅

### Integration Demo
**File:** `/tests/corpseLootingDemo.js`

Demonstrates complete workflow:
1. Create corpse with loot
2. Examine corpse contents
3. Loot specific items
4. Loot partial stacks
5. Loot all remaining items
6. Handle empty corpse

## Command Usage Examples

### Basic Looting
```
get sword from corpse
get potion from goblin
take dagger from wumpy
```

### Quantity Looting
```
get 5 coins from corpse
get 2 potion from body
take 10 arrows from goblin
```

### Get All Variants
```
get all coins from corpse       // All coins only
get all potion from goblin      // All potions only
get all from corpse             // Everything
```

### Quick Loot
```
loot corpse
loot goblin
loot wumpy
```

## Integration with Existing Systems

### CorpseManager
- Corpses created with `inventory` array
- Items stored as serialized data
- Compatible with existing corpse structure

### InventoryManager
- Uses `addItem()` for proper stacking
- Uses `getInventoryStats()` for encumbrance
- Uses `findItemByKeyword()` for item searching

### ItemFactory
- Uses `restoreItem()` to recreate instances
- Preserves item properties (quantity, durability, etc.)

### Command System
- Registered in `/src/commands.js`
- Uses standard command context
- Integrates with `allPlayers` for broadcasts

## Edge Cases Handled

### Empty Containers
- Shows "The [container] is empty" message
- Prevents errors when looting empty corpses

### Non-Existent Containers
- Clear error: "You don't see [container] here"
- Doesn't crash if corpse decayed

### Non-Existent Items
- Clear error: "There's no [item] in the [container]"
- Helps players know what's actually available

### Inventory Limits
- Weight limit enforcement
- Slot limit enforcement
- Clear feedback on why item can't be taken
- Shows remaining capacity

### Concurrent Looting
- First player to execute command gets the item
- Second player sees "not found" (item already taken)
- No duplication bugs
- Thread-safe (commands execute sequentially)

### Item Stacking
- Properly combines stackable items
- Maintains separate stacks for enchanted/bound items
- Shows "(stacked)" message when stacking occurs

## Performance Characteristics

### Command Execution
- O(1) to find corpse in room (typically <5 items)
- O(N) to find item in corpse (N = items in corpse, typically <10)
- O(M) to stack items (M = player inventory size, typically <20)
- **Overall: O(N+M) ≈ O(1) in practice**

### Memory Usage
- No additional memory allocated (modifies existing structures)
- Transfers items from corpse to player inventory
- Minimal overhead (~1KB per looting operation for messages)

## Future Enhancements

### Potential Improvements
1. **Container Permissions** - Allow corpses to be "locked" to killer for N seconds
2. **Loot Rights** - Track who dealt damage, limit looting to party
3. **Auto-Loot** - Optional setting to auto-loot on kill
4. **Loot Filters** - "loot all gold" or "loot all consumables"
5. **Container Types** - Extend to chests, bags, etc.
6. **Weight Display** - Show container weight in examine

### Known Limitations
1. No loot rights system (anyone can loot any corpse)
2. No partial stack warnings ("corpse only has 3, you asked for 5")
3. No item preview before looting all
4. Currency doesn't auto-convert when looting (separate from drop)

## Success Criteria (Phase 5)

All success criteria met:

- ✅ Players can `get <item> from corpse`
- ✅ Players can `get all from corpse`
- ✅ Items transfer correctly to player inventory
- ✅ Currency/stackables combine properly
- ✅ Capacity/weight limits enforced
- ✅ Empty corpses handled appropriately
- ✅ Room messages broadcast
- ✅ All looting tests pass

## Files Modified/Created

### Modified Files
- `/src/commands/core/get.js` - Extended with container support
- `/src/commands.js` - Registered loot command

### New Files
- `/src/commands/core/loot.js` - Quick-loot command
- `/tests/corpseLootingTests.js` - Comprehensive test suite
- `/tests/corpseLootingDemo.js` - Integration demo
- `/docs/PHASE_5_CORPSE_LOOTING_IMPLEMENTATION.md` - This document

## Conclusion

Phase 5 completes the corpse looting system with a robust, well-tested implementation. Players can now:
- Loot specific items or everything at once
- See clear feedback on inventory limits
- Stack items properly
- Get helpful error messages

The implementation integrates seamlessly with existing systems and handles all edge cases gracefully. The codebase is maintainable, well-documented, and thoroughly tested.

**Phase 5: COMPLETE ✅**

---

*Implemented by: MUD Architect*
*Date: 2025-11-09*
*Tests: 12/12 passing*
