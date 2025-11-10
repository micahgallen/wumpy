---
title: Corpse Mechanics
status: current
last_updated: 2025-11-10
related: [corpse-system, combat-overview, item-loot]
---

# Corpse Mechanics

Detailed mechanics for corpse decay, respawn timing, loot distribution, and edge case handling in the Wumpy MUD corpse system.

## Decay Timer Mechanics

### Timer Registration

When a corpse is created, a decay timer is registered:

| Step | Action | Implementation |
|------|--------|----------------|
| 1 | Calculate decay time | `createdAt + decayTime (300000ms)` |
| 2 | Create timer entry | `{decayTime, npcId, spawnLocation, ...}` |
| 3 | Store in Map | `corpseTimers.set(corpseId, timerData)` |
| 4 | Persist to file | Save to `corpse_timers.json` |

### Timer Checking

The CorpseDecayService checks timers every 10 seconds:

```javascript
setInterval(() => {
  const now = Date.now();
  for (const [corpseId, timer] of corpseTimers) {
    if (now >= timer.decayTime) {
      decayCorpse(corpseId, timer);
    }
  }
}, 10000);
```

**Precision:** ±10 seconds (decay occurs on next check after expiry)

### Edge Cases

| Scenario | Handling | Result |
|----------|----------|--------|
| Server restart during decay | Timer loaded from file | Decay continues |
| Corpse decays while player looting | Looting completes first | Items transferred before decay |
| Multiple corpses in same room | Each has independent timer | All decay separately |
| Timer file corrupted | Service initializes empty | Active corpses lost (rare) |
| System time changes | Based on absolute timestamps | Unaffected by time changes |

## Respawn Mechanics

### Respawn Timing

Respawn occurs immediately after corpse decay:

| Event | Timing | Notes |
|-------|--------|-------|
| Corpse created | T+0 | Timer starts |
| Decay time expires | T+5min | On next timer check |
| Corpse removed | T+5min | Immediate |
| NPC respawned | T+5min | Immediate |

**Total respawn cycle:** 5 minutes from death to respawn (default)

### Spawn Location Resolution

NPCs respawn at their original spawn location:

```javascript
// NPC definition
{
  "id": "goblin_warrior",
  "name": "Goblin Warrior",
  "spawnLocation": "goblin_camp"  // Critical property
}
```

**Resolution Steps:**
1. Get `spawnLocation` from timer data
2. Resolve room with `world.getRoom(spawnLocation)`
3. Verify room exists (error if missing)
4. Check if NPC already in room (skip if duplicate)
5. Add NPC to `room.npcs` array
6. Reset NPC HP to maxHP
7. Broadcast respawn to players in room

### Respawn Conditions

| Condition | Check | Action if Fails |
|-----------|-------|-----------------|
| **Room exists** | `getRoom() !== null` | Log error, skip respawn |
| **NPC not present** | `!room.npcs.includes(npcId)` | Skip respawn (already there) |
| **NPC definition exists** | `getNPC(npcId) !== null` | Log error, skip respawn |
| **Spawn location defined** | `timer.spawnLocation` | Log error, skip respawn |

### Race Condition Prevention

**Problem:** NPC could be manually respawned while corpse exists

**Solution:**
```javascript
// Always check before adding
if (room.npcs.includes(npcId)) {
  logger.log('NPC already exists, skipping respawn');
  return;
}
room.npcs.push(npcId);
```

## Loot Distribution Mechanics

### Loot Generation

Loot is generated once at corpse creation using the LootGenerator:

| Input | Source | Output |
|-------|--------|--------|
| NPC definition | `getNPC(npcId)` | NPC stats and loot table |
| Loot table | `npc.lootTable` | Item pool |
| Challenge rating | `npc.challengeRating` | Currency amount |
| Boss flag | `npc.isBoss` | Enhanced loot |
| Spawn tags | `npc.spawnTags` | Item filtering |

**Generation Formula:**

```
For each loot table entry:
  Roll chance: random(0, 1) < entry.chance
  If success:
    Roll quantity: random(entry.minQty, entry.maxQty)
    Create item instances
    Add to corpse inventory

Currency:
  baseCurrency = challengeRating * 5
  actualCurrency = random(baseCurrency * 0.5, baseCurrency * 1.5)
  If boss: actualCurrency *= 2
  Create currency items
  Add to corpse inventory
```

### Item Transfer Mechanics

When players loot items from corpses:

| Step | Process | Validation |
|------|---------|------------|
| 1. Find item | Search corpse inventory by keyword | Must exist |
| 2. Check encumbrance | `canAddItem(player, item)` | Weight and slots |
| 3. Restore instance | `ItemFactory.restoreItem()` | Deserialize item |
| 4. Stack check | Match definitionId and properties | If stackable |
| 5. Add to inventory | `InventoryManager.addItem()` | Auto-stacks |
| 6. Remove from corpse | Update corpse inventory | Decrease quantity |
| 7. Persist | Save player inventory | Database write |
| 8. Broadcast | Notify room | Other players see |

### Stacking Behavior

| Item Type | Stacks? | Conditions |
|-----------|---------|------------|
| Consumables | Yes | Same definitionId, unbound |
| Currency | Yes | Same denomination |
| Equipment | No | Each item unique |
| Quest items | No | Bound to player |
| Materials | Yes | Same type, unbound |

### Encumbrance Enforcement

**Weight Limit:**
```
Max Weight = 50 + (STR * 10)
Current Weight = sum of all item weights
Can Take = (Current + Item Weight) <= Max Weight
```

**Slot Limit:**
```
Max Slots = 10 + (STR * 1)
Current Slots = count of inventory items (stacks = 1 slot)
Can Take = Current Slots < Max Slots (or can stack with existing)
```

**Blocked Loot:**
- Items too heavy show: "That's too heavy to carry."
- Full inventory shows: "You don't have room for that."
- Partial stacks: "You take 3 (out of 5) potions."

## Empty Corpse Handling

When the last item is removed from a corpse:

| Trigger | Action | Message |
|---------|--------|---------|
| Last item taken | No special action | "The corpse is empty." |
| Examine empty corpse | Show empty inventory | "The corpse contains nothing." |
| Try to loot empty | Prevent action | "There's nothing to loot." |
| Decay timer | Normal decay | Corpse removed normally |

**Note:** Empty corpses still decay normally - timer is not affected by emptiness.

## Persistence Mechanics

### Save Format

Timer data persisted to `/data/corpse_timers.json`:

```javascript
{
  "corpse_goblin_123_1699999999": {
    "corpseId": "corpse_goblin_123_1699999999",
    "createdAt": 1699999999999,
    "decayTime": 1700000299999,
    "npcId": "goblin_warrior",
    "npcType": "goblin",
    "roomId": "dungeon_01",
    "spawnLocation": "goblin_camp",
    "isPlayerCorpse": false
  }
}
```

### Save Triggers

| Event | Save Action | Frequency |
|-------|-------------|-----------|
| Corpse created | Immediate save | Every create |
| Corpse decayed | Remove from file | Every decay |
| Server shutdown | Save all timers | On SIGINT |
| Periodic backup | Full save | Every 60 seconds |

### Load and Recovery

On server startup:

| Step | Action | Purpose |
|------|--------|---------|
| 1 | Read timer file | Load all timers |
| 2 | Parse JSON | Convert to Map |
| 3 | Validate entries | Check timestamps |
| 4 | Reconstruct corpses | Recreate containers |
| 5 | Resume checking | Start timer service |
| 6 | Clean expired | Decay overdue corpses |

**Expired Timers:**
- If `decayTime < Date.now()`: Immediately decay and respawn
- Handles corpses that should have decayed during downtime

## Weight Calculation

Corpse weight varies by creature size:

| Size | Weight (lbs) | Example Creatures |
|------|--------------|-------------------|
| Tiny | 10 | Pixie, sprite, rat |
| Small | 50 | Goblin, kobold, halfling |
| Medium | 100 | Human, elf, orc |
| Large | 200 | Ogre, troll, horse |
| Huge | 500 | Giant, dragon (young) |
| Gargantuan | 1000 | Ancient dragon, titan |

**Total Weight Calculation:**
```
Corpse Total Weight = Base Weight (by size) + Sum(Item Weights)
```

## Keyword Matching

Corpses can be targeted by multiple keywords:

| Keyword Type | Example | Source |
|--------------|---------|--------|
| Generic | "corpse", "body" | Hardcoded |
| NPC ID | "goblin_warrior" | `npc.id` |
| NPC Name (words) | "goblin", "warrior" | `npc.name.split()` |
| NPC Type | "humanoid", "undead" | `npc.type` |

**Matching Priority:**
1. Exact match on any keyword
2. Partial match on keywords (starts with)
3. Case-insensitive matching

## Broadcast Messages

When corpse-related events occur, messages are broadcast to the room:

| Event | Message | Recipients |
|-------|---------|-----------|
| Corpse created | "A corpse falls to the ground." | All in room |
| Player loots | "{Player} loots {item} from {corpse}." | Others in room |
| Corpse decays | "The corpse decays into nothingness." | All in room |
| NPC respawns | "{NPC} appears." | All in room |

**Player Feedback:**
- Item taken: "You take {item} from the corpse."
- Too heavy: "That's too heavy to carry."
- Empty corpse: "The corpse is empty."
- Full inventory: "You don't have room for that."

## Timer File Maintenance

### Automatic Cleanup

| Task | Frequency | Purpose |
|------|-----------|---------|
| Remove decayed entries | On decay | Keep file small |
| Validate JSON format | On load | Prevent corruption |
| Backup old file | On startup | Recovery option |
| Prune orphaned entries | Daily | Remove stale data |

### File Size Management

**Warning Thresholds:**
- < 50KB: Normal operation
- 50-100KB: Monitor (50-100 corpses)
- 100KB-1MB: Review (100-1000 corpses)
- > 1MB: Investigate potential bugs

**Growth Rate:**
- ~1KB per active corpse
- Expected: 10-50 corpses (10-50KB)
- Unusual: >500 corpses (>500KB)

## Error Handling

| Error Condition | Detection | Recovery |
|-----------------|-----------|----------|
| Missing room | `getRoom()` returns null | Log error, skip respawn |
| Missing NPC | `getNPC()` returns null | Log error, skip respawn |
| Corrupted timer file | JSON parse fails | Initialize empty, log warning |
| Duplicate NPC | NPC already in room | Skip respawn, log info |
| Container not found | Missing from room | Clean up timer, log error |

## Performance Optimization

| Optimization | Implementation | Benefit |
|--------------|----------------|---------|
| Batched decay checks | Process all timers in single loop | O(n) not O(n²) |
| Early exit | Skip checks if no corpses | Save CPU when idle |
| Indexed lookups | Map instead of array | O(1) timer access |
| Async I/O | Non-blocking file writes | No server lag |
| Lazy cleanup | Clean on decay, not proactively | Fewer operations |

## See Also

- [Corpse System Overview](../systems/corpse-system.md) - High-level architecture
- [Combat System Overview](../systems/combat-overview.md) - How corpses are created
- [Item Loot Reference](../reference/item-loot.md) - Loot table configuration
