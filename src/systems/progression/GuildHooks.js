/**
 * Guild Hooks System
 *
 * Provides interface for guilds to customize level-up progression
 * Allows guilds to override stat choices and add custom bonuses
 *
 * Architecture Reference: COMBAT_XP_ARCHITECTURE.md Section 3.4
 */

/**
 * Base Guild Hook Interface
 * Guilds should implement this interface to customize progression
 */
class GuildLevelUpHook {
  constructor(guildName) {
    this.guildName = guildName;
  }

  /**
   * Handle stat choice for level-up (every 4th level)
   * Return true to override default player choice
   *
   * @param {Object} player - Player entity
   * @returns {boolean} True if handled, false to allow player choice
   */
  handleStatChoice(player) {
    // Default: allow player to choose
    return false;
  }

  /**
   * Apply guild-specific bonuses on level-up
   * Called for every level-up
   *
   * @param {Object} player - Player entity
   * @returns {Array<string>} Array of bonus descriptions for logging
   */
  applyLevelUpBonuses(player) {
    // Default: no bonuses
    return [];
  }

  /**
   * Grant guild-specific abilities at certain levels
   * @param {Object} player - Player entity
   */
  grantAbilities(player) {
    // Default: no abilities
  }

  /**
   * Get guild name
   * @returns {string} Guild name
   */
  getName() {
    return this.guildName;
  }
}

/**
 * Example: Warrior Guild Hook
 * Warriors get bonus HP and auto-assigned STR/CON increases
 */
class WarriorGuildHook extends GuildLevelUpHook {
  constructor() {
    super('Warrior');
  }

  handleStatChoice(player) {
    if (player.level % 4 === 0) {
      // Auto-assign to STR or CON (whichever is lower)
      if (player.str <= player.con) {
        player.str++;
        console.log(`${player.username}: Warrior guild auto-increased STR to ${player.str}`);
      } else {
        player.con++;
        console.log(`${player.username}: Warrior guild auto-increased CON to ${player.con}`);
      }
      return true; // Handled
    }
    return false;
  }

  applyLevelUpBonuses(player) {
    const bonuses = [];

    // Warriors get +2 bonus HP per level (in addition to standard +5)
    player.maxHp += 2;
    player.currentHp += 2;
    bonuses.push('+2 bonus HP (Warrior)');

    // At level 5, increase base damage
    if (player.level === 5) {
      bonuses.push('Warrior\'s Strength ability unlocked');
    }

    return bonuses;
  }

  grantAbilities(player) {
    // Grant specific abilities at certain levels
    if (player.level === 5) {
      // Grant "Power Attack" ability
      if (!player.abilities) player.abilities = [];
      if (!player.abilities.includes('power_attack')) {
        player.abilities.push('power_attack');
      }
    }

    if (player.level === 10) {
      // Grant "Cleave" ability
      if (!player.abilities) player.abilities = [];
      if (!player.abilities.includes('cleave')) {
        player.abilities.push('cleave');
      }
    }
  }
}

/**
 * Example: Mage Guild Hook
 * Mages get bonus mana and auto-assigned INT increases
 */
class MageGuildHook extends GuildLevelUpHook {
  constructor() {
    super('Mage');
  }

  handleStatChoice(player) {
    if (player.level % 4 === 0) {
      // Auto-assign to INT
      player.int++;
      console.log(`${player.username}: Mage guild auto-increased INT to ${player.int}`);
      return true; // Handled
    }
    return false;
  }

  applyLevelUpBonuses(player) {
    const bonuses = [];

    // Mages get +10 bonus mana per level
    player.maxResource += 10;
    player.resource += 10;
    bonuses.push('+10 bonus mana (Mage)');

    // Small HP penalty (-1 from standard)
    player.maxHp -= 1;
    player.currentHp = Math.min(player.currentHp, player.maxHp);
    bonuses.push('-1 HP (Mage penalty)');

    return bonuses;
  }

  grantAbilities(player) {
    if (player.level === 3) {
      if (!player.abilities) player.abilities = [];
      if (!player.abilities.includes('magic_missile')) {
        player.abilities.push('magic_missile');
      }
    }

    if (player.level === 7) {
      if (!player.abilities) player.abilities = [];
      if (!player.abilities.includes('fireball')) {
        player.abilities.push('fireball');
      }
    }
  }
}

/**
 * Example: Rogue Guild Hook
 * Rogues get bonus DEX and critical hit bonuses
 */
class RogueGuildHook extends GuildLevelUpHook {
  constructor() {
    super('Rogue');
  }

  handleStatChoice(player) {
    if (player.level % 4 === 0) {
      // Auto-assign to DEX or INT (for skills)
      if (player.dex <= player.int) {
        player.dex++;

        // Recalculate AC when DEX increases
        const { calculateArmorClass } = require('../../utils/modifiers');
        const armorBonus = player.equippedArmor ? player.equippedArmor.armorBonus : 0;
        player.armorClass = calculateArmorClass(player.dex, armorBonus);

        console.log(`${player.username}: Rogue guild auto-increased DEX to ${player.dex}`);
      } else {
        player.int++;
        console.log(`${player.username}: Rogue guild auto-increased INT to ${player.int}`);
      }
      return true;
    }
    return false;
  }

  applyLevelUpBonuses(player) {
    const bonuses = [];

    // Rogues get +5 bonus resource (for special moves)
    player.maxResource += 5;
    player.resource += 5;
    bonuses.push('+5 bonus energy (Rogue)');

    return bonuses;
  }

  grantAbilities(player) {
    if (player.level === 4) {
      if (!player.abilities) player.abilities = [];
      if (!player.abilities.includes('backstab')) {
        player.abilities.push('backstab');
      }
    }

    if (player.level === 8) {
      if (!player.abilities) player.abilities = [];
      if (!player.abilities.includes('evasion')) {
        player.abilities.push('evasion');
      }
    }
  }
}

/**
 * Guild Hook Registry
 * Maps guild IDs to their level-up hooks
 */
class GuildHookRegistry {
  constructor() {
    this.hooks = new Map();
  }

  /**
   * Register a guild hook
   * @param {string} guildId - Guild identifier
   * @param {GuildLevelUpHook} hook - Guild hook instance
   */
  register(guildId, hook) {
    if (!(hook instanceof GuildLevelUpHook)) {
      throw new Error('Hook must extend GuildLevelUpHook');
    }

    this.hooks.set(guildId, hook);
    console.log(`Registered guild hook: ${guildId} (${hook.getName()})`);
  }

  /**
   * Get hook for a guild
   * @param {string} guildId - Guild identifier
   * @returns {GuildLevelUpHook|null} Hook or null if not found
   */
  getHook(guildId) {
    return this.hooks.get(guildId) || null;
  }

  /**
   * Check if guild has custom hook
   * @param {string} guildId - Guild identifier
   * @returns {boolean} True if hook exists
   */
  hasHook(guildId) {
    return this.hooks.has(guildId);
  }

  /**
   * Get all registered guild IDs
   * @returns {Array<string>} Array of guild IDs
   */
  getRegisteredGuilds() {
    return Array.from(this.hooks.keys());
  }

  /**
   * Unregister a guild hook
   * @param {string} guildId - Guild identifier
   * @returns {boolean} True if removed
   */
  unregister(guildId) {
    return this.hooks.delete(guildId);
  }

  /**
   * Clear all hooks
   */
  clear() {
    this.hooks.clear();
  }
}

// Singleton instance
const guildHookRegistry = new GuildHookRegistry();

/**
 * Initialize default guild hooks
 * Call this at server startup
 */
function initializeDefaultGuildHooks() {
  // Register example guilds
  guildHookRegistry.register('warrior', new WarriorGuildHook());
  guildHookRegistry.register('mage', new MageGuildHook());
  guildHookRegistry.register('rogue', new RogueGuildHook());

  console.log('Default guild hooks initialized');
}

/**
 * Get guild hook for a player
 * @param {Object} player - Player entity
 * @returns {GuildLevelUpHook|null} Guild hook or null
 */
function getPlayerGuildHook(player) {
  if (!player.guildId) {
    return null;
  }

  return guildHookRegistry.getHook(player.guildId);
}

module.exports = {
  // Base class
  GuildLevelUpHook,

  // Example implementations
  WarriorGuildHook,
  MageGuildHook,
  RogueGuildHook,

  // Registry
  GuildHookRegistry,
  guildHookRegistry,

  // Utility
  initializeDefaultGuildHooks,
  getPlayerGuildHook
};
