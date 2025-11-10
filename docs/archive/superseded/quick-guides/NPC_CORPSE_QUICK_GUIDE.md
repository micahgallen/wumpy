# NPC Corpse System - Quick Guide

**Version:** 1.0
**Last Updated:** November 2025

---

## TL;DR

**NPCs automatically drop corpses when killed.** No configuration required.

---

## How It Works

1. **NPC dies** → Corpse drops in that room
2. **Corpse decays** after 5 minutes
3. **NPC respawns** in original room with full HP

Players can loot corpses for items and currency.

---

## Required Fields

**NONE.** Even a minimal NPC works:

```javascript
{
  id: 'goblin',
  name: 'Goblin',
  hp: 10,
  maxHp: 10
}
```

This NPC will automatically:
- Drop a corpse when killed
- Generate loot (items + currency)
- Respawn after corpse decay

---

## Optional Fields (Enhance Behavior)

### Corpse Weight
```javascript
size: 'small'  // tiny, small, medium, large, huge, gargantuan
```
- **Default:** `'medium'` (100 lbs)
- **Impact:** Tiny = 10 lbs, Huge = 500 lbs

### Loot Quality
```javascript
lootTables: ['uncommon_loot', 'boss_drops']
```
- **Default:** `['common_loot', 'trash_loot']`
- **Impact:** Controls what items can drop

### Currency Amount
```javascript
level: 5,
challengeRating: 3
```
- **Default:** `1`
- **Impact:** Higher = more gold dropped

### Boss Loot
```javascript
isBoss: true
```
- **Default:** `false`
- **Impact:** +2 extra items, more currency

### Loot Filtering
```javascript
spawnTags: ['realm_sesame_street', 'elite_drop']
```
- **Default:** `null`
- **Impact:** Only drops items matching these tags

---

## Corpse Properties

**Automatically generated:**
- **Name:** `"corpse of [NPC Name]"`
- **Description:** `"The lifeless body of [NPC]. Killed by [Player]."`
- **Keywords:** Extracted from NPC name (e.g., "Purple Wumpy" → `['corpse', 'body', 'purple', 'wumpy']`)
- **Weight:** Based on NPC size
- **Decay Time:** 5 minutes (300 seconds)
- **Contents:** Loot from LootGenerator + currency

**Players can:**
- `look corpse` - See contents and decay state
- `examine wumpy` - Use any keyword from NPC name
- `get <item> from corpse` - Loot items (TODO: not yet implemented)

---

## Decay States

When examined, corpses show qualitative decay:

| Time Remaining | State |
|---------------|-------|
| 75-100% (3.75-5 min) | "The corpse is still fresh." |
| 50-75% (2.5-3.75 min) | "The corpse shows signs of decay." |
| 25-50% (1.25-2.5 min) | "The corpse is rotting and beginning to smell." |
| 0-25% (0-1.25 min) | "The corpse is putrid and will soon decay completely." |

---

## Respawn Behavior

- **NPCs respawn** in their **original room** (the room they're assigned to in world files)
- **Respawn happens** when the corpse decays (after 5 minutes)
- **HP resets** to `maxHp`
- **Players in room** see: `"[NPC Name] appears in the room."`

**Note:** If an NPC roams to another room and dies there, it still respawns in its home room.

---

## Example: Enhanced Boss NPC

```javascript
{
  id: 'dragon_boss',
  name: 'Ancient Red Dragon',
  level: 15,
  hp: 500,
  maxHp: 500,

  // Corpse-relevant fields
  size: 'gargantuan',              // 1000 lb corpse
  isBoss: true,                    // Better loot
  lootTables: ['epic_loot', 'boss_drops'],
  spawnTags: ['magical', 'boss_drop', 'elite_drop'],
  challengeRating: 15,             // Lots of gold

  // Other combat stats...
}
```

**Result:**
- 1000 lb corpse (very heavy!)
- Epic/legendary loot
- High currency drops
- Respawns in original room after 5 minutes

---

## Configuration

Default settings in `/src/config/itemsConfig.js`:

```javascript
corpses: {
  npc: {
    decayTime: 300000,        // 5 minutes
    baseWeight: 100,          // 100 lbs default
    capacity: 20,             // 20 item slots
    isPickupable: true        // Can be carried (if strong enough)
  },
  sizeWeights: {
    tiny: 10,
    small: 50,
    medium: 100,
    large: 200,
    huge: 500,
    gargantuan: 1000
  }
}
```

---

## Common Patterns

### Trash Mob
```javascript
{
  id: 'goblin_scout',
  name: 'Goblin Scout',
  level: 1,
  size: 'small',
  lootTables: ['trash_loot']
}
```
→ Light corpse (50 lbs), minimal loot

### Elite Enemy
```javascript
{
  id: 'orc_champion',
  name: 'Orc Champion',
  level: 8,
  size: 'large',
  lootTables: ['uncommon_loot', 'rare_loot'],
  spawnTags: ['elite_drop']
}
```
→ Heavy corpse (200 lbs), better loot

### World Boss
```javascript
{
  id: 'lich_king',
  name: 'The Lich King',
  level: 20,
  isBoss: true,
  size: 'medium',
  lootTables: ['legendary_loot', 'boss_drops'],
  challengeRating: 20
}
```
→ Normal weight corpse, legendary loot, tons of gold

---

## FAQ

**Q: Do I need to configure anything for corpses to work?**
A: No. Corpses are automatic for all NPCs.

**Q: Can I prevent an NPC from dropping a corpse?**
A: Not currently. All combat deaths create corpses.

**Q: Can players pick up corpses?**
A: Yes, if they're strong enough. Corpses are heavy items.

**Q: What happens to items left in the corpse?**
A: They despawn with the corpse (prevents world litter).

**Q: Can I customize decay time per NPC?**
A: Not currently. All NPC corpses decay in 5 minutes.

**Q: Do roaming NPCs respawn at their current location or home?**
A: Home location (the room they're assigned to in world files).

---

## Summary

**For 99% of NPCs:** Do nothing. The system handles everything.

**For special NPCs:** Add `size`, `isBoss`, `lootTables`, and `spawnTags` to customize loot.

That's it! 🎉
