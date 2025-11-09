/**
 * Consumable Commands Test
 *
 * Tests the implementation of consumable commands (use, eat, drink)
 * according to the design document.
 */

const colors = require('../src/colors');

// Mock player object
function createMockPlayer(name = 'TestPlayer') {
  const messages = [];
  return {
    name,
    username: name.toLowerCase(),
    hp: 50,
    maxHp: 100,
    currentRoom: 'test_room',
    isGhost: false,
    inventory: [],
    send: function(message) {
      messages.push(message);
      console.log(`[${this.name}]`, message.replace(/\n/g, ' ').trim());
    },
    getMessages: function() {
      return messages;
    },
    clearMessages: function() {
      messages.length = 0;
    }
  };
}

// Mock context
function createMockContext() {
  return {
    world: {
      sendToRoom: function(room, message, excludePlayers = [], allPlayers) {
        console.log(`[ROOM ${room}] (excluding [${excludePlayers.join(', ')}]):`, message.replace(/\n/g, ' ').trim());
      }
    },
    playerDB: null,
    allPlayers: {}
  };
}

// Test harness
let testsPassed = 0;
let testsFailed = 0;

function test(description, testFn) {
  console.log('\n' + colors.info('TEST: ' + description));
  try {
    testFn();
    console.log(colors.success('PASSED'));
    testsPassed++;
  } catch (error) {
    console.log(colors.error('FAILED: ' + error.message));
    console.error(error.stack);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertContains(text, substring, message) {
  if (!text.includes(substring)) {
    throw new Error(message || `Expected text to contain "${substring}" but got: ${text}`);
  }
}

// Import required modules
const ItemFactory = require('../src/items/ItemFactory');
const useCommand = require('../src/commands/core/use');
const eatCommand = require('../src/commands/core/eat');
const drinkCommand = require('../src/commands/core/drink');

// Load item definitions before testing
const { loadCoreItems } = require('../world/core/items/loadItems');
const { loadSesameStreetItems } = require('../world/sesame_street/items/loadItems');

console.log(colors.highlight('\n=== CONSUMABLE COMMANDS TEST SUITE ===\n'));

console.log(colors.info('Loading item definitions...'));
loadCoreItems();
loadSesameStreetItems();
console.log(colors.success('Item definitions loaded\n'));

// Test 1: Health potion with "use" command
test('Use health potion - heals player', () => {
  const player = createMockPlayer('Alice');
  player.hp = 50;

  const potion = ItemFactory.createItem('sesame_health_potion', { quantity: 1 });
  player.inventory.push(potion);

  const context = createMockContext();
  useCommand.execute(player, ['potion'], context);

  assert(player.hp === 75, `Expected HP to be 75, got ${player.hp}`);
  assert(potion.quantity === 0, `Expected potion quantity to be 0, got ${potion.quantity}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, 'drink', 'Expected success message about drinking');
  assertContains(messages, '25 HP', 'Expected healing amount in message');
});

// Test 2: Cookie with "eat" command
test('Eat cookie - heals player with food message', () => {
  const player = createMockPlayer('Bob');
  player.hp = 50;

  const cookie = ItemFactory.createItem('chocolate_chip_cookie', { quantity: 1 });
  player.inventory.push(cookie);

  const context = createMockContext();
  eatCommand.execute(player, ['cookie'], context);

  assert(player.hp === 55, `Expected HP to be 55, got ${player.hp}`);
  assert(cookie.quantity === 0, `Expected cookie quantity to be 0, got ${cookie.quantity}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, 'eat', 'Expected success message about eating');
  assertContains(messages, '5 HP', 'Expected healing amount in message');
});

// Test 3: Drink potion (same as use)
test('Drink potion - works same as use', () => {
  const player = createMockPlayer('Charlie');
  player.hp = 50;

  const potion = ItemFactory.createItem('sesame_health_potion', { quantity: 1 });
  player.inventory.push(potion);

  const context = createMockContext();
  drinkCommand.execute(player, ['potion'], context);

  assert(player.hp === 75, `Expected HP to be 75, got ${player.hp}`);
  assert(potion.quantity === 0, `Expected potion quantity to be 0, got ${potion.quantity}`);
});

// Test 4: Eat potion - gives error
test('Eat potion - error message suggesting drink', () => {
  const player = createMockPlayer('Diana');

  const potion = ItemFactory.createItem('sesame_health_potion', { quantity: 1 });
  player.inventory.push(potion);

  const context = createMockContext();
  const initialHp = player.hp;

  eatCommand.execute(player, ['potion'], context);

  assert(player.hp === initialHp, `Expected HP unchanged, got ${player.hp}`);
  assert(potion.quantity === 1, `Expected potion not consumed, quantity is ${potion.quantity}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, "can't eat", 'Expected error about eating potion');
  assertContains(messages, 'drink', 'Expected suggestion to drink instead');
});

// Test 5: Drink cookie - gives error
test('Drink cookie - error message suggesting eat', () => {
  const player = createMockPlayer('Eve');

  const cookie = ItemFactory.createItem('chocolate_chip_cookie', { quantity: 1 });
  player.inventory.push(cookie);

  const context = createMockContext();
  const initialHp = player.hp;

  drinkCommand.execute(player, ['cookie'], context);

  assert(player.hp === initialHp, `Expected HP unchanged, got ${player.hp}`);
  assert(cookie.quantity === 1, `Expected cookie not consumed, quantity is ${cookie.quantity}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, "can't drink", 'Expected error about drinking cookie');
  assertContains(messages, 'eat', 'Expected suggestion to eat instead');
});

// Test 6: Dead player cannot consume
test('Use potion while dead - prevented', () => {
  const player = createMockPlayer('Frank');
  player.hp = 0;
  player.isGhost = false;

  const potion = ItemFactory.createItem('sesame_health_potion', { quantity: 1 });
  player.inventory.push(potion);

  const context = createMockContext();
  useCommand.execute(player, ['potion'], context);

  assert(player.hp === 0, `Expected HP unchanged at 0, got ${player.hp}`);
  assert(potion.quantity === 1, `Expected potion not consumed, quantity is ${potion.quantity}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, 'cannot consume', 'Expected error about consuming while dead');
  assertContains(messages, 'dead', 'Expected message mentions being dead');
});

// Test 7: Stackable items - quantity tracking
test('Stackable items - quantity tracking', () => {
  const player = createMockPlayer('Grace');
  player.hp = 50;

  const cookies = ItemFactory.createItem('chocolate_chip_cookie', { quantity: 3 });
  player.inventory.push(cookies);

  const context = createMockContext();
  eatCommand.execute(player, ['cookie'], context);

  assert(cookies.quantity === 2, `Expected 2 cookies remaining, got ${cookies.quantity}`);
  assert(player.hp === 55, `Expected HP to be 55, got ${player.hp}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, '2 remaining', 'Expected message showing remaining quantity');
});

// Test 8: Last item consumed - removed from inventory
test('Last item consumed - removed from inventory', () => {
  const player = createMockPlayer('Hank');
  player.hp = 50;

  const cookie = ItemFactory.createItem('chocolate_chip_cookie', { quantity: 1 });
  player.inventory.push(cookie);

  assert(player.inventory.length === 1, 'Expected 1 item in inventory before consumption');

  const context = createMockContext();
  eatCommand.execute(player, ['cookie'], context);

  assert(cookie.quantity === 0, `Expected cookie quantity to be 0, got ${cookie.quantity}`);

  // Note: The actual removal from inventory array would be done by InventoryManager
  // which we're not fully testing here, but we verify the quantity is 0
});

// Test 9: Full health warning
test('Use potion at full health - warning but allowed', () => {
  const player = createMockPlayer('Ivy');
  player.hp = 100;
  player.maxHp = 100;

  const potion = ItemFactory.createItem('sesame_health_potion', { quantity: 1 });
  player.inventory.push(potion);

  const context = createMockContext();
  useCommand.execute(player, ['potion'], context);

  // Should still consume despite warning
  assert(potion.quantity === 0, `Expected potion consumed, quantity is ${potion.quantity}`);

  const messages = player.getMessages().join(' ');
  assertContains(messages, 'full health', 'Expected warning about full health');
});

// Test 10: Room notifications
test('Room notification - others see consumption', () => {
  const player = createMockPlayer('Jack');
  player.hp = 50;

  const cookie = ItemFactory.createItem('chocolate_chip_cookie', { quantity: 1 });
  player.inventory.push(cookie);

  const context = createMockContext();

  console.log(colors.info('  (Watch for room notification below)'));
  eatCommand.execute(player, ['cookie'], context);

  // Room notification would be logged by the mock context.world.sendToRoom
  // We're visually confirming it appears in the output
  assert(cookie.quantity === 0, 'Cookie should be consumed');
});

// Summary
console.log(colors.highlight('\n=== TEST SUMMARY ===\n'));
console.log(colors.success(`Tests passed: ${testsPassed}`));
if (testsFailed > 0) {
  console.log(colors.error(`Tests failed: ${testsFailed}`));
  process.exit(1);
} else {
  console.log(colors.success('\nAll tests passed!'));
  process.exit(0);
}
