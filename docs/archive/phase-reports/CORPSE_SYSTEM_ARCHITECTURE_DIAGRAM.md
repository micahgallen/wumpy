# Corpse System Architecture Diagram

**Date:** 2025-11-08
**Version:** 1.0

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CORPSE LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Combat       │
│ Encounter    │
│              │
│ NPC Dies     │
└──────┬───────┘
       │
       │ 1. NPC death detected
       │
       ▼
┌──────────────────┐
│ CorpseManager    │◄────────┐
│                  │         │
│ createNPCCorpse()│         │ 3. Get loot items
└──────┬───────────┘         │
       │                     │
       │ 2. Generate loot    │
       ▼                     │
┌──────────────────┐         │
│ LootGenerator    │─────────┘
│                  │
│ generateNPCLoot()│
└──────────────────┘
       │
       │ 4. Create container
       ▼
┌──────────────────┐
│ ContainerManager │
│                  │
│ createContainer()│
│ (type: corpse)   │
└──────┬───────────┘
       │
       │ 5. Register timer
       ▼
┌──────────────────────┐
│ CorpseDecayService   │
│                      │
│ registerCorpse()     │◄─────────┐
│                      │          │
│ [Timer Map]          │          │ 8. Persist state
│ corpseId → timer     │          │
└──────┬───────────────┘          │
       │                          │
       │ 6. Add to room     ┌─────┴──────┐
       ▼                    │ File:      │
┌──────────────────┐        │ corpse_    │
│ World.rooms      │        │ timers.json│
│                  │        └────────────┘
│ room.containers  │
│   └─ corpseId    │
└──────┬───────────┘
       │
       │ 7. Player loots
       ▼
┌──────────────────┐
│ Player Commands  │
│                  │
│ loot corpse      │
│ examine corpse   │
└──────┬───────────┘
       │
       │ Items transfer
       ▼
┌──────────────────┐
│ Player Inventory │
└──────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                        DECAY & RESPAWN                               │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ CorpseDecayService   │
│                      │
│ checkDecay()         │◄───────┐
│ (every 10 seconds)   │        │
└──────┬───────────────┘        │
       │                        │ setInterval(10000)
       │ Timer expired?         │
       ▼                        │
       NO ──────────────────────┘
       │
       YES
       │
       ▼
┌──────────────────────┐
│ decayCorpse()        │
│                      │
│ 1. Delete container  │
│ 2. Remove from room  │
│ 3. Trigger respawn   │
│ 4. Remove timer      │
│ 5. Save state        │
└──────┬───────────────┘
       │
       │ 3. Trigger respawn
       ▼
┌──────────────────────┐
│ respawnNPC()         │
│                      │
│ Add NPC to room      │
│ Reset HP             │
│ (at original spawn)  │
└──────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENT RELATIONSHIPS                           │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   server.js  │
                    │              │
                    │  Initializes │
                    └───────┬──────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────────┐
  │  World   │      │ Combat   │      │ CorpseDecay  │
  │          │      │ Engine   │      │ Service      │
  │  rooms[] │      │          │      │              │
  │  npcs{}  │      │ handles  │      │ timer loop   │
  └────┬─────┘      │ death    │      └──────┬───────┘
       │            └────┬─────┘             │
       │                 │                   │
       │         ┌───────┴────────┐          │
       │         │                │          │
       │         ▼                ▼          │
       │  ┌──────────┐    ┌──────────────┐  │
       │  │ Loot     │    │ Corpse       │  │
       │  │ Generator│    │ Manager      │  │
       │  │          │    │              │  │
       │  │ creates  │───▶│ creates      │  │
       │  │ items    │    │ corpse       │  │
       │  └──────────┘    └──────┬───────┘  │
       │                         │          │
       │                         ▼          │
       │                  ┌──────────────┐  │
       └─────────────────▶│ Container    │◀─┘
                          │ Manager      │
                          │              │
                          │ stores items │
                          └──────────────┘
```

---

## Component Interaction Matrix

```
┌───────────────────┬──────┬──────┬──────┬──────┬──────┬──────┐
│                   │World │Combat│Loot  │Corpse│Decay │Contr.│
│                   │      │      │Gen   │Mgr   │Svc   │Mgr   │
├───────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ World             │  -   │ READ │  -   │ READ │ READ │  -   │
│ Combat Engine     │ R/W  │  -   │ CALL │ CALL │  -   │  -   │
│ Loot Generator    │  -   │  -   │  -   │  -   │  -   │ READ │
│ Corpse Manager    │ R/W  │  -   │ CALL │  -   │ CALL │ CALL │
│ Decay Service     │ R/W  │  -   │  -   │  -   │  -   │ CALL │
│ Container Manager │  -   │  -   │  -   │  -   │  -   │  -   │
└───────────────────┴──────┴──────┴──────┴──────┴──────┴──────┘

Legend:
  READ  = Read-only access
  R/W   = Read and Write access
  CALL  = Calls methods on component
  -     = No direct interaction
```

---

## Persistence Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE STRATEGY                              │
└─────────────────────────────────────────────────────────────────────┘

Runtime State                     Disk State
─────────────                     ──────────

┌──────────────────────┐         ┌──────────────────────┐
│ CorpseDecayService   │         │ corpse_timers.json   │
│                      │         │                      │
│ Map<id, timer>       │◀────────│ {                    │
│   timer: {           │  load   │   corpses: [         │
│     corpseId,        │────────▶│     {                │
│     npcId,           │  save   │       corpseId,      │
│     roomId,          │         │       npcId,         │
│     spawnLocation,   │         │       roomId,        │
│     decayTime        │         │       spawnLocation, │
│   }                  │         │       decayTime      │
└──────────────────────┘         │     }                │
                                 │   ]                  │
        │                        │ }                    │
        │                        └──────────────────────┘
        │ references
        ▼
┌──────────────────────┐
│ ContainerManager     │         (Containers not persisted)
│                      │         (Recreated from timer data)
│ Map<id, container>   │
│   container: {       │
│     id,              │
│     inventory[],     │
│     decayTime        │
│   }                  │
└──────────────────────┘

On Server Restart:
  1. Load corpse_timers.json
  2. Check for expired timers
  3. Decay expired corpses immediately
  4. Recreate active corpses in rooms
  5. Resume decay checking loop
```

---

## Timer Management Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TIMER LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────┘

Corpse Created               Timer Active            Timer Expired
──────────────              ──────────────           ─────────────

    t=0                        t=150s                  t=300s
     │                            │                       │
     │  registerCorpse()          │  checkDecay()        │  decayCorpse()
     │                            │                       │
     ▼                            ▼                       ▼
┌─────────┐               ┌─────────────┐          ┌──────────┐
│ Create  │               │ Check every │          │ Remove   │
│ timer   │──────────────▶│ 10 seconds  │─────────▶│ corpse   │
│ entry   │               │             │          │          │
│         │               │ now < decay │          │ Respawn  │
│ decayAt │               │ time?       │          │ NPC      │
│ = t+300 │               │             │          │          │
└────┬────┘               └─────────────┘          └──────────┘
     │                                                   │
     │ saveState()                                       │
     ▼                                                   │
┌─────────────┐                                         │
│ Persist to  │◀────────────────────────────────────────┘
│ JSON file   │         saveState()
└─────────────┘


Server Restart Handling:
─────────────────────────

  Server Down         Server Up
  ───────────        ──────────

      │                  │
      │  Shutdown        │  Startup
      ▼                  ▼
  ┌────────┐        ┌──────────┐
  │ Save   │        │ Load     │
  │ timers │        │ timers   │
  │ to     │        │ from     │
  │ file   │        │ file     │
  └────────┘        └────┬─────┘
                         │
                         │ Check each timer
                         ▼
                    ┌──────────┐
                    │ now >    │──YES──▶ Decay immediately
                    │ decayAt? │
                    └────┬─────┘
                         │
                         NO
                         │
                         ▼
                    Resume normal decay checking
```

---

## Security & Safety Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SAFETY MECHANISMS                                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Orphan Prevention                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Corpse Created                                                      │
│       │                                                              │
│       ├──1. Create container ────────┐ ATOMIC                       │
│       │                               │ OPERATION                    │
│       └──2. Register timer ───────────┘                              │
│                                                                      │
│  If either fails, rollback both                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Race Condition Prevention                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Respawn Check:                                                      │
│    1. Get room                                                       │
│    2. Check if NPC already in room.npcs[]                           │
│    3. If YES → Skip respawn (log warning)                           │
│    4. If NO  → Add NPC                                              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Memory Leak Prevention                                               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  On Decay:                                                           │
│    ✓ Delete from ContainerManager.containers Map                    │
│    ✓ Remove from room.containers array                              │
│    ✓ Delete from CorpseDecayService.corpseTimers Map               │
│    ✓ Save state to disk (backup)                                    │
│                                                                      │
│  Validation on Startup:                                              │
│    ✓ Load timers from disk                                          │
│    ✓ Check for expired timers → immediate decay                     │
│    ✓ Scan for orphaned corpses (container exists, no timer)        │
│    ✓ Scan for orphaned timers (timer exists, no container)         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ Max Decay Time Cap                                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  On Timer Registration:                                              │
│    if (decayTime - now > MAX_DECAY_TIME) {                          │
│      decayTime = now + MAX_DECAY_TIME;                              │
│    }                                                                 │
│                                                                      │
│  Prevents infinite corpses from bugs                                │
│  MAX_DECAY_TIME = 24 hours                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCALABILITY ANALYSIS                              │
└─────────────────────────────────────────────────────────────────────┘

Scenario: 100 concurrent corpses
─────────────────────────────────

  Memory Usage:
    Container Map:      100 corpses × ~2KB each  = ~200 KB
    Timer Map:          100 timers × ~200 bytes  = ~20 KB
    Room References:    100 refs × ~100 bytes    = ~10 KB
    ────────────────────────────────────────────────────
    Total:                                         ~230 KB

  CPU Usage:
    Decay Check:        100 map iterations       = O(n)
    Frequency:          Every 10 seconds
    Worst Case:         All 100 expire at once
    Decay Operation:    100 × (delete + respawn) = ~50ms

  Disk I/O:
    File Size:          100 timers × ~150 bytes  = ~15 KB
    Write Frequency:    On every corpse create/decay
    Strategy:           Async write, non-blocking

  Network:
    Broadcast on decay: 1 message per room with players
    Message size:       ~100 bytes
    Not a bottleneck


Optimization Strategies:
────────────────────────

  1. Batch decay operations (process expired corpses in chunks)
  2. Use Map for O(1) lookups instead of array searches
  3. Lazy persistence (save state every N operations, not every one)
  4. Compress persistence file if > 10MB
  5. TTL index for fast expiration checks
```

---

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR RECOVERY MATRIX                             │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────┬────────────────────────┐
│ Error Condition      │ Detection        │ Recovery Action        │
├──────────────────────┼──────────────────┼────────────────────────┤
│ Loot gen fails       │ Try/catch        │ Create empty corpse    │
│ Container create     │ Return null      │ Log error, no corpse   │
│ Timer register fails │ Validation       │ Delete corpse          │
│ Room not found       │ Null check       │ Skip corpse placement  │
│ Persistence write    │ FS error         │ Log warning, continue  │
│ Persistence read     │ JSON parse error │ Start with empty state │
│ Orphaned corpse      │ Startup scan     │ Auto-register timer    │
│ Orphaned timer       │ Startup scan     │ Delete timer entry     │
│ Respawn room missing │ Null check       │ Log error, skip respawn│
│ NPC already respawned│ Array includes() │ Skip, log warning      │
│ Decay during combat  │ Combat state     │ Defer decay until end  │
└──────────────────────┴──────────────────┴────────────────────────┘
```

---

## Testing Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEST PYRAMID                                      │
└─────────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   Manual     │  (1-2 hours)
                        │   Testing    │  Full gameplay flow
                        └──────────────┘
                             ▲
                    ┌────────┴────────┐
                    │  Integration    │  (20-30 tests)
                    │  Tests          │  Multi-component
                    └─────────────────┘
                         ▲
                ┌────────┴────────┐
                │  Unit Tests     │  (50-100 tests)
                │                 │  Individual functions
                └─────────────────┘


Test Coverage Goals:
────────────────────

  Unit Tests:           80% code coverage
  Integration Tests:    All critical paths
  Manual Tests:         All user scenarios

Test Execution Time:
────────────────────

  Unit:                 < 5 seconds
  Integration:          < 30 seconds
  Manual:               Ongoing during development
```

---

## Migration Path (Existing Systems)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKWARD COMPATIBILITY                            │
└─────────────────────────────────────────────────────────────────────┘

Existing System                New System
───────────────               ──────────

RespawnService                CorpseDecayService
  │                              │
  │ checkAndRespawn()            │ checkDecay()
  │  - 60s interval              │  - 10s interval
  │  - Respawns all missing      │  - Respawns on decay only
  │                              │
  └─────────┬────────────────────┘
            │
            │ Migration Strategy:
            │
            ▼
  1. Keep RespawnService for items/objects
  2. Use CorpseDecayService for NPC respawns
  3. Disable NPC respawn in RespawnService
  4. (Future) Merge both services


No Breaking Changes:
────────────────────

  ✓ World.rooms structure extended (room.containers added)
  ✓ ContainerManager extended (corpse methods added)
  ✓ Combat flow extended (corpse creation hook added)
  ✓ Commands added (loot, examine) - no conflicts
  ✓ Config extended (corpses section added)

  All existing functionality remains unchanged.
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Related Documents:**
- `/docs/implementation/CORPSE_RESPAWN_IMPLEMENTATION_JOURNAL.md`
- `/docs/systems/containers/CORPSE_CONTAINER_SPEC.md`
