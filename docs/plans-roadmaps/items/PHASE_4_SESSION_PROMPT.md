# Phase 4 Implementation Prompt - Combat Integration

**Copy and paste this entire prompt into a fresh Claude Code session to begin Phase 4.**

---

I'm ready to implement Phase 4 (Combat Integration) of the item system. Please use the mud-architect agent to implement the combat integration based on the design documents, then use the mud-code-reviewer agent to review the implementation.

## Context Documents (Read These First)

1. **Implementation Plan:**
   `/docs/plans-roadmaps/items/ITEM_COMBAT_FINAL_IMPLEMENTATION_PLAN.md`
   - Read the Phase 4 section for detailed requirements

2. **Progress Tracking:**
   `/docs/plans-roadmaps/items/IMPLEMENTATION_PROGRESS.md`
   - Shows Phases 0, 1, 2, and 3 are COMPLETE
   - Phase 4 is next (Combat Integration)

3. **Current Configuration:**
   `/src/config/itemsConfig.js`
   - Proficiency penalties already defined
   - Dual wield rules configured
   - Combat-related settings

4. **Existing Systems:**
   - `/src/items/BaseItem.js` - Item base class
   - `/src/items/mixins/WeaponMixin.js` - Weapon properties (damage, proficiency)
   - `/src/items/mixins/ArmorMixin.js` - Armor properties (AC, DEX caps)
   - `/src/systems/equipment/EquipmentManager.js` - Equipment management with stat bonus system
   - `/src/systems/equipment/AttunementManager.js` - Attunement system
   - `/src/combat/` - Existing combat system (dice, modifiers, registry)

5. **Test Infrastructure:**
   - `/tests/runAllTests.js` - Test runner
   - `/tests/equipmentTests.js` - Equipment tests (14 passing)
   - `/tests/itemTests.js` - Item tests (35 passing)
   - `/tests/inventoryTests.js` - Inventory tests (23 passing)
   - Combat tests already exist in `/tests/` directory

## Current State (Phase 3 Complete)

**What's Working:**
- ✅ Equipment system fully functional (equip/unequip/equipment commands)
- ✅ Stat bonus system (base stats + equipment bonuses = effective stats)
- ✅ All equipment slots validated (weapon, armor, jewelry)
- ✅ Two-handed and dual wield mechanics
- ✅ Proficiency checking (warns but allows equip)
- ✅ Armor DEX caps enforced in AC calculation
- ✅ Attunement requirements checked
- ✅ Equipment state persists across login/logout
- ✅ 81/81 tests passing (items, spawn, inventory, equipment)

**Test Equipment Available:**
- `/world/core/items/testEquipmentSet.js` - 17 test items covering all slots
- `/world/core/items/sampleItems.js` - Sample weapons and armor with combat stats
- Light daggers for dual wield testing
- Various armor types (light, medium, heavy) for DEX cap testing

## Phase 4 Requirements - Combat Integration

### 1. Weapon Damage Integration
**Location:** Integrate with `/src/combat/AttackRoll.js` and damage calculation

**Requirements:**
- Use equipped weapon's `weaponProperties.damageDice` in combat
- Apply magical bonuses from weapons (e.g., +1 longsword)
- Use appropriate ability modifier (STR for melee, DEX for finesse/ranged)
- Handle unarmed combat (1 damage base, or 1d4 if no weapon)
- Support versatile weapons (1d8 one-handed, 1d10 two-handed)
- Critical hits should use weapon's critical range and multiplier

### 2. Proficiency Penalties
**Location:** Integrate with `/src/combat/AttackRoll.js`

**Requirements:**
- Check if player has proficiency with equipped weapon
- Apply -2 attack penalty if not proficient (from `itemsConfig.js`)
- Check armor proficiency and apply penalties:
  - No light armor proficiency: -2 to attack rolls, disadvantage on DEX checks
  - No medium armor proficiency: -4 to attack rolls, disadvantage on DEX/STR checks
  - No heavy armor proficiency: -6 to attack rolls, disadvantage on all physical checks
- Display proficiency penalties in combat messages

### 3. Armor Class Integration
**Location:** Use EquipmentManager's `calculateAC()` method in combat

**Requirements:**
- Use `EquipmentManager.calculateAC(player)` for target's AC
- Respect armor DEX caps (already implemented in EquipmentManager)
- Apply magical bonuses from armor
- Support unarmored AC (10 + DEX)
- Display AC in combat messages

### 4. Dual Wield Combat
**Location:** Integrate with combat action system

**Requirements:**
- Detect dual wielding (weapons in both main_hand and off_hand)
- Main hand attack uses normal rules
- Off-hand attack as bonus action:
  - Does NOT add ability modifier to damage (unless specific feat)
  - Uses same attack bonus as main hand
  - Must be light weapon (already validated by EquipmentManager)
- Option to toggle dual wield mode on/off
- Display both attacks in combat output

### 5. Attunement in Combat
**Location:** Integrate with damage/AC calculations

**Requirements:**
- Only apply magical bonuses if item is attuned (when required)
- Check `item.requiresAttunement` and `item.isAttuned`
- Magical properties only work if attuned
- Show warning if trying to use unattuneed magical item

### 6. Combat Commands Update
**Files to modify:**
- `/src/commands/core/attack.js` - Update to use weapon stats
- Consider adding `dualwield` toggle command
- Update combat output to show weapon names and armor

### 7. Testing
**Create:** `/tests/combatIntegrationTests.js`

**Test coverage:**
- Weapon damage in combat (with and without weapon)
- Proficiency penalties applied correctly
- AC calculation with different armor types
- Dual wield attacks (main + off-hand)
- Attunement requirement for magical bonuses
- Versatile weapon usage
- Critical hits with weapons
- Unarmored vs armored combat

## Implementation Steps

### Step 1: Architect Implementation
Use the **mud-architect** agent to:
1. Read all context documents
2. Examine existing combat system in `/src/combat/`
3. Integrate weapon damage with combat
4. Implement proficiency penalty system
5. Integrate AC calculation
6. Implement dual wield mechanics
7. Add attunement checking for magical bonuses
8. Update combat commands
9. Create comprehensive tests
10. Run all tests to ensure no regressions

### Step 2: Code Review
Use the **mud-code-reviewer** agent to:
1. Review the implementation for:
   - Integration quality with existing combat system
   - Adherence to design document requirements
   - Bug-free combat calculations
   - Edge case handling
   - Test coverage completeness
2. Verify all 81 existing tests still pass
3. Verify new combat integration tests pass
4. Check for performance issues
5. Ensure combat messages are clear and informative

## Exit Criteria for Phase 4

✅ Weapon damage used in combat calculations
✅ Proficiency penalties applied to attack rolls
✅ AC calculation uses equipped armor with DEX caps
✅ Dual wield system functional (main + off-hand)
✅ Attunement checked for magical bonuses
✅ Combat commands updated with equipment info
✅ Comprehensive tests created and passing
✅ All 81 existing tests still passing
✅ No regressions in equipment or inventory systems
✅ Combat output shows weapon and armor names
✅ Code reviewed by mud-code-reviewer agent

## Design Constraints

From the implementation plan, these decisions are locked:
- Weapon proficiency: -2 penalty (no block)
- Armor proficiency: Tiered penalties (-2/-4/-6)
- Dual wield: Off-hand gets no ability mod to damage
- Unarmed: 1 base damage (or 1d4 if implemented)
- Versatile: 1d8 one-handed, 1d10 two-handed
- Critical: Use weapon's critical range/multiplier
- Attunement: Required for magical bonuses

## Agent Instructions

**For mud-architect:**
- Implement Phase 4 Combat Integration following the design document
- Use established patterns from existing combat system
- Write comprehensive tests
- Return summary of implementation with test results

**For mud-code-reviewer:**
- Review implementation after architect completes
- Check integration quality and bug-free operation
- Verify test coverage
- Ensure no regressions
- Return review findings and recommendations

---

## Quick Start Command

After pasting this prompt, Claude Code should automatically:
1. Launch mud-architect agent to implement Phase 4
2. Launch mud-code-reviewer agent to review the code
3. Report results and test status
