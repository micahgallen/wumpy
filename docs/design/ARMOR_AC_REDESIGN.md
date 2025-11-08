# Armor AC System Redesign

**Project:** The Wumpy and Grift MUD
**Document Version:** 1.0
**Date:** November 8, 2025
**Author:** MUD Architect (Claude)

---

## Executive Summary

**Problem:** The MUD has a multi-slot equipment system (9 armor slots) but uses D&D 5e-style AC calculation where AC is generated almost entirely by the chest armor piece. This creates an inconsistency: why have multiple armor slots if only one piece determines AC?

**Solution:** Redesign the AC system to use an **Aggregate AC Model** where each equipped armor piece contributes to total AC, while maintaining D&D 5e-inspired balance and combat math.

**Impact:**
- Makes all armor slots meaningful
- Preserves existing combat balance (AC stays in 10-22 range)
- Maintains D&D 5e feel with bounded accuracy
- Provides depth for equipment progression
- Allows for interesting set bonuses and gear synergies

---

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Proposed AC Formula](#proposed-ac-formula)
3. [Slot AC Contribution Guidelines](#slot-ac-contribution-guidelines)
4. [Example AC Calculations](#example-ac-calculations)
5. [Implementation Plan](#implementation-plan)
6. [Migration Strategy](#migration-strategy)
7. [Balance Considerations](#balance-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Appendices](#appendices)

---

## Current System Analysis

### Current AC Calculation (EquipmentManager.js:462-543)

```javascript
calculateAC(player) {
  const breakdown = [];
  let baseAC = 10; // Default unarmored AC
  let dexCap = Infinity;
  let magicalBonus = 0;
  let armorPiece = null;

  // Find armor (chest slot provides base AC)
  const chestArmor = this.getEquippedInSlot(player, EquipmentSlot.CHEST);
  if (chestArmor && chestArmor.armorProperties) {
    armorPiece = chestArmor;
    baseAC = chestArmor.armorProperties.baseAC || 10;
    dexCap = chestArmor.getMaxDexBonus ? chestArmor.getMaxDexBonus() : Infinity;

    // Magical AC bonus from chest
    if (isAttuned && chestArmor.armorProperties.magicalACBonus) {
      magicalBonus += chestArmor.armorProperties.magicalACBonus;
    }
  }

  // Calculate DEX bonus (capped by armor)
  const dexModifier = Math.floor((playerDex - 10) / 2);
  const cappedDexBonus = Math.max(0, Math.min(dexModifier, dexCap));

  // Add magical bonuses from other armor pieces
  for (const item of equippedItems) {
    if (item.instanceId === armorPiece?.instanceId) continue;

    if (isAttuned) {
      if (item.armorProperties?.magicalACBonus) {
        magicalBonus += item.armorProperties.magicalACBonus;
      }
      if (item.bonusAC > 0) {
        magicalBonus += item.bonusAC;
      }
    }
  }

  const totalAC = baseAC + cappedDexBonus + magicalBonus;
}
```

### Problems Identified

1. **Chest Dominance:** The chest piece sets baseAC entirely. Head, shoulders, hands, etc. provide zero AC unless they have magical bonuses.

2. **Wasted Slots:** 8 out of 9 armor slots (head, shoulders, wrists, hands, waist, legs, feet, back) contribute nothing to AC in their base form.

3. **Inconsistent Design:** The system has detailed multi-slot equipment but AC calculation ignores it.

4. **No Progression Depth:** Players can't meaningfully upgrade non-chest armor pieces for AC gains.

5. **Magical Items Only:** Non-chest armor only matters if it has `magicalACBonus`, creating a binary magical vs mundane problem.

### Current Item Examples

From `/world/core/items/testEquipmentSet.js`:

```javascript
// Chest piece: provides AC 5
{
  id: 'test_chainmail_shirt',
  armorProperties: {
    baseAC: 5,
    armorClass: ArmorClass.MEDIUM,
    maxDexBonus: 2
  }
}

// Head piece: provides AC 2 but IGNORED by current system
{
  id: 'test_iron_helmet',
  armorProperties: {
    baseAC: 2,  // This does nothing!
    armorClass: ArmorClass.MEDIUM,
    maxDexBonus: 2
  }
}
```

---

## Proposed AC Formula

### New Aggregate AC Formula

```
Total AC = 10 + Dexterity Modifier + Armor Slot Bonuses + Magical Bonuses

Where:
  - Base AC is always 10 (unarmored baseline)
  - Dexterity Modifier is capped by heaviest armor piece equipped
  - Armor Slot Bonuses = sum of AC contributions from all equipped armor
  - Magical Bonuses = sum of magicalACBonus from all equipped items
```

### Target AC Ranges (D&D 5e Compatible)

| Character State | Target AC | Example Build |
|----------------|-----------|---------------|
| Unarmored (DEX 10) | 10 | Naked |
| Unarmored (DEX 20) | 15 | Monk with 20 DEX |
| Light Armor (DEX 18) | 16-18 | Studded leather + full light set |
| Medium Armor (DEX 14) | 17-19 | Scale mail + full medium set |
| Heavy Armor (DEX 8) | 18-22 | Plate armor + full heavy set |
| Heavy + Shield | 20-24 | Plate + shield + full heavy set |

### AC Budget Distribution

To maintain D&D 5e balance, distribute AC across slots using a **Weighted Distribution Model**:

**Total Available AC Budget (excluding DEX and base 10):**
- Light Armor Full Set: 6-8 AC
- Medium Armor Full Set: 8-10 AC
- Heavy Armor Full Set: 10-12 AC

**Slot Weight Distribution:**

| Slot | Weight % | Light AC | Medium AC | Heavy AC | Rationale |
|------|----------|----------|-----------|----------|-----------|
| Chest | 40% | 3 | 4 | 5 | Largest coverage, main armor piece |
| Legs | 15% | 1 | 1-2 | 2 | Second largest coverage |
| Head | 12% | 1 | 1 | 1-2 | Critical protection area |
| Feet | 8% | 0-1 | 1 | 1 | Moderate importance |
| Hands | 8% | 0-1 | 1 | 1 | Moderate importance |
| Shoulders | 6% | 0-1 | 0-1 | 1 | Small piece |
| Wrists | 4% | 0 | 0-1 | 0-1 | Very small piece |
| Waist | 4% | 0 | 0-1 | 0-1 | Very small piece |
| Back | 3% | 0 | 0-1 | 0-1 | Cloak/cape |
| **Total** | **100%** | **6-8** | **9-11** | **11-13** | |

### DEX Modifier Cap Rule

The **heaviest armor piece equipped** determines the DEX cap:

```javascript
function calculateDexCap(equippedArmor) {
  let strictestCap = Infinity; // Start with no cap

  for (const item of equippedArmor) {
    const armorType = item.armorProperties.armorClass;
    const itemCap = getMaxDexForArmorType(armorType);
    strictestCap = Math.min(strictestCap, itemCap);
  }

  return strictestCap;
}

function getMaxDexForArmorType(armorType) {
  switch(armorType) {
    case ArmorClass.LIGHT: return Infinity;
    case ArmorClass.MEDIUM: return 2;
    case ArmorClass.HEAVY: return 0;
    case ArmorClass.SHIELD: return Infinity; // Shields don't restrict DEX
    default: return Infinity;
  }
}
```

**Example:** If wearing heavy chest (maxDex: 0) + light gloves (maxDex: ∞), the DEX cap is 0 because heavy armor restricts it.

---

## Slot AC Contribution Guidelines

### Light Armor Set Example

**Design Goal:** AC 16-18 fully equipped (with DEX 18: +4)

| Slot | Item Example | AC Bonus | Notes |
|------|-------------|----------|-------|
| Chest | Studded Leather | +3 | 40% of budget |
| Legs | Leather Greaves | +1 | 15% of budget |
| Head | Leather Cap | +1 | 12% of budget |
| Feet | Leather Boots | +1 | 8% of budget |
| Hands | Leather Gloves | +0-1 | 8% of budget |
| Shoulders | Leather Pauldrons | +0-1 | 6% of budget |
| Wrists | Leather Bracers | +0 | 4% of budget |
| Waist | Leather Belt | +0 | 4% of budget |
| Back | Traveler's Cloak | +0 | 3% of budget |
| **Total** | | **+7-8** | |
| **Final AC** | | **17-18** | 10 + 4 DEX + 7-8 armor |

### Medium Armor Set Example

**Design Goal:** AC 17-19 fully equipped (with DEX 14: +2 capped)

| Slot | Item Example | AC Bonus | Notes |
|------|-------------|----------|-------|
| Chest | Scale Mail | +4 | 40% of budget |
| Legs | Iron Greaves | +2 | 15% of budget |
| Head | Iron Helmet | +1 | 12% of budget |
| Feet | Iron Boots | +1 | 8% of budget |
| Hands | Chain Gloves | +1 | 8% of budget |
| Shoulders | Iron Pauldrons | +1 | 6% of budget |
| Wrists | Iron Bracers | +0-1 | 4% of budget |
| Waist | Studded Belt | +0-1 | 4% of budget |
| Back | Reinforced Cloak | +0-1 | 3% of budget |
| **Total** | | **+10-12** | |
| **Final AC** | | **17-19** | 10 + 2 DEX + 10-12 armor |

### Heavy Armor Set Example

**Design Goal:** AC 18-22 fully equipped (with DEX 8: +0 due to cap)

| Slot | Item Example | AC Bonus | Notes |
|------|-------------|----------|-------|
| Chest | Plate Mail | +5 | 40% of budget |
| Legs | Plate Greaves | +2 | 15% of budget |
| Head | Plate Helm | +2 | 12% of budget |
| Feet | Plate Boots | +1 | 8% of budget |
| Hands | Plate Gauntlets | +1 | 8% of budget |
| Shoulders | Plate Pauldrons | +1 | 6% of budget |
| Wrists | Plate Bracers | +1 | 4% of budget |
| Waist | Reinforced Belt | +1 | 4% of budget |
| Back | Heavy Cloak | +1 | 3% of budget |
| **Total** | | **+12-15** | |
| **Final AC** | | **18-22** | 10 + 0 DEX + 12-15 armor |

### Shield Handling

Shields occupy the OFF_HAND slot (not an armor slot) and provide flat AC bonus:

| Shield Type | AC Bonus | Notes |
|------------|----------|-------|
| Buckler | +1 | Small shield, light |
| Shield | +2 | Standard shield |
| Tower Shield | +3 | Heavy, may impose movement penalty |

---

## Example AC Calculations

### Example 1: Rogue in Light Armor (DEX 18)

**Equipment:**
- Chest: Studded Leather (+3 AC, light)
- Head: Leather Cap (+1 AC, light)
- Legs: Leather Greaves (+1 AC, light)
- Feet: Leather Boots (+1 AC, light)
- Hands: Leather Gloves (+1 AC, light)
- All other slots: empty

**Calculation:**
```
Base AC: 10
DEX Modifier: +4 (DEX 18)
DEX Cap: Infinity (all light armor)
Applied DEX: +4
Armor AC: 3 + 1 + 1 + 1 + 1 = +7

Total AC: 10 + 4 + 7 = 21
```

**With +1 Magic Chest:**
```
Total AC: 10 + 4 + 7 + 1 = 22
```

### Example 2: Fighter in Medium Armor (DEX 14)

**Equipment:**
- Chest: Scale Mail (+4 AC, medium)
- Head: Iron Helmet (+1 AC, medium)
- Legs: Iron Greaves (+2 AC, medium)
- Feet: Iron Boots (+1 AC, medium)
- Off-Hand: Shield (+2 AC, shield)

**Calculation:**
```
Base AC: 10
DEX Modifier: +2 (DEX 14)
DEX Cap: +2 (medium armor restricts)
Applied DEX: +2
Armor AC: 4 + 1 + 2 + 1 = +8
Shield AC: +2

Total AC: 10 + 2 + 8 + 2 = 22
```

### Example 3: Paladin in Heavy Armor (DEX 8)

**Equipment:**
- Chest: Plate Mail (+5 AC, heavy)
- Head: Plate Helm (+2 AC, heavy)
- Legs: Plate Greaves (+2 AC, heavy)
- Feet: Plate Boots (+1 AC, heavy)
- Hands: Plate Gauntlets (+1 AC, heavy)
- Shoulders: Plate Pauldrons (+1 AC, heavy)
- Off-Hand: Shield (+2 AC, shield)

**Calculation:**
```
Base AC: 10
DEX Modifier: -1 (DEX 8, but minimum 0 for AC)
DEX Cap: 0 (heavy armor)
Applied DEX: +0
Armor AC: 5 + 2 + 2 + 1 + 1 + 1 = +12
Shield AC: +2

Total AC: 10 + 0 + 12 + 2 = 24
```

### Example 4: Wizard Unarmored (DEX 16)

**Equipment:**
- Neck: Amulet of Protection (+1 AC, jewelry, magical)
- Ring: Ring of Protection (+1 AC, jewelry, magical)

**Calculation:**
```
Base AC: 10
DEX Modifier: +3 (DEX 16)
DEX Cap: Infinity (unarmored)
Applied DEX: +3
Armor AC: 0
Magical AC: +1 (amulet) + +1 (ring) = +2

Total AC: 10 + 3 + 0 + 2 = 15
```

### Example 5: Mixed Armor (Not Recommended)

**Equipment:**
- Chest: Plate Mail (+5 AC, heavy, maxDex: 0)
- Head: Leather Cap (+1 AC, light, maxDex: ∞)
- Hands: Leather Gloves (+1 AC, light, maxDex: ∞)

**Calculation:**
```
Base AC: 10
DEX Modifier: +3 (DEX 16)
DEX Cap: 0 (heaviest piece is heavy armor)
Applied DEX: +0
Armor AC: 5 + 1 + 1 = +7

Total AC: 10 + 0 + 7 = 17

Note: Mixing armor types is allowed but not optimal. The heavy chest
restricts DEX bonus even though other pieces are light.
```

---

## Implementation Plan

### Phase 1: Update AC Calculation Logic

**File:** `/home/micah/wumpy/src/systems/equipment/EquipmentManager.js`

**Changes to `calculateAC()` function:**

```javascript
/**
 * Calculate total armor class for player
 * NEW SYSTEM: Aggregate AC from all equipped armor pieces
 * @param {Object} player - Player object
 * @returns {Object} {baseAC: number, dexBonus: number, totalAC: number, breakdown: Array}
 */
calculateAC(player) {
  if (!player) {
    return { baseAC: 10, dexBonus: 0, totalAC: 10, breakdown: [] };
  }

  const breakdown = [];
  const baseAC = 10; // Always 10 for unarmored baseline
  let armorAC = 0;
  let magicalBonus = 0;
  let dexCap = Infinity;

  const equippedItems = this.getEquippedItems(player);
  const armorPieces = [];

  // First pass: Collect all armor pieces and determine strictest DEX cap
  for (const item of equippedItems) {
    if (!item.armorProperties) continue;

    armorPieces.push(item);

    // Determine strictest DEX cap from all armor pieces
    const itemDexCap = item.getMaxDexBonus ? item.getMaxDexBonus() : Infinity;
    dexCap = Math.min(dexCap, itemDexCap);
  }

  // Second pass: Sum armor AC bonuses
  for (const armor of armorPieces) {
    // Add base AC from armor piece
    const pieceAC = armor.armorProperties.baseAC || 0;
    if (pieceAC > 0) {
      armorAC += pieceAC;
      breakdown.push(`+${pieceAC} AC (${armor.name})`);
    }

    // Add magical AC bonus if attuned
    const isAttuned = !armor.requiresAttunement || armor.isAttuned;
    if (isAttuned && armor.armorProperties.magicalACBonus) {
      magicalBonus += armor.armorProperties.magicalACBonus;
      breakdown.push(`+${armor.armorProperties.magicalACBonus} magical (${armor.name})`);
    }
  }

  // Add magical AC bonuses from jewelry
  for (const item of equippedItems) {
    if (item.itemType === ItemType.JEWELRY && item.bonusAC) {
      const isAttuned = !item.requiresAttunement || item.isAttuned;
      if (isAttuned) {
        magicalBonus += item.bonusAC;
        breakdown.push(`+${item.bonusAC} AC (${item.name})`);
      }
    }
  }

  // Calculate DEX bonus (capped by armor)
  const playerDex = player.dex || 10;
  const dexModifier = Math.floor((playerDex - 10) / 2);
  const cappedDexBonus = Math.max(0, Math.min(dexModifier, dexCap));

  if (armorPieces.length === 0) {
    breakdown.unshift('Base AC 10 (unarmored)');
  } else {
    breakdown.unshift(`Base AC 10 + ${armorAC} armor`);
  }

  if (cappedDexBonus > 0) {
    breakdown.push(`+${cappedDexBonus} DEX bonus`);
    if (dexCap !== Infinity && dexModifier > cappedDexBonus) {
      breakdown.push(`(DEX capped at +${dexCap} by armor)`);
    }
  } else if (dexCap === 0 && dexModifier > 0) {
    breakdown.push(`DEX bonus suppressed by heavy armor`);
  }

  const totalAC = baseAC + armorAC + cappedDexBonus + magicalBonus;

  return {
    baseAC,
    armorAC,
    dexBonus: cappedDexBonus,
    magicalBonus,
    totalAC,
    breakdown
  };
}
```

### Phase 2: Update Armor Item Definitions

**Affected Files:**
- `/home/micah/wumpy/world/core/items/testEquipmentSet.js`
- `/home/micah/wumpy/world/core/items/magicalArmor.js`
- `/home/micah/wumpy/world/sesame_street/items/equipment/leather_cap.js`
- `/home/micah/wumpy/world/sesame_street/items/equipment/*.js`

**Migration Steps:**

1. **Review all existing armor items**
2. **Assign appropriate baseAC values** using the slot weight table
3. **Ensure armorClass (light/medium/heavy) is set correctly**
4. **Test AC calculations** with various equipment combinations

**Example Migration:**

**BEFORE (current):**
```javascript
{
  id: 'test_iron_helmet',
  armorProperties: {
    baseAC: 2,  // Currently ignored!
    armorClass: ArmorClass.MEDIUM,
    maxDexBonus: 2
  }
}
```

**AFTER (new system):**
```javascript
{
  id: 'test_iron_helmet',
  armorProperties: {
    baseAC: 1,  // Now contributes to total AC!
    armorClass: ArmorClass.MEDIUM,
    armorType: 'medium',
    maxDexBonus: 2
  }
}
```

### Phase 3: Update Tests

**New Test File:** `/home/micah/wumpy/tests/test_aggregate_ac.js`

```javascript
const { describe, it, before } = require('mocha');
const assert = require('assert');
const EquipmentManager = require('../src/systems/equipment/EquipmentManager');
const ItemRegistry = require('../src/items/ItemRegistry');

describe('Aggregate AC System', function() {
  it('should calculate unarmored AC correctly (10 + DEX)', function() {
    const player = { dex: 16, inventory: [] };
    const ac = EquipmentManager.calculateAC(player);
    assert.equal(ac.totalAC, 13); // 10 + 3 DEX
  });

  it('should sum AC from multiple armor pieces', function() {
    const player = {
      dex: 14,
      inventory: [
        createTestArmor('chest', 3, 'light', true),
        createTestArmor('head', 1, 'light', true),
        createTestArmor('legs', 1, 'light', true)
      ]
    };
    const ac = EquipmentManager.calculateAC(player);
    // 10 + 2 DEX + 5 armor = 17
    assert.equal(ac.totalAC, 17);
  });

  it('should apply heaviest armor DEX cap', function() {
    const player = {
      dex: 18, // +4 modifier
      inventory: [
        createTestArmor('chest', 5, 'heavy', true), // maxDex: 0
        createTestArmor('hands', 1, 'light', true)  // maxDex: ∞
      ]
    };
    const ac = EquipmentManager.calculateAC(player);
    // 10 + 0 DEX (capped) + 6 armor = 16
    assert.equal(ac.totalAC, 16);
    assert.equal(ac.dexBonus, 0);
  });

  it('should include magical AC bonuses', function() {
    const player = {
      dex: 14,
      inventory: [
        createMagicalArmor('chest', 3, 'light', 1, true, true) // +1 magic
      ]
    };
    const ac = EquipmentManager.calculateAC(player);
    // 10 + 2 DEX + 3 armor + 1 magic = 16
    assert.equal(ac.totalAC, 16);
  });

  it('should only apply magical bonuses if attuned', function() {
    const player = {
      dex: 14,
      inventory: [
        createMagicalArmor('chest', 3, 'light', 1, true, false) // not attuned
      ]
    };
    const ac = EquipmentManager.calculateAC(player);
    // 10 + 2 DEX + 3 armor + 0 magic = 15
    assert.equal(ac.totalAC, 15);
  });
});
```

### Phase 4: Update Documentation

**Files to Update:**
- `/home/micah/wumpy/docs/systems/items/ITEM_SYSTEM_DESIGN.md`
- `/home/micah/wumpy/docs/systems/combat/COMBAT_QUICK_REFERENCE.md`
- Add new file: `/home/micah/wumpy/docs/design/ARMOR_AC_SYSTEM.md`

**Player-Facing Documentation:**
- Add help file: `help armor`
- Add help file: `help ac`
- Update `score` command output to show AC breakdown

---

## Migration Strategy

### Backward Compatibility

**Option 1: Immediate Migration (Recommended)**
- Update all armor items at once
- Recalculate AC for all logged-in players
- Clear advantage: Clean, no technical debt

**Option 2: Graceful Migration**
- Support both systems temporarily
- Add `usesLegacyAC` flag to item definitions
- Migrate items incrementally
- Disadvantage: More complex, potential bugs

**Recommendation:** Option 1 (immediate migration) because:
1. The MUD is in active development
2. Player base is small/testing phase
3. Clean implementation is worth short disruption
4. Easier to balance

### Data Migration Script

**File:** `/home/micah/wumpy/scripts/migrate_armor_ac.js`

```javascript
/**
 * Migrate armor AC values to new aggregate system
 *
 * This script:
 * 1. Loads all armor item definitions
 * 2. Adjusts baseAC values according to slot weights
 * 3. Validates AC totals are in target ranges
 * 4. Backs up original files
 * 5. Writes updated definitions
 */

const fs = require('fs');
const path = require('path');

const SLOT_AC_BUDGETS = {
  light: {
    chest: 3,
    legs: 1,
    head: 1,
    feet: 1,
    hands: 1,
    shoulders: 1,
    wrists: 0,
    waist: 0,
    back: 0
  },
  medium: {
    chest: 4,
    legs: 2,
    head: 1,
    feet: 1,
    hands: 1,
    shoulders: 1,
    wrists: 1,
    waist: 1,
    back: 1
  },
  heavy: {
    chest: 5,
    legs: 2,
    head: 2,
    feet: 1,
    hands: 1,
    shoulders: 1,
    wrists: 1,
    waist: 1,
    back: 1
  }
};

function migrateArmorAC(itemDef) {
  if (itemDef.itemType !== 'armor') return itemDef;
  if (!itemDef.armorProperties) return itemDef;

  const slot = itemDef.slot;
  const armorType = itemDef.armorProperties.armorClass || 'light';

  // Get recommended AC for this slot/type combination
  const recommendedAC = SLOT_AC_BUDGETS[armorType]?.[slot] || 0;

  // If this is a magical item, preserve the magical bonus
  const currentMagicalBonus = itemDef.armorProperties.magicalACBonus || 0;

  // Update baseAC
  itemDef.armorProperties.baseAC = recommendedAC;

  console.log(`Migrated ${itemDef.id}: AC ${recommendedAC} (${armorType} ${slot})`);

  return itemDef;
}

// Run migration
const worldDir = path.join(__dirname, '../world');
// ... (recursive file processing)
```

### Player Communication

**Announcement Template:**

```
=== EQUIPMENT SYSTEM UPDATE ===

The armor system has been updated to make all armor slots meaningful!

WHAT CHANGED:
- Each piece of armor now contributes to your total AC
- Helmets, gloves, boots, etc. now provide protection
- Your total AC is calculated by adding up all equipped armor pieces

WHAT STAYED THE SAME:
- AC values remain balanced for D&D 5e-style combat
- Heavy armor still limits DEX bonus to AC
- Combat math and balance preserved

WHAT TO DO:
- Check your equipment with 'equipment' command
- Review your AC with 'score' command
- Equip full armor sets for maximum protection!

Questions? Type 'help armor' for details.
```

---

## Balance Considerations

### AC Inflation Prevention

**Problem:** Summing AC from 9 slots could inflate AC too high.

**Solutions:**
1. **Strict AC budgets** per armor type (implemented above)
2. **Diminishing returns** - Not recommended (adds complexity)
3. **Set bonuses** - Reward full sets without inflating partial sets

### Set Bonuses (Optional Enhancement)

**Concept:** Wearing a complete matching armor set grants bonus.

```javascript
// Example set bonus
{
  setName: 'Plate of the Guardian',
  setPieces: ['chest', 'head', 'legs', 'hands', 'feet', 'shoulders'],
  setBonuses: [
    { pieces: 2, bonus: { str: 1 } },
    { pieces: 4, bonus: { ac: 1 } },
    { pieces: 6, bonus: { ac: 1, damageReduction: 1 } }
  ]
}
```

### Partial Armor Sets

**Question:** Should players be rewarded for wearing partial sets?

**Answer:** Yes, naturally! The aggregate system inherently rewards wearing more armor pieces.

**Example:**
- 2 pieces: AC 10 + DEX + 4 = ~16
- 4 pieces: AC 10 + DEX + 7 = ~19
- 6 pieces: AC 10 + DEX + 10 = ~22

### Alternative Bonuses for Minor Slots

**Problem:** Small armor pieces (wrists, waist, back) have tiny AC contributions.

**Solution:** Give them alternative bonuses instead:

| Slot | Primary Bonus | Alternative Bonus Options |
|------|---------------|---------------------------|
| Wrists | +0-1 AC | +1 Melee Attack, Parry bonus |
| Waist | +0-1 AC | +5 HP, Carry weight +10 |
| Back | +0-1 AC | Movement speed +5, Fall damage reduction |
| Shoulders | +1 AC | Bash resistance, Grapple bonus |

---

## Testing Strategy

### Unit Tests

**File:** `/home/micah/wumpy/tests/test_aggregate_ac.js`

**Test Cases:**
1. Unarmored AC (10 + DEX)
2. Single armor piece
3. Full light armor set
4. Full medium armor set
5. Full heavy armor set
6. Mixed armor types (DEX cap verification)
7. Magical AC bonuses
8. Attunement requirements
9. Jewelry AC bonuses
10. Shield AC stacking

### Integration Tests

**File:** `/home/micah/wumpy/tests/test_ac_integration.js`

**Test Scenarios:**
1. Equip full armor set, verify AC matches expected
2. Unequip pieces one-by-one, verify AC decreases correctly
3. Swap armor pieces, verify AC updates
4. Level up with equipment, verify stats recalculate
5. Combat integration: verify AC affects hit chance correctly

### Balance Testing

**Manual Test Plan:**

1. **Create test characters at various levels**
   - Level 1, 5, 10, 15, 20

2. **Equip various armor combinations**
   - Light armor full set
   - Medium armor full set
   - Heavy armor full set
   - Partial sets (2, 4, 6 pieces)

3. **Verify AC ranges**
   - Light: 15-18
   - Medium: 17-19
   - Heavy: 18-22

4. **Combat balance test**
   - Fight monsters with current hit bonuses
   - Verify ~65% hit rate against medium AC
   - Verify ~40% hit rate against high AC
   - Verify ~85% hit rate against low AC

### Regression Testing

**Verify these systems still work:**
- [ ] Equipment command displays correctly
- [ ] Score command shows AC accurately
- [ ] Combat to-hit calculations correct
- [ ] Equip/unequip flows work
- [ ] Stat recalculation on equip/unequip
- [ ] Persistence (save/load)
- [ ] Magical item attunement
- [ ] Proficiency system

---

## Appendices

### Appendix A: Comparison with D&D 5e

| System | D&D 5e | Current MUD | Proposed MUD |
|--------|--------|-------------|--------------|
| Base AC | 10 | 10 | 10 |
| Light Armor Example | Studded Leather (12) | Chest only (12) | Full set (17) |
| Medium Armor Example | Half Plate (15) | Chest only (15) | Full set (19) |
| Heavy Armor Example | Plate (18) | Chest only (18) | Full set (22) |
| DEX Bonus | Applied | Applied | Applied |
| DEX Cap (Heavy) | +0 | +0 | +0 |
| DEX Cap (Medium) | +2 | +2 | +2 |
| DEX Cap (Light) | Unlimited | Unlimited | Unlimited |
| Shield | +2 | +2 | +2 |
| Magic Armor | +1/+2/+3 | +1/+2/+3 | +1/+2/+3 |

**Key Difference:** D&D 5e armor is single-piece (just "plate armor"). The MUD has 9 armor slots, so we distribute the AC across those slots while maintaining total AC in the same range.

### Appendix B: Current Item Audit

**Armor Items to Update:**

```
/world/core/items/testEquipmentSet.js:
  - test_iron_helmet (head, medium, AC 2 → 1)
  - test_leather_pauldrons (shoulders, light, AC 1 → 1)
  - test_chainmail_shirt (chest, medium, AC 5 → 4)
  - test_travelers_cloak (back, light, AC 1 → 0)
  - test_iron_bracers (wrists, medium, AC 1 → 1)
  - test_leather_gloves (hands, light, AC 1 → 1)
  - test_studded_belt (waist, light, AC 1 → 0)
  - test_iron_greaves (legs, heavy, AC 3 → 2)
  - test_leather_boots (feet, light, AC 1 → 1)
  - test_steel_greathelm (head, heavy, AC 3 → 2)

/world/core/items/magicalArmor.js:
  - leather_armor_plus_one (chest, light, baseAC 11 → 3, magicAC +1)
  - studded_leather_plus_one (chest, light, baseAC 12 → 3, magicAC +1)
  - chain_shirt_plus_one (chest, medium, baseAC 13 → 4, magicAC +1)
  - scale_mail_plus_one (chest, medium, baseAC 14 → 4, magicAC +1)
  - breastplate_plus_one (chest, medium, baseAC 14 → 4, magicAC +1)
  - chain_mail_plus_one (chest, heavy, baseAC 16 → 5, magicAC +1)
  - plate_armor_plus_one (chest, heavy, baseAC 18 → 5, magicAC +1)
  - plate_armor_plus_two (chest, heavy, baseAC 18 → 5, magicAC +2)
  - studded_leather_plus_two (chest, light, baseAC 12 → 3, magicAC +2)

/world/sesame_street/items/equipment/leather_cap.js:
  - leather_cap (head, light, AC 1 → 1) ✓ Already correct!
```

### Appendix C: Quick Reference Card

**For Players:**

```
=== ARMOR CLASS (AC) QUICK REFERENCE ===

Your AC determines how hard you are to hit in combat.

FORMULA:
  Total AC = 10 + DEX Bonus + Armor Pieces + Magic Bonuses

DEX BONUS:
  - Light Armor: Full DEX bonus applies
  - Medium Armor: Max +2 DEX bonus
  - Heavy Armor: No DEX bonus
  - Unarmored: Full DEX bonus applies

ARMOR PIECES:
  Each piece of armor you wear contributes AC:
    Chest:     +3 to +5 AC (largest piece)
    Legs:      +1 to +2 AC
    Head:      +1 to +2 AC
    Feet:      +1 AC
    Hands:     +1 AC
    Shoulders: +1 AC
    Wrists:    +0 to +1 AC
    Waist:     +0 to +1 AC
    Back:      +0 to +1 AC

SHIELDS:
  +2 AC (occupies off-hand, can't dual-wield)

TIPS:
  - Wear a complete armor set for maximum AC
  - Heavy armor gives best AC but restricts DEX bonus
  - Light armor is good for high-DEX characters
  - Check your AC with 'score' command
  - See equipped armor with 'equipment' command
```

---

## Conclusion

This redesign solves the fundamental inconsistency between the multi-slot equipment system and the single-piece AC calculation. By implementing an aggregate AC model with careful budget distribution, we achieve:

1. **Meaningful Equipment Slots:** Every armor piece matters
2. **Preserved Balance:** AC stays in D&D 5e ranges (10-22)
3. **Strategic Depth:** Choosing armor pieces becomes meaningful
4. **Progression Path:** Players can incrementally upgrade each slot
5. **D&D 5e Compatibility:** Core mechanics remain familiar

**Next Steps:**
1. Review and approve this design
2. Implement Phase 1 (AC calculation logic)
3. Migrate armor items (Phase 2)
4. Run comprehensive tests (Phase 3)
5. Update documentation (Phase 4)
6. Deploy and monitor

**Estimated Implementation Time:** 2-3 days
- Day 1: Code changes + initial testing
- Day 2: Item migration + integration testing
- Day 3: Documentation + final testing + deployment
