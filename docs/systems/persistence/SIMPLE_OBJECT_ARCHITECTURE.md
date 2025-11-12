# Simple Object-Based Architecture
## LPmud-Inspired, Modern JSON

**Date**: 2025-11-12
**Vibe**: Keep it simple, everything is an object
**Philosophy**: If LPmud was written today, it would look like this

---

## The Core Idea

```
LPmud:
  Everything is a .c file
  Driver loads them all
  Heartbeat updates them all

Your MUD:
  Everything is a .json file
  EntityManager loads them all
  Heartbeat updates them all
```

**That's it. That's the architecture.**

---

## Everything is an Object

```javascript
// An item is an object
{
  "id": "sword_12345",
  "type": "item",
  "definition": "iron_sword",
  "location": { "type": "inventory", "owner": "alice" },
  "durability": 85,
  "equipped": true
}

// A player is an object
{
  "id": "alice",
  "type": "player",
  "currentRoom": "arena_lounge",
  "hp": 45,
  "maxHp": 50,
  "inventory": ["sword_12345", "potion_67890"]
}

// A room is an object
{
  "id": "arena_lounge",
  "type": "room",
  "name": "Arena Lounge",
  "description": "A cozy lounge...",
  "exits": { "south": "sesame_street_01" },
  "items": ["gold_11111"],
  "npcs": ["grover_99999"]
}

// An NPC is an object
{
  "id": "grover_99999",
  "type": "npc",
  "definition": "grover",
  "currentRoom": "arena_lounge",
  "hp": 50,
  "maxHp": 50
}

// A container is an object
{
  "id": "chest_22222",
  "type": "container",
  "definition": "treasure_chest",
  "location": { "type": "room", "room": "arena_lounge" },
  "isOpen": false,
  "inventory": ["gem_33333", "scroll_44444"]
}
```

**Key point**: They're all just objects with IDs. The `type` field tells you what they are.

---

## File Structure

```
data/
  objects/           ← All runtime objects (instances)
    players/
      alice.json
      bob.json
    items/
      sword_12345.json
      potion_67890.json
    npcs/
      grover_99999.json
    containers/
      chest_22222.json
    rooms/           ← Optional: For rooms with dynamic state
      arena_lounge.json

world/               ← All definitions (templates)
  core/
    items/
      iron_sword.json      ← What an iron sword IS
      health_potion.json
    npcs/
      goblin.json          ← What a goblin IS
  sesame_street/
    rooms/
      arena_lounge.json    ← Room layout
    npcs/
      grover.json          ← Grover's definition
```

**Rules**:
- `world/` = Templates (never change at runtime)
- `data/objects/` = Instances (change constantly)
- Every object has a unique ID
- Objects reference each other by ID

---

## The EntityManager (The Driver)

```javascript
class EntityManager {
  constructor() {
    this.objects = new Map(); // id → object
    this.heartbeatInterval = 1000; // 1 second
  }

  // ========================================
  // Loading
  // ========================================

  /**
   * Load all objects from disk
   */
  async loadAll() {
    // Load all JSON files from data/objects/
    const files = await glob('data/objects/**/*.json');

    for (const file of files) {
      const obj = JSON.parse(fs.readFileSync(file));
      this.objects.set(obj.id, obj);
    }

    console.log(`Loaded ${this.objects.size} objects`);
  }

  /**
   * Get any object by ID
   */
  get(id) {
    return this.objects.get(id);
  }

  /**
   * Get all objects of a type
   */
  getByType(type) {
    return Array.from(this.objects.values())
      .filter(obj => obj.type === type);
  }

  // ========================================
  // The One Function That Fixes Everything
  // ========================================

  /**
   * Move any object to any location
   * THIS is the single source of truth
   */
  move(objectId, newLocation) {
    const obj = this.get(objectId);
    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    // Remove from old location
    this.removeFromLocation(obj);

    // Update location
    obj.location = newLocation;
    obj.modifiedAt = Date.now();

    // Add to new location
    this.addToLocation(obj);

    // Mark dirty for save
    this.markDirty(obj.id);
  }

  removeFromLocation(obj) {
    if (!obj.location) return;

    if (obj.location.type === 'inventory') {
      const owner = this.get(obj.location.owner);
      owner.inventory = owner.inventory.filter(id => id !== obj.id);
      this.markDirty(owner.id);
    }
    else if (obj.location.type === 'container') {
      const container = this.get(obj.location.owner);
      container.inventory = container.inventory.filter(id => id !== obj.id);
      this.markDirty(container.id);
    }
    else if (obj.location.type === 'room') {
      const room = this.get(obj.location.room);
      room.items = room.items.filter(id => id !== obj.id);
      this.markDirty(room.id);
    }
  }

  addToLocation(obj) {
    if (obj.location.type === 'inventory') {
      const owner = this.get(obj.location.owner);
      if (!owner.inventory) owner.inventory = [];
      owner.inventory.push(obj.id);
      this.markDirty(owner.id);
    }
    else if (obj.location.type === 'container') {
      const container = this.get(obj.location.owner);
      if (!container.inventory) container.inventory = [];
      container.inventory.push(obj.id);
      this.markDirty(container.id);
    }
    else if (obj.location.type === 'room') {
      const room = this.get(obj.location.room);
      if (!room.items) room.items = [];
      room.items.push(obj.id);
      this.markDirty(room.id);
    }
  }

  // ========================================
  // Dirty Tracking (Only Save What Changed)
  // ========================================

  dirtyObjects = new Set();

  markDirty(id) {
    this.dirtyObjects.add(id);
  }

  // ========================================
  // Heartbeat (The Game Loop)
  // ========================================

  start() {
    setInterval(() => this.heartbeat(), this.heartbeatInterval);
    console.log('Heartbeat started');
  }

  heartbeat() {
    // Update all objects
    for (const obj of this.objects.values()) {
      if (obj.update) {
        obj.update(this); // Objects can have update logic
      }
    }

    // Validate consistency
    this.validate();

    // Save dirty objects
    this.saveDirty();
  }

  // ========================================
  // Validation
  // ========================================

  validate() {
    // Check: Every object ID is unique
    const ids = new Set();
    for (const obj of this.objects.values()) {
      if (ids.has(obj.id)) {
        console.error(`Duplicate ID: ${obj.id}`);
      }
      ids.add(obj.id);
    }

    // Check: Every reference is valid
    for (const obj of this.objects.values()) {
      if (obj.inventory) {
        for (const itemId of obj.inventory) {
          if (!this.objects.has(itemId)) {
            console.error(`${obj.id} references non-existent item ${itemId}`);
          }
        }
      }
    }
  }

  // ========================================
  // Saving (Write Back to Files)
  // ========================================

  saveDirty() {
    if (this.dirtyObjects.size === 0) return;

    for (const id of this.dirtyObjects) {
      const obj = this.get(id);
      if (obj) {
        this.saveObject(obj);
      }
    }

    console.log(`Saved ${this.dirtyObjects.size} objects`);
    this.dirtyObjects.clear();
  }

  saveObject(obj) {
    const dir = `data/objects/${obj.type}s/`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = `${dir}${obj.id}.json`;
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  }

  // ========================================
  // Shutdown
  // ========================================

  shutdown() {
    console.log('Saving all objects before shutdown...');

    // Mark everything dirty
    for (const id of this.objects.keys()) {
      this.markDirty(id);
    }

    // Save everything
    this.saveDirty();

    console.log('Shutdown complete');
  }
}
```

---

## How Commands Work

### Put Command (Old - Broken)

```javascript
function execute(player, args) {
  const item = player.inventory.find(i => i.name === itemName);
  const container = room.containers.find(c => c.name === containerName);

  // Move item
  player.inventory = player.inventory.filter(i => i !== item);
  container.inventory.push(item);

  // BUG: item.location never updated!

  // Save manually
  savePlayer(player);
  saveContainer(container);
}
```

### Put Command (New - Simple)

```javascript
function execute(player, args, context) {
  const { entityManager } = context;

  // Find item in player's inventory
  const itemId = player.inventory.find(id => {
    const item = entityManager.get(id);
    return item.name.includes(itemName);
  });

  // Find container in room
  const room = entityManager.get(player.currentRoom);
  const containerId = room.containers.find(id => {
    const container = entityManager.get(id);
    return container.name.includes(containerName);
  });

  // Move the item (ONE LINE)
  entityManager.move(itemId, {
    type: 'container',
    owner: containerId
  });

  // Done. EntityManager handles:
  // - Removing from player inventory
  // - Adding to container inventory
  // - Updating location
  // - Marking objects dirty
  // - Will save on next heartbeat
}
```

**That's it. One line. Everything else is automatic.**

---

## Creating Content (World Builder)

### Create a New Item Type

```bash
# Create definition
$ nano world/mystic_realm/items/fire_sword.json
```

```json
{
  "id": "fire_sword",
  "name": "Flaming Sword",
  "description": "A blade wreathed in flames",
  "damage": "2d6",
  "damageType": "fire",
  "weight": 3,
  "value": 500
}
```

```bash
# Spawn an instance
> /spawn fire_sword

# Creates: data/objects/items/fire_sword_82736.json
```

```json
{
  "id": "fire_sword_82736",
  "type": "item",
  "definition": "fire_sword",
  "location": { "type": "room", "room": "arena_lounge" },
  "durability": 100,
  "createdAt": "2025-11-12T10:30:00Z"
}
```

### Create a New Container

```bash
# Create definition
$ nano world/mystic_realm/objects/magic_chest.json
```

```json
{
  "id": "magic_chest",
  "name": "a magical chest",
  "description": "An ornate chest glowing with runes",
  "capacity": 30,
  "lootTable": ["rare_items"]
}
```

```bash
# Place in room
$ nano world/mystic_realm/rooms/vault.json
```

```json
{
  "id": "vault",
  "name": "Treasure Vault",
  "description": "...",
  "exits": { "north": "hallway" },
  "containers": [
    {
      "definition": "magic_chest",
      "loot": ["fire_sword", "gold_coins"]
    }
  ]
}
```

**When room loads**, EntityManager creates container instance with loot.

---

## The Boot Sequence

```javascript
// server.js
const entityManager = new EntityManager();

// 1. Load all definitions
await entityManager.loadDefinitions('world/');

// 2. Load all objects (instances)
await entityManager.loadAll();

// 3. Start heartbeat
entityManager.start();

// 4. Handle shutdown
process.on('SIGTERM', () => {
  entityManager.shutdown();
  process.exit(0);
});
```

**That's the entire engine. ~300 lines.**

---

## Benefits

### 1. Everything is Consistent

```javascript
// Want to know where sword_12345 is?
const sword = entityManager.get('sword_12345');
console.log(sword.location);
// → { type: 'inventory', owner: 'alice' }

// Want to know what's in alice's inventory?
const alice = entityManager.get('alice');
const items = alice.inventory.map(id => entityManager.get(id));
console.log(items.map(i => i.name));
// → ["Flaming Sword", "Health Potion"]

// These ALWAYS agree because there's only one source of truth
```

### 2. Easy to Debug

```javascript
// Validate entire game state
entityManager.validate();
// → Checks every object, every reference
// → Finds duplicates, orphans, broken links
```

### 3. Easy to Backup

```bash
# Backup entire game
$ cp -r data/objects/ backups/2025-11-12/

# Restore
$ cp -r backups/2025-11-12/ data/objects/
```

### 4. Easy to Query

```javascript
// Find all ancient keys
const keys = entityManager.getByType('item')
  .filter(item => item.definition === 'ancient_key');

// Find richest player
const players = entityManager.getByType('player');
const richest = players.map(p => ({
  name: p.id,
  gold: p.inventory
    .map(id => entityManager.get(id))
    .filter(item => item.definition === 'gold_coins')
    .reduce((sum, item) => sum + item.quantity, 0)
})).sort((a, b) => b.gold - a.gold)[0];

console.log(`Richest: ${richest.name} with ${richest.gold} gold`);
```

### 5. AI Can Understand It

```javascript
// AI prompt: "Add guild banks"
// AI response:

// 1. Create definition
{
  "id": "guild_bank",
  "type": "container",
  "capacity": 100,
  "permissions": ["guild_members"]
}

// 2. Done. EntityManager handles everything else.
```

---

## Fixing the Bugs

### Item Duplication Bug - Fixed

```javascript
// OLD: Manual tracking, can get out of sync
player.inventory.push(item);
item.location = { type: 'inventory', owner: 'player' }; // Forgot this!

// NEW: EntityManager handles it
entityManager.move(itemId, { type: 'inventory', owner: playerId });
// → Updates item.location
// → Updates player.inventory
// → Updates old location
// → Marks all dirty
// → Guarantees consistency
```

### Player Position Bug - Fixed

```javascript
// OLD: Manual save, forgot to call it
player.currentRoom = 'arena_lounge';
// Forgot: savePlayer(player);

// NEW: EntityManager auto-saves
player.currentRoom = 'arena_lounge';
entityManager.markDirty(player.id);
// → Heartbeat saves it automatically
```

---

## Heartbeat Example

```javascript
heartbeat() {
  console.log('🫀 Heartbeat');

  // 1. Update all objects that need updating
  for (const obj of this.objects.values()) {
    // NPCs with AI
    if (obj.type === 'npc' && obj.ai) {
      this.updateNPC(obj);
    }

    // Items decaying
    if (obj.type === 'item' && obj.decay) {
      obj.durability -= obj.decay;
      if (obj.durability <= 0) {
        this.destroyObject(obj.id);
      } else {
        this.markDirty(obj.id);
      }
    }

    // Corpses decaying
    if (obj.type === 'corpse') {
      obj.decayTime -= 1000;
      if (obj.decayTime <= 0) {
        this.destroyObject(obj.id);
      } else {
        this.markDirty(obj.id);
      }
    }
  }

  // 2. Validate consistency
  this.validate();

  // 3. Save dirty objects
  this.saveDirty();
}
```

---

## Migration Path

### Week 1: Build EntityManager

```javascript
// Just the core
class EntityManager {
  objects = new Map();

  get(id) { return this.objects.get(id); }

  move(id, location) {
    // Implement this first
  }

  loadAll() {
    // Load from existing data/players/, data/containers.json, etc.
  }
}
```

### Week 2: Use EntityManager in Commands

```javascript
// Update put.js to use entityManager.move()
// Update get.js to use entityManager.move()
// Keep old systems running in parallel
```

### Week 3: Validate & Test

```javascript
// Compare old system vs new system
// Make sure they agree
```

### Week 4: Remove Old Systems

```javascript
// Delete InventoryManager
// Delete ContainerManager
// Delete PlayerDB
// Keep EntityManager only
```

---

## File Examples

### Player Object File

```json
// data/objects/players/alice.json
{
  "id": "alice",
  "type": "player",
  "username": "alice",
  "passwordHash": "...",

  "currentRoom": "arena_lounge",
  "hp": 45,
  "maxHp": 50,
  "level": 5,

  "inventory": [
    "sword_12345",
    "potion_67890"
  ],

  "equipped": {
    "mainHand": "sword_12345"
  },

  "stats": {
    "str": 10,
    "dex": 12
  },

  "createdAt": "2025-11-01T10:00:00Z",
  "lastLogin": "2025-11-12T09:30:00Z",
  "modifiedAt": "2025-11-12T10:45:00Z"
}
```

### Item Object File

```json
// data/objects/items/sword_12345.json
{
  "id": "sword_12345",
  "type": "item",
  "definition": "iron_sword",

  "location": {
    "type": "inventory",
    "owner": "alice"
  },

  "durability": 85,
  "maxDurability": 100,

  "isEquipped": true,

  "createdAt": "2025-11-10T14:20:00Z",
  "modifiedAt": "2025-11-12T10:45:00Z"
}
```

### Container Object File

```json
// data/objects/containers/chest_22222.json
{
  "id": "chest_22222",
  "type": "container",
  "definition": "treasure_chest",

  "location": {
    "type": "room",
    "room": "arena_lounge"
  },

  "isOpen": false,
  "isLocked": true,

  "inventory": [
    "gem_33333",
    "scroll_44444",
    "gold_55555"
  ],

  "createdAt": "2025-11-01T08:00:00Z",
  "modifiedAt": "2025-11-12T10:30:00Z"
}
```

---

## The Golden Rule

**One function to move anything anywhere:**

```javascript
entityManager.move(objectId, newLocation)
```

**That's it. That's the architecture.**

- Put item in container? `move(itemId, { type: 'container', owner: chestId })`
- Drop item? `move(itemId, { type: 'room', room: roomId })`
- Pick up item? `move(itemId, { type: 'inventory', owner: playerId })`
- Equip item? `move(itemId, { type: 'equipped', owner: playerId, slot: 'mainHand' })`
- NPC picks up item? `move(itemId, { type: 'inventory', owner: npcId })`

**Every movement goes through ONE function.**
**That function updates EVERYTHING.**
**No bugs possible.**

---

## Vibe Check ✓

- Simple? ✓ (One manager, one move function)
- Understandable? ✓ (Everything is just an object with an ID)
- AI-friendly? ✓ (AI can reason about objects and locations)
- Easy to contribute? ✓ (Edit JSON files, that's it)
- Scalable enough? ✓ (Thousands of objects, no problem)
- LPmud-inspired? ✓ (Same philosophy, modern tools)

---

## Summary

```
Everything is an object
Every object has an ID
Every object has a location
One manager tracks them all
One heartbeat updates them all
One function moves anything anywhere

That's it. That's the MUD.
```

**Keep it simple. Keep it elegant. Make it work.**

---

**Status**: Ready to implement
**Complexity**: Low
**Elegance**: High
**Vibe**: ✓✓✓
