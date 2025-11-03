# Weapon and Unarmed Damage System

## Overview

Implemented a proper weapon/unarmed damage system that dynamically determines damage dice based on equipped weapons, with unarmed attacks using 1d3+STR modifier formula.

## Previous Implementation

**Problem**: All attacks used hardcoded `'1d6'` damage
- No distinction between unarmed and armed
- No weapon variety
- No STR modifier on damage
- Not ready for future weapon system

## New Implementation

### Damage Calculation Flow

1. **Get Damage Dice**: `getDamageDice(attacker)` checks for equipped weapon
   - Has weapon: Use weapon's damage dice (e.g., `'1d8'`, `'2d6'`)
   - No weapon: Use unarmed damage (`'1d3'`)

2. **Roll Base Damage**: Roll the dice
   - Example: 1d3 rolls 1-3

3. **Add STR Modifier**: For melee/unarmed attacks
   - Calculate STR modifier: `(STR - 10) / 2` rounded down
   - Add to base damage
   - Unarmed always gets STR modifier
   - Melee weapons get STR modifier
   - Finesse weapons will use DEX (future)

4. **Ensure Minimum**: Damage can't go below 1
   - Even with negative STR modifier

5. **Apply Critical**: If critical hit, double final damage

## Code Implementation

### File: `src/combat/combatResolver.js`

#### getDamageDice() Function
```javascript
function getDamageDice(attacker) {
  // Check if attacker has a weapon equipped
  if (attacker.equippedWeapon && attacker.equippedWeapon.damage) {
    return attacker.equippedWeapon.damage;
  }

  // Unarmed damage: 1d3 (will add STR modifier separately)
  return '1d3';
}
```

#### Updated rollDamage() Function
```javascript
function rollDamage(attacker, damageDice, critical = false) {
  let baseDamage = rollDice(damageDice);

  // Add STR modifier for melee/unarmed attacks
  const strModifier = getModifier(attacker.strength || 10);

  // For unarmed attacks (1d3), always add STR
  // For weapons, check if weapon uses STR (melee) or DEX (finesse/ranged)
  const isUnarmed = damageDice === '1d3';
  const weaponUsesStr = !attacker.equippedWeapon ||
                        !attacker.equippedWeapon.finesse;

  if (isUnarmed || weaponUsesStr) {
    baseDamage += strModifier;
  }

  // Ensure minimum damage of 1 (even with negative STR)
  baseDamage = Math.max(1, baseDamage);

  // Critical hits double the damage
  const finalDamage = critical ? baseDamage * 2 : baseDamage;

  return finalDamage;
}
```

### File: `src/combat/CombatEncounter.js`

#### Regular Combat (lines 110-115)
```javascript
if (attackResult.hit) {
    const damageDice = getDamageDice(attacker);  // NEW: Dynamic dice
    const damage = rollDamage(attacker, damageDice, attackResult.critical);
    const damageResult = applyDamage(target, damage, 'physical');
    // ...
}
```

#### Attack of Opportunity (lines 69-74)
```javascript
if (opportunityAttack.hit) {
    const damageDice = getDamageDice(player);  // NEW: Dynamic dice
    const damage = rollDamage(player, damageDice, opportunityAttack.critical);
    const damageResult = applyDamage(attacker, damage, 'physical');
    // ...
}
```

## Damage Formulas

### Unarmed Attacks
```
Damage = 1d3 + STR modifier
Minimum: 1 (even with negative STR)
Critical: (1d3 + STR) × 2
```

**Examples**:
| STR | Modifier | Roll | Base | Final | Critical |
|-----|----------|------|------|-------|----------|
| 10  | +0       | 2    | 2    | 2     | 4        |
| 14  | +2       | 3    | 5    | 5     | 10       |
| 8   | -1       | 1    | 0→1  | 1     | 2        |
| 18  | +4       | 2    | 6    | 6     | 12       |

### Weapon Attacks (Future)
```
Damage = [weapon dice] + STR modifier (or DEX for finesse)
Minimum: 1
Critical: ([weapon dice] + modifier) × 2
```

**Example Weapons** (when implemented):
| Weapon | Dice | STR 14 (+2) | Critical |
|--------|------|-------------|----------|
| Dagger (finesse) | 1d4 | 1d4+2 DEX | (1d4+2)×2 |
| Shortsword | 1d6 | 1d6+2 | (1d6+2)×2 |
| Longsword | 1d8 | 1d8+2 | (1d8+2)×2 |
| Greatsword | 2d6 | 2d6+2 | (2d6+2)×2 |
| Greataxe | 1d12 | 1d12+2 | (1d12+2)×2 |

## Weapon Schema (For Future)

When adding weapons to the game, they should have this structure:

```javascript
{
  id: "longsword_01",
  name: "Longsword",
  type: "weapon",
  damage: "1d8",        // Damage dice
  damageType: "physical", // physical, fire, ice, etc.
  finesse: false,       // If true, can use DEX instead of STR
  twoHanded: false,     // Requires two hands
  properties: [],       // Additional properties (reach, light, etc.)
  description: "A versatile blade..."
}
```

### Example Weapons

**Dagger**:
```javascript
{
  id: "dagger",
  damage: "1d4",
  finesse: true,        // Can use DEX
  properties: ["light", "thrown"]
}
```

**Greatsword**:
```javascript
{
  id: "greatsword",
  damage: "2d6",
  twoHanded: true,
  finesse: false        // Must use STR
}
```

**Rapier**:
```javascript
{
  id: "rapier",
  damage: "1d8",
  finesse: true         // Can use DEX
}
```

## Player/NPC Equipment

To equip a weapon, set the `equippedWeapon` property:

```javascript
player.equippedWeapon = {
  damage: "1d8",
  finesse: false
};
```

Or reference a full weapon object:
```javascript
player.equippedWeapon = world.getObject("longsword_01");
```

## Damage Comparison

### Average Damage by STR

| Attack Type | STR 10 (+0) | STR 14 (+2) | STR 18 (+4) |
|-------------|-------------|-------------|-------------|
| Unarmed (1d3) | 2 (1-3) | 4 (3-5) | 6 (5-7) |
| Dagger (1d4) | 2.5 (1-4) | 4.5 (3-6) | 6.5 (5-8) |
| Shortsword (1d6) | 3.5 (1-6) | 5.5 (3-8) | 7.5 (5-10) |
| Longsword (1d8) | 4.5 (1-8) | 6.5 (3-10) | 8.5 (5-12) |
| Greatsword (2d6) | 7 (2-12) | 9 (4-14) | 11 (6-16) |

### Unarmed vs Armed

**Unarmed is viable at low STR**:
- STR 10: 1-3 damage (avg 2)
- Still deals 1 minimum damage even with STR 8

**Weapons scale better**:
- Better damage range
- More consistent output
- Higher maximum damage

## Testing Examples

### Unarmed Combat (STR 14, +2)
```
> attack wumpy
Player strikes Blue Wumpy!
[Roll: 1d3 = 2, +2 STR = 4]
4 physical damage!
Blue Wumpy: [################----] 16/20 HP
```

### Critical Hit Unarmed (STR 14, +2)
```
> attack wumpy
Player delivers a CRITICAL HIT to Blue Wumpy!
[Roll: 1d3 = 3, +2 STR = 5, ×2 critical = 10]
10 physical damage!
Blue Wumpy: [##------------------] 2/12 HP
```

### Attack of Opportunity (STR 10, +0)
```
Blue Wumpy attempts to flee!
[Attack of Opportunity] Player hits Blue Wumpy!
[Roll: 1d3 = 1, +0 STR = 1]
1 physical damage!
Blue Wumpy flees from combat!
```

### With Future Weapon (Longsword, 1d8, STR 16 +3)
```
> attack wumpy
Player strikes Blue Wumpy with their Longsword!
[Roll: 1d8 = 5, +3 STR = 8]
8 physical damage!
Blue Wumpy: [########------------] 12/20 HP
```

## Benefits

1. **Realistic Damage**: STR affects unarmed damage as it should
2. **Weapon Ready**: System prepared for weapon implementation
3. **Balanced**: 1d3+STR is weaker than weapons but viable
4. **Scalable**: Easy to add new weapons with different dice
5. **Critical Compatible**: Criticals double total damage correctly
6. **Minimum Guaranteed**: Always deals at least 1 damage

## Design Rationale

### Why 1d3+STR?

D&D 5e uses 1+STR for unarmed strikes, which is very weak. We chose 1d3+STR because:
- More interesting (variable damage)
- Still weaker than weapons
- Makes STR matter for unarmed combat
- Scales with character progression
- Average of 2+STR is reasonable for MUD combat

### Why STR for Unarmed?

- Unarmed strikes are punches/kicks (physical strength)
- Consistent with melee weapons
- Finesse weapons will use DEX (daggers, rapiers)
- DEX already affects AC and initiative

### Damage Caps

- Minimum: 1 (prevents 0 or negative damage)
- Maximum: None (high STR + good rolls = high damage)
- Critical: Doubles everything (keeps it exciting)

## Future Enhancements

### Weapon Properties
- **Finesse**: Use DEX instead of STR
- **Two-Handed**: Bonus damage, requires both hands
- **Light**: Can dual-wield
- **Reach**: Attack from distance
- **Versatile**: Can use one or two hands

### Special Attacks
- **Monk Unarmed**: 1d4 or 1d6 instead of 1d3
- **Tavern Brawler**: 1d4 unarmed
- **Magic Weapons**: +1, +2, +3 damage bonus
- **Elemental Weapons**: Fire, ice, lightning damage

### Dual Wielding
```javascript
if (player.offhandWeapon) {
  // Bonus action attack with offhand
  // No STR/DEX modifier unless feature
}
```

## Files Modified

1. **src/combat/combatResolver.js**
   - Added `getDamageDice(attacker)` function
   - Updated `rollDamage()` to add STR modifier
   - Handle unarmed vs weapon damage
   - Export `getDamageDice`

2. **src/combat/CombatEncounter.js**
   - Import `getDamageDice`
   - Use `getDamageDice(attacker)` for regular combat
   - Use `getDamageDice(player)` for attack of opportunity
   - Remove hardcoded '1d6'

## Migration Notes

**No breaking changes** - All existing NPCs and players will default to unarmed damage (1d3+STR).

When weapons are implemented:
1. Add `equippedWeapon` property to player/NPC
2. Set weapon's `damage` property (e.g., "1d8")
3. System automatically uses weapon damage
4. No code changes needed in combat system

## Summary

The weapon/unarmed damage system is now fully implemented and ready for future weapon additions. All attacks use dynamic damage dice based on equipped weapons, with unarmed attacks using the 1d3+STR formula as requested.
