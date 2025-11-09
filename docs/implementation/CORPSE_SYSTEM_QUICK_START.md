# Corpse System - Quick Start Guide

**For:** Developers implementing corpse and respawn features
**Date:** 2025-11-08
**Version:** 1.0

---

## Overview

This guide provides a quick reference for implementing the corpse container and respawn system. For detailed architecture, see `CORPSE_RESPAWN_IMPLEMENTATION_JOURNAL.md`.

---

## Implementation Checklist

### Phase 1: Foundation (2 hours)

- [ ] Add corpse config to `/src/config/itemsConfig.js`
- [ ] Create `/src/systems/corpses/CorpseManager.js`
- [ ] Add `spawnLocation` property to NPC definitions
- [ ] Test: Create corpse manually, verify properties

### Phase 2: Decay Timer (3 hours)

- [ ] Create `/src/systems/corpses/CorpseDecayService.js`
- [ ] Implement timer tracking with Map
- [ ] Add persistence to `/data/corpse_timers.json`
- [ ] Initialize service in `/src/server.js`
- [ ] Add SIGINT handler for graceful shutdown
- [ ] Test: Decay after 5 minutes, verify respawn

### Phase 3: Combat Integration (2 hours)

- [ ] Import `CorpseManager` in `/src/combat/CombatEncounter.js`
- [ ] Add corpse creation after NPC death (line ~185)
- [ ] Handle flee scenario corpse (line ~88)
- [ ] Add death message: "A corpse falls to the ground."
- [ ] Test: Kill NPC in combat, verify corpse appears

### Phase 4: Commands (2 hours)

- [ ] Create `/src/commands/containers/loot.js`
- [ ] Update `/src/world.js` formatRoom() to show corpses
- [ ] Extend `examine` command for decay time
- [ ] Test: Loot corpse, verify items transfer

### Phase 5: Admin Tools (1 hour)

- [ ] Add `@clearcorpses` to `/src/admin/commands.js`
- [ ] Add `@listcorpses` command
- [ ] Test: Admin commands work correctly

### Phase 6: Testing (2 hours)

- [ ] Write unit tests for CorpseManager
- [ ] Write integration tests for full flow
- [ ] Run manual test scenarios
- [ ] Performance test: 100 corpses

---

## Key Code Snippets

### Creating an NPC Corpse

```javascript
// In CombatEncounter.js after NPC death
const CorpseManager = require('../systems/corpses/CorpseManager');

const corpse = CorpseManager.createNPCCorpse(npc, this.roomId, this.world);
this.broadcast(colors.dim('A corpse falls to the ground.'));
```

### Configuring Corpse Settings

```javascript
// In itemsConfig.js
corpses: {
  npc: {
    decayTime: 300000,  // 5 minutes
    weight: 100,        // pounds
    capacity: 20        // item slots
  }
}
```

### Registering Timer

```javascript
// In CorpseManager.createNPCCorpse()
const CorpseDecayService = require('./CorpseDecayService');
CorpseDecayService.registerCorpse(corpse);
```

### Checking Decay

```javascript
// In CorpseDecayService.checkDecay()
const now = Date.now();
for (const [corpseId, timer] of this.corpseTimers) {
  if (now >= timer.decayTime) {
    this.decayCorpse(corpseId, timer);
  }
}
```

### Respawning NPC

```javascript
// In CorpseDecayService.decayCorpse()
if (!timer.isPlayerCorpse && timer.npcId) {
  const room = this.world.getRoom(timer.spawnLocation);
  if (room && !room.npcs.includes(timer.npcId)) {
    room.npcs.push(timer.npcId);
    const npc = this.world.getNPC(timer.npcId);
    if (npc) {
      npc.hp = npc.maxHp;
    }
  }
}
```

---

## Common Pitfalls

### 1. Forgetting to Register Timer

**Problem:** Corpse created but never decays.

**Solution:**
```javascript
// ALWAYS call registerCorpse after creating corpse
const corpse = ContainerManager.createContainer({...});
CorpseDecayService.registerCorpse(corpse); // Don't forget!
```

### 2. Not Removing from Room

**Problem:** Corpse decays but reference remains in room.

**Solution:**
```javascript
// In decayCorpse()
if (room && room.containers) {
  room.containers = room.containers.filter(c => c.containerId !== corpseId);
}
```

### 3. Race Condition on Respawn

**Problem:** NPC respawned twice.

**Solution:**
```javascript
// Check before adding
if (room.npcs.includes(npcId)) {
  logger.log('NPC already exists, skipping respawn');
  return;
}
room.npcs.push(npcId);
```

### 4. Memory Leak from Containers

**Problem:** ContainerManager never cleans up.

**Solution:**
```javascript
// Always delete from ContainerManager
ContainerManager.deleteContainer(corpseId);
```

### 5. Missing spawnLocation

**Problem:** NPC respawns in wrong room.

**Solution:**
```javascript
// Add to all NPC definitions
{
  "id": "goblin_warrior",
  "name": "Goblin Warrior",
  "spawnLocation": "goblin_camp"  // Original spawn room
}
```

---

## Testing Commands

### Manual Testing

```bash
# Connect to MUD
telnet localhost 3000

# Login
> testuser
> password

# Go to NPC room
> go north

# Kill NPC
> attack goblin

# Verify corpse
> look
# Should show: "corpse of a goblin lies here."

# Loot corpse
> loot corpse
# Should transfer items to inventory

# Wait 5 minutes
# (or adjust config.corpses.npc.decayTime for faster testing)

# Verify decay
> look
# Corpse should be gone

# Verify respawn
> look
# Goblin should be back
```

### Admin Testing

```bash
# List all corpses
> @listcorpses

# Clear corpses in room
> @clearcorpses
```

---

## Integration Points

### Files to Modify

1. `/src/config/itemsConfig.js` - Add corpse config
2. `/src/combat/CombatEncounter.js` - Hook corpse creation
3. `/src/world.js` - Display corpses in rooms
4. `/src/server.js` - Initialize decay service
5. `/src/admin/commands.js` - Add admin commands

### New Files to Create

1. `/src/systems/corpses/CorpseManager.js`
2. `/src/systems/corpses/CorpseDecayService.js`
3. `/src/commands/containers/loot.js`
4. `/data/corpse_timers.json` (auto-created)

### Systems to Use

- `ContainerManager` - Container creation/management
- `LootGenerator` - Generate corpse loot
- `World` - Room access, NPC management
- `ItemFactory` - Create item instances

---

## Quick Reference: Corpse Properties

```javascript
{
  // Container Properties
  id: "corpse_goblin_123",
  name: "corpse of a goblin",
  containerType: "npc_corpse",
  inventory: [...items],
  isOpen: true,
  isLocked: false,
  capacity: 20,

  // Corpse-Specific
  npcId: "goblin_warrior",
  npcType: "goblin",
  weight: 100,
  createdAt: 1699999999999,
  decayTime: 1700000299999,
  spawnLocation: "goblin_camp",
  location: { type: "room", roomId: "dungeon_01" }
}
```

---

## Configuration Reference

```javascript
// Default NPC corpse settings
config.corpses.npc = {
  decayTime: 300000,        // 5 minutes (300,000 ms)
  weight: 100,              // 100 pounds
  capacity: 20,             // 20 item slots
  showInRoom: true,         // Display in room
  allowFreeForAll: true     // Anyone can loot
};

// Weight by creature size
config.corpses.sizeWeights = {
  tiny: 10,
  small: 50,
  medium: 100,
  large: 200,
  huge: 500,
  gargantuan: 1000
};

// Decay service settings
config.corpses.decay = {
  checkInterval: 10000,     // Check every 10 seconds
  maxDecayTime: 86400000,   // 24 hours max
  persistenceEnabled: true,
  persistenceFile: './data/corpse_timers.json'
};
```

---

## Debugging Tips

### Check Corpse Timers

```javascript
// In console or admin command
const CorpseDecayService = require('./src/systems/corpses/CorpseDecayService');
console.log(CorpseDecayService.corpseTimers);
```

### Check Room Containers

```javascript
// In console
const world = require('./src/world');
const room = world.getRoom('room_id');
console.log(room.containers);
```

### Force Decay

```javascript
// For testing - set decay time to past
CorpseDecayService.corpseTimers.get('corpse_id').decayTime = Date.now() - 1000;
CorpseDecayService.checkDecay();
```

### Check Persistence File

```bash
cat data/corpse_timers.json | jq
```

---

## Performance Monitoring

### Metrics to Track

- Number of active corpses: `CorpseDecayService.corpseTimers.size`
- Persistence file size: `ls -lh data/corpse_timers.json`
- Decay check duration: Add timing to `checkDecay()`
- Memory usage: Monitor container Map size

### Warning Thresholds

- Corpses > 500: Investigate potential bugs
- File size > 1MB: Consider cleanup
- Decay check > 100ms: Optimize algorithm

---

## Next Steps After Implementation

1. **Player Corpses:** Extend for player death
2. **Corpse Dragging:** Allow movement between rooms
3. **Advanced Loot:** Loot rights, party rolling
4. **Necromancy:** Spell interactions with corpses
5. **Burial System:** RP mechanics for corpse disposal

---

## Support Resources

- **Architecture Doc:** `/docs/implementation/CORPSE_RESPAWN_IMPLEMENTATION_JOURNAL.md`
- **Diagrams:** `/docs/implementation/CORPSE_SYSTEM_ARCHITECTURE_DIAGRAM.md`
- **Design Spec:** `/docs/systems/containers/CORPSE_CONTAINER_SPEC.md`
- **Loot System:** `/docs/library/items/SPAWN_SYSTEM_GUIDE.md`

---

## Final Checklist Before Deployment

- [ ] All phases tested and passing
- [ ] Persistence file created and writable
- [ ] No memory leaks (test with 100+ corpses)
- [ ] Server restart recovery works
- [ ] Combat integration verified
- [ ] Commands respond correctly
- [ ] Admin tools functional
- [ ] Configuration documented
- [ ] Code reviewed by mud-code-reviewer
- [ ] Player feedback gathered

---

**Happy Coding!**

For questions or issues, refer to the comprehensive implementation journal or consult with the MUD Architect.

**Version:** 1.0
**Last Updated:** 2025-11-08
