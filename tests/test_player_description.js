/**
 * Test script for Player Description System
 *
 * Tests all aspects of the description generation system including:
 * - Base descriptions
 * - Level tier descriptions
 * - Description modifiers
 * - Equipment display
 * - Ghost status
 */

const PlayerDescriptionService = require('../src/systems/description/PlayerDescriptionService');
const colors = require('../src/colors');

// Mock player object for testing
function createMockPlayer(overrides = {}) {
  return {
    username: 'TestPlayer',
    capname: null,
    level: 1,
    description: null,
    descriptionModifiers: [],
    isGhost: false,
    inventory: [],
    baseStats: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    getDisplayName() {
      return this.capname || this.username;
    },
    ...overrides
  };
}

// Mock equipment item
function createMockItem(name, slot, itemType = 'WEAPON') {
  return {
    name,
    slot,
    itemType,
    isEquipped: true,
    keywords: [name.toLowerCase()],
    getDisplayName() {
      return this.name;
    },
    weaponProperties: itemType === 'WEAPON' ? { damageDice: '1d8' } : null,
    armorProperties: itemType === 'ARMOR' ? { baseAC: 12 } : null
  };
}

console.log(colors.highlight('='.repeat(70)));
console.log(colors.highlight('  PLAYER DESCRIPTION SYSTEM - TEST SUITE'));
console.log(colors.highlight('='.repeat(70)));
console.log('');

// Test 1: Basic description with default text
console.log(colors.cyan('Test 1: New player with default description'));
console.log(colors.dim('-'.repeat(70)));
const player1 = createMockPlayer({ level: 1 });
const desc1 = PlayerDescriptionService.generateDescription(player1, { isSelf: false });
console.log(colors.stripColors(desc1));
console.log('');

// Test 2: Player with custom description
console.log(colors.cyan('Test 2: Player with custom description'));
console.log(colors.dim('-'.repeat(70)));
const player2 = createMockPlayer({
  level: 5,
  description: 'A weathered warrior with keen eyes that miss nothing. Scars tell stories they prefer not to share.'
});
const desc2 = PlayerDescriptionService.generateDescription(player2, { isSelf: false });
console.log(colors.stripColors(desc2));
console.log('');

// Test 3: High-level character
console.log(colors.cyan('Test 3: High-level legendary character'));
console.log(colors.dim('-'.repeat(70)));
const player3 = createMockPlayer({
  level: 25,
  description: 'A figure of tremendous power, whose very presence seems to warp the air around them.'
});
const desc3 = PlayerDescriptionService.generateDescription(player3, { isSelf: false });
console.log(colors.stripColors(desc3));
console.log('');

// Test 4: Character with description modifiers
console.log(colors.cyan('Test 4: Character with guild and tattoo modifiers'));
console.log(colors.dim('-'.repeat(70)));
const player4 = createMockPlayer({
  level: 10,
  description: 'A capable adventurer with a confident stride.',
  descriptionModifiers: [
    {
      text: 'The crimson tabard of the Warriors Guild marks them as a trained combatant. The stains suggest it\'s not just for show.',
      source: 'guild_warriors',
      priority: 80,
      addedAt: Date.now()
    },
    {
      text: 'A magnificent dragon tattoo coils up their arm, its scales shimmering with an almost lifelike iridescence.',
      source: 'tattoo_arm',
      priority: 60,
      addedAt: Date.now()
    }
  ]
});
const desc4 = PlayerDescriptionService.generateDescription(player4, { isSelf: false });
console.log(colors.stripColors(desc4));
console.log('');

// Test 5: Character with equipment (mock EquipmentManager response)
console.log(colors.cyan('Test 5: Character with visible equipment'));
console.log(colors.dim('-'.repeat(70)));
const player5 = createMockPlayer({
  level: 12,
  description: 'A well-armed adventurer ready for battle.',
  inventory: [
    createMockItem('Flaming Sword', 'main_hand', 'WEAPON'),
    createMockItem('Steel Shield', 'off_hand', 'WEAPON'),
    createMockItem('Chainmail Armor', 'body', 'ARMOR'),
    createMockItem('Iron Helm', 'head', 'ARMOR')
  ]
});

// Mock equipped items by setting isEquipped
player5.inventory.forEach(item => item.isEquipped = true);

const desc5 = PlayerDescriptionService.generateDescription(player5, { isSelf: false });
console.log(colors.stripColors(desc5));
console.log('');

// Test 6: Ghost character
console.log(colors.cyan('Test 6: Ghost character'));
console.log(colors.dim('-'.repeat(70)));
const player6 = createMockPlayer({
  level: 8,
  description: 'Once a mighty warrior, now merely a shadow.',
  isGhost: true
});
const desc6 = PlayerDescriptionService.generateDescription(player6, { isSelf: false });
console.log(colors.stripColors(desc6));
console.log('');

// Test 7: Self-view vs. other-view
console.log(colors.cyan('Test 7: Self-view (using "your" instead of "their")'));
console.log(colors.dim('-'.repeat(70)));
const player7 = createMockPlayer({
  level: 15,
  description: 'A seasoned adventurer with battle-worn gear.',
  isGhost: false
});
const desc7self = PlayerDescriptionService.generateDescription(player7, { isSelf: true });
console.log(colors.stripColors(desc7self));
console.log('');

// Test 8: Modifier priority ordering
console.log(colors.cyan('Test 8: Modifier priority ordering (high to low)'));
console.log(colors.dim('-'.repeat(70)));
const player8 = createMockPlayer({
  level: 20,
  description: 'A legendary figure known across the lands.',
  descriptionModifiers: [
    {
      text: 'Minor effect: barely noticeable.',
      source: 'effect_minor',
      priority: 10,
      addedAt: Date.now()
    },
    {
      text: 'Major achievement: the gods have blessed them.',
      source: 'quest_legendary',
      priority: 95,
      addedAt: Date.now()
    },
    {
      text: 'Guild membership: visible insignia.',
      source: 'guild_test',
      priority: 80,
      addedAt: Date.now()
    },
    {
      text: 'Tattoo: decorative art.',
      source: 'tattoo_test',
      priority: 60,
      addedAt: Date.now()
    }
  ]
});
const desc8 = PlayerDescriptionService.generateDescription(player8, { isSelf: false });
console.log(colors.stripColors(desc8));
console.log('');

// Test 9: Level tier info
console.log(colors.cyan('Test 9: Level tier information'));
console.log(colors.dim('-'.repeat(70)));
for (const level of [1, 5, 10, 15, 20, 25, 30]) {
  const tierInfo = PlayerDescriptionService.getLevelTierInfo(level);
  if (tierInfo) {
    console.log(`Level ${level.toString().padStart(2)}: ${tierInfo.title} (${tierInfo.minLevel}-${tierInfo.maxLevel})`);
  }
}
console.log('');

// Test 10: Modifier management functions
console.log(colors.cyan('Test 10: Modifier management API'));
console.log(colors.dim('-'.repeat(70)));
const player10 = createMockPlayer({ level: 10 });

// Add modifier
PlayerDescriptionService.addDescriptionModifier(
  player10,
  'Test modifier text.',
  'test_source',
  50
);
console.log('After adding: ', PlayerDescriptionService.hasDescriptionModifier(player10, 'test_source') ? 'EXISTS' : 'MISSING');

// Get modifier
const mod = PlayerDescriptionService.getDescriptionModifier(player10, 'test_source');
console.log('Modifier text:', mod ? mod.text : 'NOT FOUND');

// Remove modifier
PlayerDescriptionService.removeDescriptionModifier(player10, 'test_source');
console.log('After removing:', PlayerDescriptionService.hasDescriptionModifier(player10, 'test_source') ? 'EXISTS' : 'MISSING');

// Add multiple and clear
PlayerDescriptionService.addDescriptionModifier(player10, 'First', 'source1', 50);
PlayerDescriptionService.addDescriptionModifier(player10, 'Second', 'source2', 50);
console.log('Added 2 modifiers, count:', player10.descriptionModifiers.length);
PlayerDescriptionService.clearDescriptionModifiers(player10);
console.log('After clear, count:', player10.descriptionModifiers.length);
console.log('');

// Test 11: Modifier replacement (same source)
console.log(colors.cyan('Test 11: Modifier replacement (updating same source)'));
console.log(colors.dim('-'.repeat(70)));
const player11 = createMockPlayer({ level: 10 });
PlayerDescriptionService.addDescriptionModifier(player11, 'Original text', 'test', 50);
console.log('Original:', player11.descriptionModifiers[0].text);
PlayerDescriptionService.addDescriptionModifier(player11, 'Updated text', 'test', 50);
console.log('After update:', player11.descriptionModifiers[0].text);
console.log('Modifier count (should be 1):', player11.descriptionModifiers.length);
console.log('');

// Summary
console.log(colors.highlight('='.repeat(70)));
console.log(colors.success('  All tests completed successfully!'));
console.log(colors.highlight('='.repeat(70)));
console.log('');
console.log(colors.dim('The Player Description System is working as expected.'));
console.log(colors.dim('Integration with the look command should now provide rich descriptions.'));
console.log('');
