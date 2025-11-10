# Quick Inventory System Testing Guide

## Starting the Server

```bash
node src/server.js
```

The server will now load 13 sample items on startup.

## Testing the Inventory System

### 1. Connect and Login
```bash
telnet localhost 4000
```
Login with your username (or create a new character).

### 2. List Available Items
```
@spawn
```
This shows all available items you can spawn for testing.

### 3. Spawn Items

**Spawn a weapon:**
```
@spawn rusty_dagger
@spawn iron_longsword
@spawn flaming_sword
```

**Spawn armor:**
```
@spawn leather_armor
@spawn chainmail
```

**Spawn potions (stackable!):**
```
@spawn health_potion 5
@spawn minor_health_potion 10
```

**Spawn food:**
```
@spawn bread 3
```

**Spawn magical items:**
```
@spawn elven_cloak
@spawn flaming_sword
```

### 4. Check Your Inventory
```
inventory
inv
i
```

This shows a beautiful categorized display with:
- Items grouped by type (Weapons, Armor, Consumables, etc.)
- Quantity display for stackable items
- Equipped status
- Durability warnings
- Weight and slot usage with color coding

### 5. Test Item Commands

**Pick up items from the room:**
```
get dagger
get all
```

**Drop items:**
```
drop sword
drop potion
```

**Examine items:**
```
examine sword
look at potion
```

## Available Test Items

### Weapons
- `rusty_dagger` - 1d4 damage, light, finesse
- `iron_longsword` - 1d8 damage, versatile (1d10)
- `oak_staff` - 1d6 damage, versatile (1d8)
- `flaming_sword` - 1d8+1 damage, +1d6 fire, **RARE**

### Armor
- `leather_armor` - AC 11, light armor
- `chainmail` - AC 16, heavy armor, 55 lbs!
- `elven_cloak` - AC +1, +1 DEX, **MAGICAL**

### Consumables (Stackable!)
- `minor_health_potion` - Heals 10 HP
- `health_potion` - Heals 25 HP
- `bread` - Heals 5 HP, cheap food

### Quest Items
- `ancient_key` - Cannot be dropped or traded

### Currency
- `gold_coin` - Stackable currency

## Testing Scenarios

### Test Encumbrance
1. Check your starting capacity:
   ```
   inventory
   ```
   You'll see: `Weight: X/300 lbs, Slots: Y/20`

2. Spawn heavy armor to test weight limits:
   ```
   @spawn chainmail 5
   ```
   Should fail after a few due to weight!

3. Spawn many items to test slot limits:
   ```
   @spawn rusty_dagger
   ```
   Repeat 20+ times to hit the slot limit.

### Test Stacking
1. Spawn multiple potions:
   ```
   @spawn health_potion 5
   @spawn health_potion 10
   ```
   They should combine into a single stack!

2. Check inventory - should show `Health Potion x15`

### Test the Commands
```
# Drop and pick up
@spawn iron_longsword
drop longsword
get longsword

# Examine items
examine longsword

# Check inventory status
inventory
```

## Features to Observe

✨ **Color-coded encumbrance:**
- Green (<60%): You're fine
- Yellow (60-80%): Getting heavy
- Red (>80%): Nearly full!

✨ **Smart grouping:**
Items automatically grouped by type for easy reading

✨ **Stack display:**
Stackable items show as "Item x5" instead of 5 separate lines

✨ **Durability warnings:**
Items show `[worn]` or `[broken!]` based on condition

## Next Steps

Once you're comfortable with basic items, you can:
1. Create custom items in `world/core/items/sampleItems.js`
2. Test equipping items (coming in Phase 3!)
3. Test item durability in combat
4. Create items for your custom realms

Enjoy testing! 🎮
