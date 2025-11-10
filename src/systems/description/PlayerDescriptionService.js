/**
 * PlayerDescriptionService
 *
 * Generates rich, narrative player descriptions for the "look" command.
 * Combines base descriptions, level tiers, equipped items, and modular modifiers
 * (guilds, tattoos, etc.) into cohesive, thematically appropriate text.
 *
 * Architecture:
 * - Base Description: Player-set description (via 'describe' command)
 * - Level Tier: Qualitative description based on level range
 * - Description Modifiers: Sentences added by game systems (guilds, tattoos, etc.)
 * - Equipment Display: Summary of visible equipped items
 *
 * Writing Style:
 * - Second person perspective ("You see...", "You notice...")
 * - Pratchett-inspired wit with atmospheric tension
 * - Vivid sensory details and subtle humor
 * - Clever wordplay and unexpected observations
 */

const colors = require('../../colors');
const EquipmentManager = require('../equipment/EquipmentManager');

/**
 * Level tier definitions
 * Maps level ranges to qualitative descriptions with thematic flair
 */
const LEVEL_TIERS = [
  {
    minLevel: 1,
    maxLevel: 3,
    title: 'a fresh-faced novice',
    description: 'They have that unmistakable look of someone who still believes in treasure maps and destiny. How adorable.',
    variants: [
      'a wide-eyed beginner',
      'an eager newcomer',
      'a hopeful greenhorn'
    ]
  },
  {
    minLevel: 4,
    maxLevel: 7,
    title: 'a promising adventurer',
    description: 'The initial shine of naivety has been dulled by a few harsh lessons, but the spark of ambition remains.',
    variants: [
      'an aspiring hero',
      'a determined explorer',
      'a capable newcomer'
    ]
  },
  {
    minLevel: 8,
    maxLevel: 12,
    title: 'a seasoned traveler',
    description: 'There\'s a confidence in their stance that comes from surviving things that would make lesser mortals whimper.',
    variants: [
      'a competent adventurer',
      'a tested warrior',
      'an experienced wanderer'
    ]
  },
  {
    minLevel: 13,
    maxLevel: 17,
    title: 'a veteran campaigner',
    description: 'The scars might be hidden, but you can see them in the way they assess every room for exits and threats.',
    variants: [
      'a hardened adventurer',
      'a battle-tested hero',
      'a formidable presence'
    ]
  },
  {
    minLevel: 18,
    maxLevel: 22,
    title: 'a renowned champion',
    description: 'Power radiates from them like heat from a forge. Even the air seems to take them seriously.',
    variants: [
      'a distinguished hero',
      'a celebrated warrior',
      'a legendary figure'
    ]
  },
  {
    minLevel: 23,
    maxLevel: 27,
    title: 'a legendary hero',
    description: 'They\'ve reached the level where common sense starts looking up at them from far below.',
    variants: [
      'a mythical champion',
      'an epic warrior',
      'a storied legend'
    ]
  },
  {
    minLevel: 28,
    maxLevel: 99,
    title: 'a living myth',
    description: 'Reality itself seems slightly uncertain around them, as if checking whether it needs their permission to continue existing.',
    variants: [
      'an unstoppable force',
      'a demigod among mortals',
      'a walking apocalypse'
    ]
  }
];

/**
 * Default base descriptions for players who haven't set one
 * Randomized to add variety to new players
 */
const DEFAULT_BASE_DESCRIPTIONS = [
  'A person of unremarkable appearance stands before you, the sort you might pass in the street without a second glance. Yet here they are, sword in hand, about to embark on something profoundly inadvisable.',
  'An individual whose most notable feature is their apparent determination to make "adventurer" a career choice. The universe hasn\'t crushed this optimism yet, but give it time.',
  'Someone who has clearly looked in a mirror, pronounced themselves "good enough," and set off to find their fortune. The jury is still out on whether fortune will return the favor.',
  'A figure who has somehow convinced themselves that walking into dark caves full of hostile creatures is a reasonable lifestyle. The statistics suggest otherwise, but hope springs eternal.',
  'An adventurer-shaped person who appears to be made of roughly equal parts courage, foolishness, and proteins. The exact ratio varies from moment to moment.',
];

class PlayerDescriptionService {
  /**
   * Generate a complete player description
   * @param {Object} player - The player object to describe
   * @param {Object} options - Options for description generation
   * @param {boolean} options.isSelf - Whether the viewer is the player themselves
   * @param {boolean} options.showEquipment - Whether to show equipped items (default: true)
   * @param {boolean} options.showLevel - Whether to show level tier (default: true)
   * @returns {string} Formatted player description with color codes
   */
  static generateDescription(player, options = {}) {
    const {
      isSelf = false,
      showEquipment = true,
      showLevel = true
    } = options;

    const lines = [];

    // Header: Player name with ghost indicator
    const header = this._generateHeader(player, isSelf);
    lines.push(header);
    lines.push(''); // Blank line for readability

    // Level tier description
    if (showLevel) {
      const levelInfo = this._getLevelTierDescription(player);
      if (levelInfo) {
        lines.push(colors.dim(`${levelInfo}`));
        lines.push('');
      }
    }

    // Base description
    const baseDesc = this._getBaseDescription(player);
    if (baseDesc) {
      lines.push(baseDesc);
      lines.push('');
    }

    // Description modifiers (guilds, tattoos, etc.)
    const modifiers = this._getDescriptionModifiers(player);
    if (modifiers.length > 0) {
      for (const modifier of modifiers) {
        lines.push(colors.cyan(modifier));
      }
      lines.push('');
    }

    // Ghost status (special case)
    if (player.isGhost) {
      const ghostDesc = isSelf
        ? 'Your form is translucent and ethereal, a pale echo of your former self.'
        : 'Their form is translucent and ethereal, barely visible in this world. Death has not been kind.';
      lines.push(colors.hint(ghostDesc));
      lines.push('');
    }

    // Equipped items
    if (showEquipment && !player.isGhost) {
      const equipmentDesc = this._generateEquipmentDescription(player);
      if (equipmentDesc) {
        lines.push(equipmentDesc);
      }
    }

    return '\n' + lines.join('\n');
  }

  /**
   * Generate the player name header
   * @private
   */
  static _generateHeader(player, isSelf) {
    let header = colors.playerName(player.getDisplayName());

    if (player.isGhost) {
      header += colors.hint(' (ghost)');
    }

    // Add level number in subtle color
    if (player.level > 1) {
      header += colors.dim(` [Level ${player.level}]`);
    }

    return header;
  }

  /**
   * Get level tier description for a player
   * @private
   */
  static _getLevelTierDescription(player) {
    const level = player.level || 1;
    const tier = LEVEL_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel);

    if (!tier) {
      return null;
    }

    // Use a variant 30% of the time for variety
    const useVariant = Math.random() < 0.3;
    const title = useVariant && tier.variants.length > 0
      ? tier.variants[Math.floor(Math.random() * tier.variants.length)]
      : tier.title;

    return `You see ${title}. ${tier.description}`;
  }

  /**
   * Get the player's base description
   * @private
   */
  static _getBaseDescription(player) {
    if (player.description && player.description.trim()) {
      return player.description;
    }

    // Use a random default description
    const randomIndex = Math.abs(this._hashString(player.username)) % DEFAULT_BASE_DESCRIPTIONS.length;
    return DEFAULT_BASE_DESCRIPTIONS[randomIndex];
  }

  /**
   * Get description modifiers from various game systems
   * @private
   */
  static _getDescriptionModifiers(player) {
    const modifiers = [];

    // Check if player has descriptionModifiers array
    if (!player.descriptionModifiers || !Array.isArray(player.descriptionModifiers)) {
      return modifiers;
    }

    // Each modifier should have: { text, source, priority }
    // Sort by priority (higher = shown first) and then by source
    const sortedModifiers = [...player.descriptionModifiers].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.source.localeCompare(b.source);
    });

    for (const modifier of sortedModifiers) {
      if (modifier.text && modifier.text.trim()) {
        modifiers.push(modifier.text);
      }
    }

    return modifiers;
  }

  /**
   * Generate equipment description
   * @private
   */
  static _generateEquipmentDescription(player) {
    const bySlot = EquipmentManager.getEquipmentBySlot(player);
    const visibleItems = [];

    // Weapons (visible and interesting)
    if (bySlot.main_hand) {
      visibleItems.push({
        category: 'wielding',
        item: bySlot.main_hand,
        slot: 'main_hand'
      });
    }

    if (bySlot.off_hand) {
      visibleItems.push({
        category: 'wielding',
        item: bySlot.off_hand,
        slot: 'off_hand'
      });
    }

    // Armor (chest and head are most visible)
    if (bySlot.chest) {
      visibleItems.push({
        category: 'wearing',
        item: bySlot.chest,
        slot: 'chest'
      });
    }

    if (bySlot.head) {
      visibleItems.push({
        category: 'wearing',
        item: bySlot.head,
        slot: 'head'
      });
    }

    if (bySlot.legs) {
      visibleItems.push({
        category: 'wearing',
        item: bySlot.legs,
        slot: 'legs'
      });
    }

    if (bySlot.feet) {
      visibleItems.push({
        category: 'wearing',
        item: bySlot.feet,
        slot: 'feet'
      });
    }

    if (bySlot.back) {
      visibleItems.push({
        category: 'wearing',
        item: bySlot.back,
        slot: 'back'
      });
    }

    // Jewelry (catch the eye)
    if (bySlot.neck) {
      visibleItems.push({
        category: 'wearing',
        item: bySlot.neck,
        slot: 'neck'
      });
    }

    if (!visibleItems.length) {
      return colors.dim('They appear to be traveling light. Very light. Perhaps dangerously light.');
    }

    const lines = [];

    // Group by category
    const wielding = visibleItems.filter(i => i.category === 'wielding');
    const wearing = visibleItems.filter(i => i.category === 'wearing');

    if (wielding.length > 0) {
      const weaponDescriptions = wielding.map(({item, slot}) => {
        const name = item.getDisplayName();
        const hand = slot === 'main_hand' ? 'their right hand' : 'their left hand';
        return `${colors.objectName(name)} in ${hand}`;
      });

      if (weaponDescriptions.length === 1) {
        lines.push(`They are wielding ${weaponDescriptions[0]}.`);
      } else {
        lines.push(`They are dual-wielding ${weaponDescriptions[0]} and ${weaponDescriptions[1]}.`);
      }
    }

    if (wearing.length > 0) {
      const armorDescriptions = wearing.map(({item}) => colors.objectName(item.getDisplayName()));

      if (armorDescriptions.length === 1) {
        lines.push(`They are wearing ${armorDescriptions[0]}.`);
      } else if (armorDescriptions.length === 2) {
        lines.push(`They are wearing ${armorDescriptions[0]} and ${armorDescriptions[1]}.`);
      } else {
        const last = armorDescriptions.pop();
        lines.push(`They are wearing ${armorDescriptions.join(', ')}, and ${last}.`);
      }
    }

    return colors.dim(lines.join(' '));
  }

  /**
   * Add a description modifier to a player
   * @param {Object} player - The player object
   * @param {string} text - The modifier text to add
   * @param {string} source - The source/category of the modifier (e.g., 'guild', 'tattoo')
   * @param {number} priority - Display priority (higher = shown first)
   * @param {Object} playerDB - PlayerDB instance for persistence
   */
  static addDescriptionModifier(player, text, source, priority = 50, playerDB = null) {
    if (!player.descriptionModifiers) {
      player.descriptionModifiers = [];
    }

    // Check if this source already has a modifier
    const existingIndex = player.descriptionModifiers.findIndex(m => m.source === source);

    const modifier = {
      text,
      source,
      priority,
      addedAt: Date.now()
    };

    if (existingIndex >= 0) {
      // Replace existing modifier
      player.descriptionModifiers[existingIndex] = modifier;
    } else {
      // Add new modifier
      player.descriptionModifiers.push(modifier);
    }

    // Persist to database if provided
    if (playerDB) {
      this._saveDescriptionModifiers(player, playerDB);
    }
  }

  /**
   * Remove a description modifier from a player
   * @param {Object} player - The player object
   * @param {string} source - The source/category to remove
   * @param {Object} playerDB - PlayerDB instance for persistence
   */
  static removeDescriptionModifier(player, source, playerDB = null) {
    if (!player.descriptionModifiers) {
      return;
    }

    player.descriptionModifiers = player.descriptionModifiers.filter(m => m.source !== source);

    // Persist to database if provided
    if (playerDB) {
      this._saveDescriptionModifiers(player, playerDB);
    }
  }

  /**
   * Check if a player has a specific description modifier
   * @param {Object} player - The player object
   * @param {string} source - The source/category to check
   * @returns {boolean}
   */
  static hasDescriptionModifier(player, source) {
    if (!player.descriptionModifiers) {
      return false;
    }
    return player.descriptionModifiers.some(m => m.source === source);
  }

  /**
   * Get a specific description modifier
   * @param {Object} player - The player object
   * @param {string} source - The source/category to get
   * @returns {Object|null}
   */
  static getDescriptionModifier(player, source) {
    if (!player.descriptionModifiers) {
      return null;
    }
    return player.descriptionModifiers.find(m => m.source === source) || null;
  }

  /**
   * Clear all description modifiers for a player
   * @param {Object} player - The player object
   * @param {Object} playerDB - PlayerDB instance for persistence
   */
  static clearDescriptionModifiers(player, playerDB = null) {
    player.descriptionModifiers = [];

    // Persist to database if provided
    if (playerDB) {
      this._saveDescriptionModifiers(player, playerDB);
    }
  }

  /**
   * Save description modifiers to database
   * @private
   */
  static _saveDescriptionModifiers(player, playerDB) {
    if (!playerDB || !player.username) {
      return;
    }

    const lowerUsername = player.username.toLowerCase();
    const playerData = playerDB.getPlayer(lowerUsername);

    if (playerData) {
      playerData.descriptionModifiers = player.descriptionModifiers || [];
      playerDB.save();
    }
  }

  /**
   * Simple string hash for deterministic randomization
   * @private
   */
  static _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Get level tier info for a specific level (useful for display/testing)
   * @param {number} level - The level to check
   * @returns {Object|null} Tier information
   */
  static getLevelTierInfo(level) {
    return LEVEL_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) || null;
  }
}

module.exports = PlayerDescriptionService;
