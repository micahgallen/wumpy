# Quick Test Guide: Attunement & Identify Commands

This guide provides step-by-step instructions to test the new attunement and identify system in-game.

---

## Setup: Spawn Test Items

First, spawn some magical items to test with:

```
givemoney 10000
```

Then use the admin console or item spawning commands to give yourself these items:
- Ring of Protection (requires attunement, +1 AC)
- Flaming Longsword (requires attunement, +1 attack/damage, 1d6 fire)
- Longsword +2 (requires attunement, +2 attack/damage)
- Leather Armor (mundane, no attunement)

Or use these item IDs with a spawn command:
```
spawn ring_of_protection
spawn flaming_longsword
spawn longsword_plus_two
spawn leather_armor
```

---

## Test 1: Identify Command

### Test Magical Item
```
identify ring
```

**Expected Output:**
- Formatted header with item name
- Item description and examine text
- "Protective Magic: +2 bonus to AC"
- "(Requires Attunement)" with hint to use attune command
- Rarity: rare or legendary
- Value: gold amount

### Test Mundane Item
```
identify leather
```

**Expected Output:**
```
Leather Armor is a mundane item with no magical properties.
```

### Test Weapon Properties
```
identify flaming
```

**Expected Output:**
- Weapon Properties section
- Damage: 1d8 (1d10 two-handed) slashing
- +1 to attack rolls
- +1 to damage rolls
- Properties: versatile
- Magical Effects: Deals an extra 1d6 fire damage on_hit
- (Requires Attunement)

---

## Test 2: Attunement Status

### Check Initial Status
```
attune
```
or
```
attune list
```

**Expected Output:**
```
============================================================
Attunement Status
============================================================

Attunement Slots: 0/3
Available: 3

You are not attuned to any items.
```

---

## Test 3: Attune to Items

### Attune to First Item
```
attune ring
```

**Expected Output:**
```
You attune to Ring of Protection.
You focus your will on the item, binding it to your essence.

Attunement slots: 1/3
```

### Check Status Again
```
attune list
```

**Expected Output:**
```
Attunement Slots: 1/3
Available: 2

Attuned Items:

  • Ring of Protection
```

### Attune to Second Item
```
attune flaming
```

**Expected Output:**
```
You attune to Flaming Longsword.
You focus your will on the item, binding it to your essence.
You sense its magical properties awakening...

Attunement slots: 2/3
```

### Try to Attune to Mundane Item
```
attune leather
```

**Expected Output:**
```
Leather Armor does not require attunement.
```

### Try to Attune Again
```
attune ring
```

**Expected Output:**
```
You are already attuned to Ring of Protection.
```

---

## Test 4: Equipment with Attunement

### Equip Without Attunement
First, get a new Ring of Protection (or use a different item requiring attunement):
```
spawn ring_of_protection_plus_two
```

Check your AC:
```
score
```

Equip the ring:
```
equip ring
```

Check AC again:
```
score
```

**Expected:** AC should NOT change (item requires attunement but isn't attuned)

### Attune and Equip
```
attune ring
equip ring
score
```

**Expected:** AC should increase by +2 now that item is attuned

---

## Test 5: Attunement Slot Limit

### Fill All Slots
```
attune ring
attune flaming
attune longsword
```

**Expected:** All 3 slots filled (3/3)

### Try to Attune to Fourth Item
```
spawn frost_dagger
attune frost
```

**Expected Output:**
```
You have no available attunement slots (3/3).
Use "attune break <item>" to free up a slot.
```

---

## Test 6: Break Attunement

### Break One Attunement
```
attune break longsword
```

**Expected Output:**
```
You break your attunement with Longsword +2.
The magical bond fades as you release your focus.

Attunement slots: 2/3
```

### Check AC After Breaking
```
unequip longsword
equip longsword
score
```

**Expected:** Weapon bonuses should NOT apply (no longer attuned)

### Verify Slot is Free
```
attune list
```

**Expected:** Shows 2/3 slots, longsword not in list

### Attune to New Item
```
attune frost
```

**Expected:** Success! 3/3 slots again

---

## Test 7: Complete Workflow

This tests the full player workflow:

```
# 1. Find a magical item
get flaming longsword

# 2. Identify it to see properties
identify flaming

# 3. Check attunement status
attune list

# 4. Attune to the item
attune flaming

# 5. Equip it
equip flaming

# 6. Verify bonuses apply
score

# 7. Later, break attunement if needed
attune break flaming

# 8. Attune to something else
attune ring
```

---

## Verification Checklist

After testing, verify these behaviors:

**Identify Command:**
- [x] Shows detailed magical properties
- [x] Shows weapon damage, bonuses, and properties
- [x] Shows armor AC and modifiers
- [x] Shows attunement requirement
- [x] Shows mundane items correctly
- [x] Works with aliases (id)

**Attune Command:**
- [x] Shows current attunement status (0/3 slots)
- [x] Attunes to items successfully
- [x] Prevents attunement to mundane items
- [x] Prevents double-attunement
- [x] Enforces 3-slot limit
- [x] Breaks attunement successfully
- [x] Updates stats when attunement changes
- [x] Works with "attune to <item>" syntax

**Integration:**
- [x] Equipped items without attunement don't give bonuses
- [x] Equipped items with attunement DO give bonuses
- [x] Breaking attunement removes bonuses immediately
- [x] AC calculations respect attunement
- [x] Stat bonuses respect attunement
- [x] Attunement persists across equip/unequip

---

## Common Issues

**"You don't have 'ring' in your inventory"**
- Make sure you've spawned or picked up the item
- Try using the full name: `identify ring of protection`

**"Item does not require attunement"**
- You're trying to attune to a non-magical or low-tier magical item
- Only rare+ items with `requiresAttunement: true` need attunement
- Check with `identify` command first

**Bonuses not applying after attunement**
- Try unequipping and re-equipping the item
- Check `score` to see current stats
- Verify item is actually equipped: `equipment`

**Can't break attunement**
- Make sure you're using the exact item name
- The item must be in your inventory
- You must be attuned to it

---

## Success!

If all tests pass, the attunement system is working correctly! Players can now:
- Identify magical items to see their properties
- Attune to powerful items (max 3)
- Break attunement to swap items strategically
- Enjoy proper D&D 5e-style magical item mechanics

Happy testing!
