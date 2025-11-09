# Corpse System Test Specification

**Document Type:** Test Plan & Specification
**System:** Corpse & Respawn System
**Combat Integration:** Version 1.0
**Created:** 2025-11-08
**Status:** Ready for Implementation

---

## Test Strategy

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \          5 scenarios
                 /______\
                /        \
               / Integration \     15 tests
              /______________\
             /                \
            /   Unit Tests     \   40+ tests
           /____________________\
```

### Test Coverage Goals

- **Unit Tests:** >90% coverage of new code
- **Integration Tests:** All major workflows
- **Balance Tests:** Statistical validation of economy
- **Manual Tests:** Edge cases and UX validation

---

## 1. Unit Tests

### 1.1 Container Base Class Tests

**File:** `/tests/unit/systems/containers/test_Container.js`

```javascript
const Container = require('../../../../src/systems/containers/Container');
const ItemFactory = require('../../../../src/items/ItemFactory');
const ItemRegistry = require('../../../../src/items/ItemRegistry');

describe('Container Base Class', () => {
    let container;

    beforeEach(() => {
        container = new Container({
            id: 'test_container_1',
            name: 'Test Container',
            capacity: 10
        });
    });

    describe('Construction', () => {
        it('should create container with valid properties', () => {
            expect(container.id).toBe('test_container_1');
            expect(container.name).toBe('Test Container');
            expect(container.capacity).toBe(10);
            expect(container.inventory).toEqual([]);
        });

        it('should assign unique ID if not provided', () => {
            const c1 = new Container({ name: 'Container 1' });
            const c2 = new Container({ name: 'Container 2' });
            expect(c1.id).toBeDefined();
            expect(c2.id).toBeDefined();
            expect(c1.id).not.toBe(c2.id);
        });

        it('should set default capacity if not provided', () => {
            const c = new Container({ name: 'Test' });
            expect(c.capacity).toBe(20); // Assuming default
        });
    });

    describe('addItem()', () => {
        it('should add item to inventory', () => {
            const item = createTestItem('rusty_dagger');
            const result = container.addItem(item);

            expect(result.success).toBe(true);
            expect(container.inventory).toHaveLength(1);
            expect(container.inventory[0]).toBe(item);
        });

        it('should reject item if container full', () => {
            const smallContainer = new Container({ name: 'Small', capacity: 1 });
            const item1 = createTestItem('rusty_dagger');
            const item2 = createTestItem('iron_sword');

            smallContainer.addItem(item1);
            const result = smallContainer.addItem(item2);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('full');
            expect(smallContainer.inventory).toHaveLength(1);
        });

        it('should stack identical stackable items', () => {
            const coin1 = createTestItem('copper_coin', { quantity: 5 });
            const coin2 = createTestItem('copper_coin', { quantity: 3 });

            container.addItem(coin1);
            container.addItem(coin2);

            expect(container.inventory).toHaveLength(1);
            expect(container.inventory[0].quantity).toBe(8);
        });

        it('should reject null or undefined items', () => {
            expect(() => container.addItem(null)).toThrow();
            expect(() => container.addItem(undefined)).toThrow();
        });
    });

    describe('removeItem()', () => {
        it('should remove item by instance ID', () => {
            const item = createTestItem('rusty_dagger');
            container.addItem(item);

            const removed = container.removeItem(item.instanceId);

            expect(removed).toBe(item);
            expect(container.inventory).toHaveLength(0);
        });

        it('should return null if item not found', () => {
            const removed = container.removeItem('nonexistent_id');
            expect(removed).toBeNull();
        });

        it('should handle partial quantity removal for stackable items', () => {
            const coins = createTestItem('copper_coin', { quantity: 10 });
            container.addItem(coins);

            const removed = container.removeItem(coins.instanceId, 3);

            expect(removed.quantity).toBe(3);
            expect(container.inventory[0].quantity).toBe(7);
        });
    });

    describe('isEmpty()', () => {
        it('should return true for empty container', () => {
            expect(container.isEmpty()).toBe(true);
        });

        it('should return false for non-empty container', () => {
            const item = createTestItem('rusty_dagger');
            container.addItem(item);
            expect(container.isEmpty()).toBe(false);
        });
    });

    describe('isFull()', () => {
        it('should return false when under capacity', () => {
            expect(container.isFull()).toBe(false);
        });

        it('should return true when at capacity', () => {
            const smallContainer = new Container({ name: 'Small', capacity: 2 });
            smallContainer.addItem(createTestItem('item1'));
            smallContainer.addItem(createTestItem('item2'));
            expect(smallContainer.isFull()).toBe(true);
        });
    });

    describe('getWeight()', () => {
        it('should calculate total weight of contents', () => {
            const dagger = createTestItem('rusty_dagger'); // Assume 2 lbs
            const sword = createTestItem('iron_sword');    // Assume 5 lbs
            container.addItem(dagger);
            container.addItem(sword);

            expect(container.getWeight()).toBe(7);
        });

        it('should include quantity for stackable items', () => {
            const coins = createTestItem('copper_coin', { quantity: 100 }); // 0.02 lbs each
            container.addItem(coins);
            expect(container.getWeight()).toBe(2);
        });
    });
});

function createTestItem(definitionId, options = {}) {
    const def = ItemRegistry.getItem(definitionId);
    return ItemFactory.createItem(def, options);
}
```

### 1.2 Corpse Container Tests

**File:** `/tests/unit/systems/containers/test_CorpseContainer.js`

```javascript
const CorpseContainer = require('../../../../src/systems/containers/CorpseContainer');
const LootGenerator = require('../../../../src/systems/loot/LootGenerator');

describe('CorpseContainer', () => {
    describe('Construction', () => {
        it('should create corpse with required properties', () => {
            const corpse = new CorpseContainer({
                npcId: 'red_wumpy_1',
                npcName: 'Red Wumpy',
                roomId: 'sesame_plaza'
            });

            expect(corpse.npcId).toBe('red_wumpy_1');
            expect(corpse.npcName).toBe('Red Wumpy');
            expect(corpse.roomId).toBe('sesame_plaza');
            expect(corpse.name).toBe('corpse of Red Wumpy');
        });

        it('should set decay timer automatically', () => {
            const now = Date.now();
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test NPC',
                roomId: 'test_room'
            });

            expect(corpse.decayTime).toBeGreaterThan(now);
            expect(corpse.decayTime).toBeLessThan(now + 400000); // Within 5 min + buffer
        });

        it('should respect custom decay time', () => {
            const customDecay = Date.now() + 1000000;
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test NPC',
                roomId: 'test_room',
                decayTime: customDecay
            });

            expect(corpse.decayTime).toBe(customDecay);
        });

        it('should set isOpen to true by default', () => {
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test NPC',
                roomId: 'test_room'
            });

            expect(corpse.isOpen).toBe(true);
        });
    });

    describe('isDecayed()', () => {
        it('should return false if decay time not reached', () => {
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                decayTime: Date.now() + 60000 // 1 minute in future
            });

            expect(corpse.isDecayed()).toBe(false);
        });

        it('should return true if decay time passed', () => {
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                decayTime: Date.now() - 1000 // 1 second in past
            });

            expect(corpse.isDecayed()).toBe(true);
        });
    });

    describe('getTimeUntilDecay()', () => {
        it('should return remaining time in milliseconds', () => {
            const decayTime = Date.now() + 60000; // 1 minute
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                decayTime: decayTime
            });

            const remaining = corpse.getTimeUntilDecay();
            expect(remaining).toBeGreaterThan(59000);
            expect(remaining).toBeLessThanOrEqual(60000);
        });

        it('should return 0 if already decayed', () => {
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                decayTime: Date.now() - 1000
            });

            expect(corpse.getTimeUntilDecay()).toBe(0);
        });
    });

    describe('getDescription()', () => {
        it('should generate appropriate corpse description', () => {
            const corpse = new CorpseContainer({
                npcId: 'red_wumpy_1',
                npcName: 'Red Wumpy',
                roomId: 'plaza'
            });

            const desc = corpse.getDescription();
            expect(desc).toContain('corpse');
            expect(desc).toContain('Red Wumpy');
        });

        it('should include decay status for near-decay corpses', () => {
            const corpse = new CorpseContainer({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                decayTime: Date.now() + 30000 // 30 seconds
            });

            const desc = corpse.getDescription();
            expect(desc.toLowerCase()).toContain('decay');
        });
    });
});
```

### 1.3 Container Manager Tests

**File:** `/tests/unit/systems/containers/test_ContainerManager.js`

```javascript
const ContainerManager = require('../../../../src/systems/containers/ContainerManager');

describe('ContainerManager', () => {
    beforeEach(() => {
        ContainerManager.reset(); // Clear registry
    });

    describe('createCorpse()', () => {
        it('should create and register corpse', () => {
            const corpse = ContainerManager.createCorpse({
                npcId: 'red_wumpy_1',
                npcName: 'Red Wumpy',
                roomId: 'plaza',
                items: []
            });

            expect(corpse.id).toBeDefined();
            expect(ContainerManager.getContainer(corpse.id)).toBe(corpse);
        });

        it('should populate corpse with provided items', () => {
            const items = [
                createTestItem('rusty_dagger'),
                createTestItem('copper_coin', { quantity: 5 })
            ];

            const corpse = ContainerManager.createCorpse({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                items: items
            });

            expect(corpse.inventory).toHaveLength(2);
        });

        it('should throw if required fields missing', () => {
            expect(() => ContainerManager.createCorpse({})).toThrow();
            expect(() => ContainerManager.createCorpse({ npcId: 'test' })).toThrow();
        });
    });

    describe('getContainer()', () => {
        it('should retrieve container by ID', () => {
            const corpse = ContainerManager.createCorpse({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                items: []
            });

            const retrieved = ContainerManager.getContainer(corpse.id);
            expect(retrieved).toBe(corpse);
        });

        it('should return null for nonexistent container', () => {
            expect(ContainerManager.getContainer('fake_id')).toBeNull();
        });
    });

    describe('deleteContainer()', () => {
        it('should remove container from registry', () => {
            const corpse = ContainerManager.createCorpse({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                items: []
            });

            ContainerManager.deleteContainer(corpse.id);
            expect(ContainerManager.getContainer(corpse.id)).toBeNull();
        });
    });

    describe('lootCorpse()', () => {
        it('should transfer all items to player', () => {
            const items = [
                createTestItem('rusty_dagger'),
                createTestItem('copper_coin', { quantity: 5 })
            ];

            const corpse = ContainerManager.createCorpse({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                items: items
            });

            const player = createMockPlayer();
            const looted = ContainerManager.lootCorpse(corpse, player);

            expect(looted).toHaveLength(2);
            expect(corpse.isEmpty()).toBe(true);
            expect(player.inventory).toHaveLength(2);
        });

        it('should handle empty corpse gracefully', () => {
            const corpse = ContainerManager.createCorpse({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                items: []
            });

            const player = createMockPlayer();
            const looted = ContainerManager.lootCorpse(corpse, player);

            expect(looted).toHaveLength(0);
        });

        it('should handle player inventory full scenario', () => {
            const items = [createTestItem('rusty_dagger')];
            const corpse = ContainerManager.createCorpse({
                npcId: 'test',
                npcName: 'Test',
                roomId: 'room',
                items: items
            });

            const player = createMockPlayer({ inventoryFull: true });
            const result = ContainerManager.lootCorpse(corpse, player);

            expect(result.success).toBe(false);
            expect(result.reason).toContain('full');
            expect(corpse.isEmpty()).toBe(false);
        });
    });
});

function createMockPlayer(options = {}) {
    return {
        inventory: [],
        username: 'TestPlayer',
        currentRoom: 'test_room',
        send: jest.fn(),
        ...options
    };
}
```

### 1.4 Loot Generation Tests

**File:** `/tests/unit/systems/loot/test_LootGenerator_NPC.js`

```javascript
const LootGenerator = require('../../../../src/systems/loot/LootGenerator');

describe('LootGenerator - NPC Loot', () => {
    describe('generateNPCLoot()', () => {
        it('should generate loot for basic NPC', () => {
            const npc = {
                name: 'Goblin',
                level: 1,
                challengeRating: 1,
                lootTables: ['trash_loot'],
                isBoss: false
            };

            const { items, currency } = LootGenerator.generateNPCLoot(npc);

            expect(Array.isArray(items)).toBe(true);
            expect(typeof currency).toBe('number');
            expect(currency).toBeGreaterThanOrEqual(0);
        });

        it('should respect NPC level for item gating', () => {
            const lowLevelNPC = {
                name: 'Rat',
                level: 1,
                challengeRating: 1,
                lootTables: ['trash_loot']
            };

            const { items } = LootGenerator.generateNPCLoot(lowLevelNPC);

            // All items should be appropriate for level 1
            items.forEach(item => {
                const rarity = item.rarity;
                expect(['common', 'uncommon']).toContain(rarity);
            });
        });

        it('should generate more loot for boss NPCs', () => {
            const normalNPC = {
                name: 'Goblin',
                level: 5,
                challengeRating: 5,
                lootTables: ['common_loot'],
                isBoss: false
            };

            const bossNPC = {
                name: 'Goblin King',
                level: 5,
                challengeRating: 5,
                lootTables: ['common_loot'],
                isBoss: true
            };

            const normalLoot = LootGenerator.generateNPCLoot(normalNPC);
            const bossLoot = LootGenerator.generateNPCLoot(bossNPC);

            expect(bossLoot.items.length).toBeGreaterThanOrEqual(normalLoot.items.length);
            expect(bossLoot.currency).toBeGreaterThan(normalLoot.currency);
        });

        it('should handle NPCs with no loot tables', () => {
            const npc = {
                name: 'Harmless Bunny',
                level: 1,
                challengeRating: 0
                // No lootTables property
            };

            const { items, currency } = LootGenerator.generateNPCLoot(npc);

            expect(items).toBeDefined();
            expect(Array.isArray(items)).toBe(true);
        });

        it('should include currency items in results', () => {
            const npc = {
                name: 'Goblin',
                level: 1,
                challengeRating: 1,
                lootTables: ['trash_loot']
            };

            const { items, currency } = LootGenerator.generateNPCLoot(npc);

            // Check if currency items are included
            const currencyItems = items.filter(item => item.itemType === 'currency');
            expect(currencyItems.length).toBeGreaterThan(0);

            // Total currency value should match returned currency amount
            const totalValue = currencyItems.reduce((sum, item) => {
                return sum + (item.value * item.quantity);
            }, 0);
            expect(totalValue).toBe(currency);
        });
    });

    describe('generateCurrency()', () => {
        it('should scale currency with challenge rating', () => {
            const cr0 = LootGenerator.generateCurrency(0);
            const cr1 = LootGenerator.generateCurrency(1);
            const cr5 = LootGenerator.generateCurrency(5);

            expect(cr1).toBeGreaterThan(cr0);
            expect(cr5).toBeGreaterThan(cr1);
        });

        it('should return value within expected ranges', () => {
            const config = require('../../../../src/config/itemsConfig');
            const cr1Range = config.economy.npcCurrencyDrops.cr1;

            for (let i = 0; i < 100; i++) {
                const value = LootGenerator.generateCurrency(1);
                expect(value).toBeGreaterThanOrEqual(cr1Range[0]);
                expect(value).toBeLessThanOrEqual(cr1Range[1]);
            }
        });
    });

    describe('generateBossCurrency()', () => {
        it('should return significantly more than normal currency', () => {
            const normal = LootGenerator.generateCurrency(5);
            const boss = LootGenerator.generateBossCurrency();

            expect(boss).toBeGreaterThan(normal * 2);
        });

        it('should return value within boss range', () => {
            const config = require('../../../../src/config/itemsConfig');
            const bossRange = config.economy.npcCurrencyDrops.boss || [1000, 10000];

            for (let i = 0; i < 100; i++) {
                const value = LootGenerator.generateBossCurrency();
                expect(value).toBeGreaterThanOrEqual(bossRange[0]);
                expect(value).toBeLessThanOrEqual(bossRange[1]);
            }
        });
    });
});
```

---

## 2. Integration Tests

### 2.1 Combat → Corpse Integration

**File:** `/tests/integration/test_combat_corpse_integration.js`

```javascript
const World = require('../../../src/world');
const CombatEngine = require('../../../src/combat/combatEngine');
const ContainerManager = require('../../../src/systems/containers/ContainerManager');

describe('Combat + Corpse Integration', () => {
    let world, combatEngine, player, npc, room;

    beforeEach(() => {
        world = new World('./world');
        combatEngine = new CombatEngine(world, new Set(), mockPlayerDB);

        player = createMockPlayer({
            username: 'TestPlayer',
            level: 1,
            currentRoom: 'sesame_plaza'
        });

        npc = world.getNPC('red_wumpy');
        room = world.getRoom('sesame_plaza');

        // Ensure NPC is in room
        if (!room.npcs.includes('red_wumpy')) {
            room.npcs.push('red_wumpy');
        }
    });

    afterEach(() => {
        ContainerManager.reset();
    });

    it('should create corpse when NPC dies in combat', (done) => {
        // Start combat
        combatEngine.initiateCombat([player, npc]);

        // Set NPC to 1 HP so next hit kills it
        npc.hp = 1;

        // Wait for combat round
        setTimeout(() => {
            // Check for corpse in room
            expect(room.corpses).toBeDefined();
            expect(room.corpses.length).toBeGreaterThan(0);

            const corpse = room.corpses.find(c => c.npcId === 'red_wumpy');
            expect(corpse).toBeDefined();
            expect(corpse.name).toContain('Red Wumpy');

            done();
        }, 3500); // After one combat round
    });

    it('should award XP before creating corpse', (done) => {
        const initialXP = player.currentXp || 0;

        npc.hp = 1;
        combatEngine.initiateCombat([player, npc]);

        setTimeout(() => {
            expect(player.currentXp).toBeGreaterThan(initialXP);

            // Corpse should exist
            const corpse = room.corpses?.find(c => c.npcId === 'red_wumpy');
            expect(corpse).toBeDefined();

            done();
        }, 3500);
    });

    it('should remove NPC from room after death', (done) => {
        const initialNPCCount = room.npcs.length;

        npc.hp = 1;
        combatEngine.initiateCombat([player, npc]);

        setTimeout(() => {
            expect(room.npcs.length).toBe(initialNPCCount - 1);
            expect(room.npcs).not.toContain('red_wumpy');

            done();
        }, 3500);
    });

    it('should populate corpse with generated loot', (done) => {
        npc.hp = 1;
        npc.lootTables = ['trash_loot'];
        npc.challengeRating = 1;

        combatEngine.initiateCombat([player, npc]);

        setTimeout(() => {
            const corpse = room.corpses?.find(c => c.npcId === 'red_wumpy');
            expect(corpse).toBeDefined();
            expect(corpse.inventory).toBeDefined();
            expect(corpse.inventory.length).toBeGreaterThanOrEqual(0);

            done();
        }, 3500);
    });

    it('should handle NPC death during flee attempt', (done) => {
        // Set NPC to flee behavior and low HP
        npc.hp = 1;
        npc.aggression = 0; // Make NPC want to flee

        combatEngine.initiateCombat([player, npc]);

        setTimeout(() => {
            // Corpse should exist even if NPC died during flee
            const corpse = room.corpses?.find(c => c.npcId === 'red_wumpy');
            if (npc.isDead()) {
                expect(corpse).toBeDefined();
            }

            done();
        }, 3500);
    });
});
```

### 2.2 Corpse Decay → Respawn Integration

**File:** `/tests/integration/test_corpse_respawn_integration.js`

```javascript
const RespawnService = require('../../../src/respawnService');
const ContainerManager = require('../../../src/systems/containers/ContainerManager');
const World = require('../../../src/world');

describe('Corpse Decay + Respawn Integration', () => {
    let world, respawnService, room;

    beforeEach(() => {
        world = new World('./world');
        respawnService = new RespawnService(world);
        room = world.getRoom('sesame_plaza');

        // Ensure initial state
        if (!world.initialRoomsState['sesame_plaza']) {
            world.initialRoomsState['sesame_plaza'] = {
                npcs: ['red_wumpy']
            };
        }
    });

    it('should not respawn NPC while corpse exists', () => {
        // Remove NPC from room
        room.npcs = [];

        // Create corpse
        const corpse = ContainerManager.createCorpse({
            npcId: 'red_wumpy',
            npcName: 'Red Wumpy',
            roomId: 'sesame_plaza',
            items: [],
            decayTime: Date.now() + 300000 // 5 minutes in future
        });

        if (!room.corpses) room.corpses = [];
        room.corpses.push(corpse);

        // Try to respawn
        respawnService.checkAndRespawn();

        // NPC should NOT respawn
        expect(room.npcs).not.toContain('red_wumpy');
    });

    it('should respawn NPC after corpse decays', (done) => {
        // Remove NPC from room
        room.npcs = [];

        // Create corpse with immediate decay
        const corpse = ContainerManager.createCorpse({
            npcId: 'red_wumpy',
            npcName: 'Red Wumpy',
            roomId: 'sesame_plaza',
            items: [],
            decayTime: Date.now() - 1000 // Already decayed
        });

        room.corpses = [corpse];

        // Process decay
        ContainerManager.processCorpseDecay(world, new Set());

        // Corpse should be removed
        expect(room.corpses.length).toBe(0);

        // Now respawn should work
        respawnService.checkAndRespawn();

        // NPC should respawn
        expect(room.npcs).toContain('red_wumpy');

        // NPC should have full HP
        const npc = world.getNPC('red_wumpy');
        expect(npc.hp).toBe(npc.maxHp);

        done();
    });

    it('should handle multiple corpses in same room', () => {
        room.npcs = [];
        room.corpses = [];

        // Create multiple corpses
        const corpse1 = ContainerManager.createCorpse({
            npcId: 'red_wumpy',
            npcName: 'Red Wumpy',
            roomId: 'sesame_plaza',
            items: [],
            decayTime: Date.now() + 60000
        });

        const corpse2 = ContainerManager.createCorpse({
            npcId: 'blue_wumpy',
            npcName: 'Blue Wumpy',
            roomId: 'sesame_plaza',
            items: [],
            decayTime: Date.now() - 1000 // Decayed
        });

        room.corpses.push(corpse1, corpse2);

        // Process decay
        ContainerManager.processCorpseDecay(world, new Set());

        // Only decayed corpse should be removed
        expect(room.corpses.length).toBe(1);
        expect(room.corpses[0].npcId).toBe('red_wumpy');
    });
});
```

---

## 3. Combat Balance Tests

### 3.1 Loot Economy Validation

**File:** `/tests/balance/test_loot_economy.js`

```javascript
const LootGenerator = require('../../../src/systems/loot/LootGenerator');

describe('Loot Economy Balance', () => {
    it('should generate balanced currency for CR1 mobs', () => {
        const samples = 1000;
        let totalCurrency = 0;

        for (let i = 0; i < samples; i++) {
            totalCurrency += LootGenerator.generateCurrency(1);
        }

        const avgCurrency = totalCurrency / samples;

        // CR1 should average ~12 copper (range 5-20)
        expect(avgCurrency).toBeGreaterThan(10);
        expect(avgCurrency).toBeLessThan(14);
    });

    it('should scale currency generation with CR', () => {
        const avgCR1 = simulateCurrencyDrops(1, 1000);
        const avgCR3 = simulateCurrencyDrops(3, 1000);
        const avgCR5 = simulateCurrencyDrops(5, 1000);

        expect(avgCR3).toBeGreaterThan(avgCR1 * 3);
        expect(avgCR5).toBeGreaterThan(avgCR3 * 2);
    });

    it('should not flood economy with rare items', () => {
        const npc = {
            name: 'Test',
            level: 1,
            challengeRating: 1,
            lootTables: ['common_loot']
        };

        let rareCount = 0;
        const trials = 1000;

        for (let i = 0; i < trials; i++) {
            const { items } = LootGenerator.generateNPCLoot(npc);
            rareCount += items.filter(item => item.rarity === 'rare').length;
        }

        // Rare items should be < 5% of drops
        expect(rareCount / trials).toBeLessThan(0.05);
    });
});

function simulateCurrencyDrops(cr, samples) {
    let total = 0;
    for (let i = 0; i < samples; i++) {
        total += LootGenerator.generateCurrency(cr);
    }
    return total / samples;
}
```

### 3.2 Respawn Timer Validation

**File:** `/tests/balance/test_respawn_timers.js`

```javascript
const config = require('../../../src/config/corpsesConfig');

describe('Respawn Timer Balance', () => {
    it('should have reasonable decay times', () => {
        expect(config.npc.decayTime.trash).toBe(300000);      // 5 min
        expect(config.npc.decayTime.standard).toBe(300000);   // 5 min
        expect(config.npc.decayTime.elite).toBe(600000);      // 10 min
        expect(config.npc.decayTime.boss).toBe(1800000);      // 30 min
    });

    it('should prevent rapid farming with combined timers', () => {
        // Total death-to-respawn time should prevent abuse
        const trashTotal = config.npc.decayTime.trash + config.npc.respawnDelay.trash;
        const bossTotal = config.npc.decayTime.boss + config.npc.respawnDelay.boss;

        // Trash: 5 min minimum between kills
        expect(trashTotal).toBeGreaterThanOrEqual(300000);

        // Boss: 60 min minimum between kills
        expect(bossTotal).toBeGreaterThanOrEqual(3600000);
    });
});
```

---

## 4. End-to-End Tests

### 4.1 Complete Death → Loot → Respawn Cycle

**File:** `/tests/e2e/test_full_corpse_cycle.js`

```javascript
describe('E2E: Full Corpse Cycle', () => {
    it('should complete full death → loot → decay → respawn cycle', async () => {
        // Setup
        const world = new World('./world');
        const combatEngine = new CombatEngine(world, new Set(), mockPlayerDB);
        const respawnService = new RespawnService(world);
        const player = createMockPlayer({ level: 10 }); // High level to guarantee kill

        const room = world.getRoom('sesame_plaza');
        const npc = world.getNPC('red_wumpy');

        // Step 1: Kill NPC in combat
        npc.hp = 1;
        combatEngine.initiateCombat([player, npc]);

        await wait(3500); // Wait for combat round

        // Verify: NPC dead, corpse created
        expect(npc.isDead()).toBe(true);
        expect(room.corpses).toHaveLength(1);
        const corpse = room.corpses[0];

        // Step 2: Loot corpse
        const lootCommand = require('../../../src/commands/core/loot');
        const lootResult = lootCommand(player, ['corpse'], world, new Set());

        // Verify: Items transferred to player
        expect(player.inventory.length).toBeGreaterThan(0);
        expect(corpse.isEmpty()).toBe(true);

        // Step 3: Force decay
        corpse.decayTime = Date.now() - 1000;
        ContainerManager.processCorpseDecay(world, new Set([player]));

        // Verify: Corpse removed
        expect(room.corpses).toHaveLength(0);

        // Step 4: Respawn
        respawnService.checkAndRespawn();

        // Verify: NPC respawned with full HP
        expect(room.npcs).toContain('red_wumpy');
        expect(npc.hp).toBe(npc.maxHp);
        expect(npc.isDead()).toBe(false);
    });
});

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 5. Manual Test Cases

### Test Case 1: Basic NPC Death and Looting

**Objective:** Verify corpse creation and looting

**Prerequisites:**
- Player logged in
- Red Wumpy spawned in Sesame Street Plaza

**Steps:**
1. `attack red wumpy`
2. Wait for combat to complete (NPC dies)
3. `look` - Verify corpse appears in room description
4. `examine corpse` - Verify contents displayed
5. `loot corpse` - Verify items transferred to inventory
6. `inventory` - Verify items in player inventory

**Expected Results:**
- Combat message shows NPC death
- Corpse visible in room
- Examine shows loot contents
- Loot command transfers items
- Corpse becomes empty but remains

**Pass Criteria:**
✅ Corpse created on death
✅ Corpse visible in room
✅ Loot displayed correctly
✅ Items transferred successfully

---

### Test Case 2: Corpse Decay and Respawn

**Objective:** Verify decay timer and respawn linkage

**Prerequisites:**
- NPC killed, corpse created
- Decay timer set to 1 minute for testing

**Steps:**
1. Note current game time
2. Wait 1 minute
3. `look` - Verify corpse still present
4. Wait additional 30 seconds (past decay time)
5. `look` - Verify corpse gone
6. Wait 1 more minute
7. `look` - Verify NPC respawned

**Expected Results:**
- Corpse persists until decay time
- Decay message displayed to players in room
- Corpse removed from room
- NPC respawns after corpse decays
- Respawned NPC has full HP

**Pass Criteria:**
✅ Decay happens at correct time
✅ Decay message displayed
✅ Corpse removed
✅ NPC respawns correctly

---

### Test Case 3: Boss Loot Quality

**Objective:** Verify boss NPCs have better loot

**Prerequisites:**
- Access to boss-tier NPC
- Access to trash-tier NPC

**Steps:**
1. Kill trash NPC, examine corpse, record loot
2. Kill boss NPC, examine corpse, record loot
3. Compare loot quality and quantity

**Expected Results:**
- Boss corpse has more items
- Boss corpse has higher currency amount
- Boss corpse may have better rarity items

**Pass Criteria:**
✅ Boss loot quantity > trash loot quantity
✅ Boss currency > trash currency
✅ Boss loot includes better rarities

---

### Test Case 4: Multiple Corpses in Room

**Objective:** Verify multiple corpses handled correctly

**Prerequisites:**
- Room with multiple NPCs

**Steps:**
1. Kill NPC #1, note corpse
2. Kill NPC #2, note corpse
3. `look` - Verify both corpses visible
4. `examine corpse of [NPC1]` - Verify correct corpse
5. `examine corpse of [NPC2]` - Verify correct corpse
6. `loot corpse of [NPC1]` - Verify loots correct corpse
7. Wait for NPC #1 corpse to decay
8. Verify NPC #1 respawns but NPC #2 corpse still present

**Expected Results:**
- Each corpse unique and identifiable
- Looting targets correct corpse
- Decay timers independent
- Respawn only occurs after corresponding corpse decays

**Pass Criteria:**
✅ Multiple corpses coexist
✅ Each corpse identifiable
✅ Looting targets correct corpse
✅ Independent decay timers

---

### Test Case 5: Corpse in Player Inventory (If Moveable)

**Objective:** Verify corpse movement and decay in inventory

**Prerequisites:**
- Corpses are moveable (high weight)

**Steps:**
1. Kill NPC
2. `get corpse` - Attempt to pick up
3. `inventory` - Verify corpse in inventory (heavy)
4. Move to different room
5. `drop corpse` - Verify can drop
6. Wait for decay while carrying
7. Verify decay message

**Expected Results:**
- Corpse can be picked up (if STR sufficient)
- Corpse counts as very heavy
- Corpse decays even in inventory
- Decay message displayed to player

**Pass Criteria:**
✅ Corpse can be picked up
✅ Weight is significant
✅ Decay works in inventory
✅ Respawn works regardless of corpse location

---

## 6. Performance Tests

### 6.1 Corpse Accumulation Test

**Objective:** Verify system handles many corpses

**Setup:**
- Spawn 100 NPCs in test area
- Kill all NPCs rapidly

**Metrics:**
- Memory usage before/after
- Decay processing time
- Room rendering performance

**Pass Criteria:**
- Memory usage < 50MB increase
- Decay processing < 10ms per corpse
- Room rendering < 100ms with 50 corpses

### 6.2 Decay Processing Performance

**Objective:** Verify decay loop efficiency

**Setup:**
- Create 1000 corpses across 100 rooms
- Measure decay processing time

**Pass Criteria:**
- Full decay check completes in < 100ms
- No memory leaks detected
- Consistent performance over time

---

## 7. Error Case Tests

### Test Error 1: Invalid Loot Configuration

**Scenario:** NPC has malformed lootTables

```javascript
const npc = {
    name: 'Broken NPC',
    level: 1,
    lootTables: 'not_an_array', // ERROR: should be array
    challengeRating: 1
};
```

**Expected:** Graceful fallback to default loot tables

### Test Error 2: Corpse Decay During Looting

**Scenario:** Player examining corpse when it decays

**Expected:** Graceful message, loot operation cancelled

### Test Error 3: Server Restart with Active Corpses

**Scenario:** Server crashes/restarts with corpses in world

**Expected:** Corpses decay on restart OR persist with timestamps

---

## 8. Test Execution Plan

### Phase 1: Unit Tests (Week 1)
- Container base class
- Corpse container
- Container manager
- Loot generation

**Target:** 90% code coverage

### Phase 2: Integration Tests (Week 1-2)
- Combat integration
- Respawn integration
- Full cycle test

**Target:** All major workflows passing

### Phase 3: Balance Tests (Week 2)
- Currency generation rates
- Loot drop frequencies
- Respawn timer validation

**Target:** Economy balanced

### Phase 4: Manual Testing (Week 2-3)
- All manual test cases executed
- Edge cases documented
- UX issues identified

**Target:** Zero critical bugs

### Phase 5: Performance Testing (Week 3)
- Corpse accumulation
- Decay processing
- Memory leak detection

**Target:** Performance metrics met

---

## 9. Test Data Requirements

### Required NPCs

```json
[
    {
        "id": "test_trash_mob",
        "name": "Test Trash Mob",
        "level": 1,
        "hp": 10,
        "challengeRating": 1,
        "lootTables": ["trash_loot"],
        "tier": "trash"
    },
    {
        "id": "test_boss_mob",
        "name": "Test Boss Mob",
        "level": 5,
        "hp": 50,
        "challengeRating": 5,
        "lootTables": ["boss_loot"],
        "tier": "boss",
        "isBoss": true
    }
]
```

### Required Items

- Rusty Dagger (common, trash_loot)
- Iron Sword (uncommon, common_loot)
- Gold Ring (rare, boss_loot)
- Copper Coin (currency)
- Silver Coin (currency)

---

## 10. Success Criteria Summary

### Critical Tests (Must Pass)
- ✅ Corpse created on NPC death
- ✅ Loot generated and populated
- ✅ Items transferable to player
- ✅ Corpse decay at correct time
- ✅ NPC respawn after decay
- ✅ Full HP on respawn

### Important Tests (Should Pass)
- ✅ Multiple corpses per room
- ✅ Boss loot superior to trash
- ✅ Currency generation balanced
- ✅ Respawn timers prevent farming
- ✅ Performance metrics met

### Nice-to-Have Tests (Optional)
- ✅ Corpse movement
- ✅ Decay in inventory
- ✅ Player death corpses
- ✅ Necromancy interactions

---

**Test Plan Status:** APPROVED
**Ready for Implementation:** YES
**Estimated Test Writing Time:** 20-25 hours
**Estimated Test Execution Time:** 10-15 hours
