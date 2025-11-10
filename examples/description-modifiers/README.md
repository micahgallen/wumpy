# Description Modifier Examples

This directory contains example implementations of the Player Description System's modifier functionality. Each example demonstrates how different game systems can add dynamic, narrative descriptions to player characters.

## Available Examples

### 1. Guild Modifiers (`guildModifiers.js`)

Demonstrates how guild systems can add visual identifiers when players join guilds.

**Features:**
- 8 pre-defined guilds with unique descriptions
- Automatic replacement when switching guilds
- Helper functions for guild management
- Priority-based display ordering

**Usage:**
```javascript
const guildMods = require('./examples/description-modifiers/guildModifiers');

// When player joins a guild
guildMods.addGuildModifier(player, 'warriors_guild', playerDB);

// When player leaves
guildMods.removeGuildModifier(player, 'warriors_guild', playerDB);
```

### 2. Tattoo System (`tattooSystem.js`)

A complete tattoo parlor system with costs, multiple body slots, and removal.

**Features:**
- 10 tattoo designs across different body locations
- Currency-based purchases
- Slot-based system (arm, back, chest, etc.)
- Paid removal system
- Shop interface functions

**Usage:**
```javascript
const tattoos = require('./examples/description-modifiers/tattooSystem');

// Get a tattoo
const result = tattoos.getTattoo(player, 'dragon', playerDB);
player.send(result.message);

// Remove a tattoo
const result = tattoos.removeTattoo(player, 'arm', playerDB);
player.send(result.message);

// Show available tattoos
player.send(tattoos.listTattoos());
```

## Integrating into Commands

Both examples include commented code showing how to integrate them into MUD commands. Here's a complete example:

### Guild Join Command

```javascript
// In src/commands/guild/join.js
const colors = require('../../colors');
const guildMods = require('../../../examples/description-modifiers/guildModifiers');

function execute(player, args, context) {
  if (args.length === 0) {
    player.send(colors.error('Join which guild?'));
    player.send('\nAvailable guilds: ' + guildMods.getAvailableGuilds().join(', '));
    return;
  }

  const guildId = args[0].toLowerCase() + '_guild';

  if (!guildMods.getAvailableGuilds().includes(guildId)) {
    player.send(colors.error('That guild doesn\'t exist.'));
    return;
  }

  if (player.guild === guildId) {
    player.send(colors.warning('You\'re already a member of this guild!'));
    return;
  }

  // Set guild membership
  player.guild = guildId;
  guildMods.addGuildModifier(player, guildId, context.playerDB);

  // Save player state
  context.playerDB.savePlayer(player);

  const guildName = guildId.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  player.send(colors.success(`Welcome to the ${guildName}!`));
  player.send(colors.dim('Use "look at ' + player.username + '" to see your new guild insignia.'));
}

module.exports = {
  name: 'join',
  aliases: ['joinguild'],
  execute
};
```

### Tattoo Shop Command

```javascript
// In src/commands/shops/tattoo.js
const colors = require('../../colors');
const tattoos = require('../../../examples/description-modifiers/tattooSystem');

function execute(player, args, context) {
  // Must be in tattoo parlor
  if (player.currentRoom !== 'tattoo_parlor') {
    player.send(colors.error('You need to be in a tattoo parlor to do that.'));
    return;
  }

  const action = args[0]?.toLowerCase();

  if (!action || action === 'list') {
    player.send('\n' + tattoos.listTattoos());
    return;
  }

  if (action === 'show' || action === 'view' || action === 'mine') {
    player.send('\n' + tattoos.showPlayerTattoos(player));
    return;
  }

  if (action === 'get' || action === 'buy') {
    const tattooId = args[1]?.toLowerCase();

    if (!tattooId) {
      player.send(colors.error('Get which tattoo? Use "tattoo list" to see designs.'));
      return;
    }

    const result = tattoos.getTattoo(player, tattooId, context.playerDB);
    player.send('\n' + result.message);

    if (result.success) {
      player.send(colors.hint('Use "look at ' + player.username + '" to admire your new ink.'));
    }
    return;
  }

  if (action === 'remove') {
    const slot = args[1]?.toLowerCase();

    if (!slot) {
      player.send(colors.error('Remove tattoo from which body part?'));
      return;
    }

    const result = tattoos.removeTattoo(player, slot, context.playerDB);
    player.send('\n' + result.message);
    return;
  }

  player.send(colors.error('Usage: tattoo [list|show|get <design>|remove <slot>]'));
}

module.exports = {
  name: 'tattoo',
  aliases: ['ink', 'tattoos'],
  execute,
  help: {
    description: 'Visit the tattoo parlor to get permanent ink',
    usage: 'tattoo [list|show|get <design>|remove <slot>]',
    examples: [
      'tattoo list',
      'tattoo get dragon',
      'tattoo show',
      'tattoo remove arm'
    ]
  }
};
```

## Creating Your Own Modifiers

When creating new description modifier systems, follow these patterns:

### 1. Define Your Modifiers

```javascript
const MODIFIER_DEFINITIONS = {
  modifier_id: {
    name: 'Display Name',
    description: 'The text that appears in the player description',
    priority: 60,  // 0-100, higher = shows first
    // ... any other metadata your system needs
  }
};
```

### 2. Create Add/Remove Functions

```javascript
function addYourModifier(player, modifierId, playerDB) {
  const def = MODIFIER_DEFINITIONS[modifierId];

  PlayerDescriptionService.addDescriptionModifier(
    player,
    def.description,
    `yoursystem_${modifierId}`,  // Unique source prefix
    def.priority,
    playerDB
  );
}

function removeYourModifier(player, modifierId, playerDB) {
  PlayerDescriptionService.removeDescriptionModifier(
    player,
    `yoursystem_${modifierId}`,
    playerDB
  );
}
```

### 3. Add Helper Functions

```javascript
function hasYourModifier(player, modifierId) {
  return PlayerDescriptionService.hasDescriptionModifier(
    player,
    `yoursystem_${modifierId}`
  );
}

function listAvailable() {
  return Object.keys(MODIFIER_DEFINITIONS);
}
```

## Priority Guidelines

Use these priority ranges for consistency:

- **90-100**: World-altering effects, divine blessings, legendary achievements
- **70-89**: Guild membership, major organizational affiliations
- **50-69**: Tattoos, scars, permanent physical modifications
- **30-49**: Temporary magical effects, buffs, status conditions
- **10-29**: Minor cosmetic effects, jewelry, subtle details
- **0-9**: Background ambiance, very subtle traits

## Writing Style Tips

When writing description text:

1. **Use Second Person Perspective**: "their", "they", "them"
2. **Be Concise**: 1-2 sentences maximum
3. **Show, Don't Tell**: Describe what's visible, not abstract qualities
4. **Add Pratchett-Style Humor**: Subtle wit and clever observations
5. **Include Sensory Details**: Not just visual - smell, sound, etc.
6. **Reference World Lore**: Mention in-world locations, organizations
7. **Make It Memorable**: Players should enjoy reading these

### Good Examples

✓ "Ancient runes crawl across their forearms, pulsing with eldritch power. They say these tattoos were learned from the Shadowfen witches."

✓ "The crimson tabard of the Warriors Guild marks them as a trained combatant. The stains suggest it's not just for show."

✓ "A faint golden nimbus surrounds them, the mark of one who has performed truly heroic deeds. Bards will sing of this one."

### Bad Examples

✗ "They have a tattoo." (Too plain, no flavor)

✗ "This is a really powerful magic user with lots of experience." (Telling not showing)

✗ "Their stats are boosted by +5 strength from guild membership." (Too mechanical)

## Testing Your Modifiers

```javascript
// Test script
const PlayerDescriptionService = require('./src/systems/description/PlayerDescriptionService');
const yourSystem = require('./examples/description-modifiers/yourSystem');

// Create test player
const testPlayer = {
  username: 'testuser',
  level: 10,
  description: 'A test character',
  descriptionModifiers: [],
  inventory: []
};

// Add modifier
yourSystem.addYourModifier(testPlayer, 'test_modifier', null);

// Generate description
const desc = PlayerDescriptionService.generateDescription(testPlayer);
console.log(desc);

// Verify modifier appears
const hasIt = yourSystem.hasYourModifier(testPlayer, 'test_modifier');
console.log('Has modifier:', hasIt);

// Remove modifier
yourSystem.removeYourModifier(testPlayer, 'test_modifier', null);
```

## Notes

- Always pass `playerDB` for persistence in production
- Use consistent `source` naming: `{system}_{id}`
- Test both addition and removal
- Consider edge cases (multiple modifiers, conflicts, etc.)
- Document your priority choices
- Follow the writing style guide in the main documentation
