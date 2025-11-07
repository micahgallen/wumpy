# Phase 4 Quick Start Guide

## TL;DR - Copy/Paste This Into Fresh Session

```
I'm ready to implement Phase 4 (Combat Integration) of the item system. Please use the mud-architect agent to implement the combat integration, then use the mud-code-reviewer agent to review it.

Read the full prompt at: /home/micah/wumpy/docs/plans-roadmaps/items/PHASE_4_SESSION_PROMPT.md

Key requirements:
1. Integrate weapon damage into combat
2. Apply proficiency penalties to attacks
3. Use armor AC in combat calculations
4. Implement dual wield off-hand attacks
5. Check attunement for magical bonuses
6. Create comprehensive tests
7. Ensure all 81 existing tests still pass
```

## What Gets Implemented

### Weapon Integration
- Combat uses equipped weapon's damage dice
- Magical bonuses applied (if attuned)
- Proficiency penalties (-2 if not proficient)
- Versatile weapon support
- Unarmed combat fallback

### Armor Integration
- Combat uses `EquipmentManager.calculateAC()`
- DEX caps already enforced
- Armor proficiency penalties
- Magical bonuses (if attuned)

### Dual Wield
- Main hand + off-hand attacks
- Off-hand doesn't add ability mod
- Both must be light weapons (already validated)
- Toggle command to enable/disable

### Testing
- New file: `/tests/combatIntegrationTests.js`
- Test weapon damage, proficiency, AC, dual wield, attunement
- All existing tests must still pass (81/81)

## Agent Workflow

1. **mud-architect** implements Phase 4
   - Reads design docs
   - Integrates with combat system
   - Creates tests
   - Runs all tests

2. **mud-code-reviewer** reviews implementation
   - Checks integration quality
   - Verifies no bugs
   - Ensures test coverage
   - Confirms no regressions

## Files to Focus On

**Existing Combat System:**
- `/src/combat/AttackRoll.js`
- `/src/combat/DamageCalculator.js`
- `/src/commands/core/attack.js`

**Equipment System (already complete):**
- `/src/systems/equipment/EquipmentManager.js`
- `/src/items/mixins/WeaponMixin.js`
- `/src/items/mixins/ArmorMixin.js`

**Test Items Available:**
- `/world/core/items/testEquipmentSet.js` - 17 items
- `/world/core/items/sampleItems.js` - Sample weapons/armor

## Expected Outcome

✅ Weapon damage used in combat
✅ Proficiency penalties working
✅ Armor AC protecting players
✅ Dual wield functional
✅ Attunement matters for magic items
✅ ~20 new combat integration tests
✅ 100+ total tests passing
✅ No regressions

## Current State (Phase 3 Complete)

- 81/81 tests passing
- Equipment system fully functional
- Stat bonus system working
- All slots validated and working
- Ready for combat integration!
