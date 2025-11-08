/**
 * Equipment Manager
 *
 * Manages item equipment for players.
 * Enforces equipment slot rules, proficiency checks, and equipment restrictions.
 *
 * Features:
 * - Slot validation (weapon, armor, jewelry)
 * - Two-handed weapon rules
 * - Dual wield validation (light weapons only)
 * - Proficiency checking (allows equip with penalties)
 * - Armor DEX cap enforcement
 * - Attunement integration
 * - Bind-on-equip handling
 */

const config = require('../../config/itemsConfig');
const logger = require('../../logger');
const { EquipmentSlot, ItemType } = require('../../items/schemas/ItemTypes');
const AttunementManager = require('./AttunementManager');

class EquipmentManager {
  /**
   * Equip an item from player's inventory
   * @param {Object} player - Player object
   * @param {BaseItem} item - Item instance to equip
   * @param {string} [slot=null] - Specific slot to equip to (optional, auto-detect if null)
   * @returns {Object} {success: boolean, message: string, warnings?: Array<string>}
   */
  equipItem(player, item, slot = null) {
    if (!player || !item) {
      return { success: false, message: 'Invalid player or item' };
    }

    // Check if item is in player's inventory
    if (!player.inventory || !player.inventory.find(i => i.instanceId === item.instanceId)) {
      return { success: false, message: 'Item not in inventory' };
    }

    // Check if item is equippable
    if (!item.isEquippable) {
      return { success: false, message: `${item.name} cannot be equipped.` };
    }

    // Check if already equipped
    if (item.isEquipped) {
      return { success: false, message: `${item.name} is already equipped.` };
    }

    // Determine target slot (auto-detect or use specified)
    const targetSlot = slot || item.slot;
    if (!targetSlot) {
      return { success: false, message: `Cannot determine equipment slot for ${item.name}.` };
    }

    // Validate slot is valid
    const validation = this.validateSlot(player, item, targetSlot);
    if (!validation.valid) {
      return { success: false, message: validation.reason };
    }

    // Check attunement requirement
    if (item.requiresAttunement && !item.isAttuned) {
      return {
        success: false,
        message: `${item.name} requires attunement before it can be equipped. Use 'attune ${item.keywords[0]}' first.`
      };
    }

    // Check level requirement
    if (item.requiredLevel && player.level < item.requiredLevel) {
      return {
        success: false,
        message: `You must be level ${item.requiredLevel} to equip ${item.name}.`
      };
    }

    // Check class requirement
    if (item.requiredClass && !item.requiredClass.includes(player.class)) {
      return {
        success: false,
        message: `Only ${item.requiredClass.join(', ')} can equip ${item.name}.`
      };
    }

    // Handle two-handed weapons
    if (item.itemType === ItemType.WEAPON && item.weaponProperties && item.weaponProperties.isTwoHanded) {
      // Unequip both hands
      const unequipResult = this.unequipSlots(player, [EquipmentSlot.MAIN_HAND, EquipmentSlot.OFF_HAND]);
      if (!unequipResult.success) {
        return { success: false, message: unequipResult.message };
      }
    }

    // Check if slot is occupied and unequip
    const currentItem = this.getEquippedInSlot(player, targetSlot);
    if (currentItem) {
      const unequipResult = this.unequipItem(player, currentItem);
      if (!unequipResult.success) {
        return { success: false, message: `Cannot unequip ${currentItem.name}: ${unequipResult.message}` };
      }
    }

    // If equipping to main hand, check if off-hand has two-handed weapon
    if (targetSlot === EquipmentSlot.MAIN_HAND || targetSlot === EquipmentSlot.OFF_HAND) {
      const otherSlot = targetSlot === EquipmentSlot.MAIN_HAND ? EquipmentSlot.OFF_HAND : EquipmentSlot.MAIN_HAND;
      const otherItem = this.getEquippedInSlot(player, otherSlot);

      if (otherItem && otherItem.weaponProperties && otherItem.weaponProperties.isTwoHanded) {
        const unequipResult = this.unequipItem(player, otherItem);
        if (!unequipResult.success) {
          return { success: false, message: `Cannot unequip two-handed ${otherItem.name}` };
        }
      }
    }

    // Validate dual wield rules if equipping to off-hand
    if (targetSlot === EquipmentSlot.OFF_HAND && item.itemType === ItemType.WEAPON) {
      const mainHand = this.getEquippedInSlot(player, EquipmentSlot.MAIN_HAND);

      // Only check dual wield rules if there's a weapon in main hand
      if (mainHand && mainHand.itemType === ItemType.WEAPON && config.dualWield.requiresLightWeapons) {
        // Check if this weapon is light
        if (!item.weaponProperties || !item.weaponProperties.isLight) {
          return { success: false, message: 'Only light weapons can be dual-wielded.' };
        }

        // Check if main hand weapon is light
        if (!mainHand.weaponProperties || !mainHand.weaponProperties.isLight) {
          return { success: false, message: 'Main hand weapon must also be light for dual wielding.' };
        }
      }
    }

    // Call item's onEquip hook
    const equipHookResult = item.onEquip(player);
    if (!equipHookResult) {
      return { success: false, message: `${item.name} cannot be equipped right now.` };
    }

    // Update item state
    item.isEquipped = true;
    item.equippedSlot = targetSlot;
    item.modifiedAt = Date.now();

    logger.log(`Player ${player.username} equipped ${item.name} to ${targetSlot}`);

    // Recalculate player stats with new equipment (includes AC and HP)
    this.recalculatePlayerStats(player);

    // Collect warnings
    const warnings = [];

    // Check proficiency and add warning if not proficient
    const proficiency = this.checkProficiency(player, item);
    if (!proficiency.isProficient) {
      warnings.push(proficiency.warning);
    }

    // Check armor strength requirement
    if (item.armorProperties && item.armorProperties.strengthRequirement) {
      const playerStr = player.str || 10;
      if (playerStr < item.armorProperties.strengthRequirement) {
        warnings.push(`You struggle under the weight (requires ${item.armorProperties.strengthRequirement} STR, you have ${playerStr}).`);
      }
    }

    return {
      success: true,
      message: `You equip ${item.name}.`,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Unequip an item to player's inventory
   * @param {Object} player - Player object
   * @param {BaseItem} item - Item instance to unequip
   * @returns {Object} {success: boolean, message: string}
   */
  unequipItem(player, item) {
    if (!player || !item) {
      return { success: false, message: 'Invalid player or item' };
    }

    // Check if item is equipped
    if (!item.isEquipped) {
      return { success: false, message: `${item.name} is not equipped.` };
    }

    // Call item's onUnequip hook
    const unequipHookResult = item.onUnequip(player);
    if (!unequipHookResult) {
      return { success: false, message: `${item.name} cannot be unequipped right now.` };
    }

    // Update item state
    const previousSlot = item.equippedSlot;
    item.isEquipped = false;
    item.equippedSlot = null;
    item.modifiedAt = Date.now();

    logger.log(`Player ${player.username} unequipped ${item.name} from ${previousSlot}`);

    // Recalculate player stats without this equipment
    this.recalculatePlayerStats(player);

    return {
      success: true,
      message: `You unequip ${item.name}.`
    };
  }

  /**
   * Unequip all items in specified slots
   * @param {Object} player - Player object
   * @param {Array<string>} slots - Array of slot names
   * @returns {Object} {success: boolean, message?: string, unequippedItems?: Array}
   */
  unequipSlots(player, slots) {
    const unequippedItems = [];

    for (const slot of slots) {
      const item = this.getEquippedInSlot(player, slot);
      if (item) {
        const result = this.unequipItem(player, item);
        if (!result.success) {
          return { success: false, message: result.message };
        }
        unequippedItems.push(item);
      }
    }

    return { success: true, unequippedItems };
  }

  /**
   * Validate that an item can be equipped to a specific slot
   * @param {Object} player - Player object
   * @param {BaseItem} item - Item to validate
   * @param {string} slot - Target equipment slot
   * @returns {Object} {valid: boolean, reason?: string}
   */
  validateSlot(player, item, slot) {
    // Check if slot exists in configuration
    const allSlots = [
      ...config.slots.weapon,
      ...config.slots.armor,
      ...config.slots.jewelry
    ];

    if (!allSlots.includes(slot)) {
      return { valid: false, reason: `Invalid equipment slot: ${slot}` };
    }

    // Check if item's type matches slot category
    // For weapons, allow main_hand or off_hand (regardless of item's designated slot)
    if (item.itemType === ItemType.WEAPON) {
      if (slot !== EquipmentSlot.MAIN_HAND && slot !== EquipmentSlot.OFF_HAND) {
        return { valid: false, reason: 'Weapons can only be equipped in weapon slots' };
      }
      // Weapons can go in either hand, no further validation needed
    } else if (item.itemType === ItemType.ARMOR) {
      // Armor must go in designated slot
      if (item.slot !== slot) {
        return { valid: false, reason: `${item.name} must be equipped in the ${item.slot} slot` };
      }
    } else {
      // Other equippable items (jewelry) must match their designated slot
      if (item.slot !== slot) {
        return { valid: false, reason: `${item.name} cannot be equipped in the ${slot} slot` };
      }
    }

    return { valid: true };
  }

  /**
   * Check if player is proficient with an item
   * @param {Object} player - Player object
   * @param {BaseItem} item - Item to check
   * @returns {Object} {isProficient: boolean, penalty?: number, warning?: string}
   */
  checkProficiency(player, item) {
    // Initialize proficiencies if not present (for backward compatibility)
    if (!player.proficiencies) {
      player.proficiencies = this.getDefaultProficiencies(player);
    }

    if (item.itemType === ItemType.WEAPON && item.weaponProperties) {
      // Check weapon proficiency
      const weaponClass = item.weaponProperties.weaponClass;
      const weaponProfs = player.proficiencies.weapons || [];

      // Check if player is proficient with this weapon class or 'all_weapons'
      // Handle category proficiencies (simple_weapons, martial_weapons)
      const isProficient = weaponProfs.includes(weaponClass) ||
                          weaponProfs.includes('all_weapons') ||
                          (weaponProfs.includes('simple_weapons') && weaponClass && weaponClass.includes('simple')) ||
                          (weaponProfs.includes('martial_weapons') && weaponClass && weaponClass.includes('martial')) ||
                          (weaponProfs.includes('simple_melee') && weaponClass === 'simple_melee') ||
                          (weaponProfs.includes('simple_ranged') && weaponClass === 'simple_ranged') ||
                          (weaponProfs.includes('martial_melee') && weaponClass === 'martial_melee') ||
                          (weaponProfs.includes('martial_ranged') && weaponClass === 'martial_ranged');

      if (!isProficient) {
        const penalty = config.proficiency.weaponPenalty;
        return {
          isProficient: false,
          penalty: penalty,
          warning: `You are not proficient with this weapon (${penalty} to attack rolls).`
        };
      }
    }

    if (item.itemType === ItemType.ARMOR && item.armorProperties) {
      // Check armor proficiency
      const armorClass = item.armorProperties.armorClass || 'light';
      const armorProfs = player.proficiencies.armor || [];

      // Check if player is proficient with this armor class or 'all_armor'
      const isProficient = armorProfs.includes(armorClass) ||
                          armorProfs.includes('all_armor');

      if (!isProficient) {
        const penalty = config.proficiency.armorPenalty[armorClass] || 0;

        if (penalty !== 0) {
          return {
            isProficient: false,
            penalty: penalty,
            warning: `You are not proficient with ${armorClass} armor (${penalty} to attack rolls).`
          };
        }
      }
    }

    return { isProficient: true };
  }

  /**
   * Get default proficiencies based on player class
   * @param {Object} player - Player object
   * @returns {Object} {weapons: Array<string>, armor: Array<string>}
   */
  getDefaultProficiencies(player) {
    // Martial weapon types (for proficiency checking)
    const martialWeapons = ['swords', 'axes', 'polearms', 'martial_melee', 'martial_ranged'];
    const simpleWeapons = ['simple_melee', 'simple_ranged', 'daggers', 'clubs', 'staves'];

    // Default proficiencies by class (D&D 5e-inspired)
    const proficienciesByClass = {
      fighter: {
        weapons: [...simpleWeapons, ...martialWeapons],
        armor: ['light', 'medium', 'heavy']
      },
      warrior: {
        weapons: [...simpleWeapons, ...martialWeapons],
        armor: ['light', 'medium', 'heavy']
      },
      rogue: {
        weapons: [...simpleWeapons],
        armor: ['light']
      },
      wizard: {
        weapons: [], // Wizards have very limited weapon proficiency in D&D 5e (only specific simple weapons like daggers, darts)
        armor: []
      },
      mage: {
        weapons: [],
        armor: []
      },
      cleric: {
        weapons: [...simpleWeapons],
        armor: ['light', 'medium']
      },
      ranger: {
        weapons: [...simpleWeapons, ...martialWeapons],
        armor: ['light', 'medium']
      },
      monk: {
        weapons: [...simpleWeapons],
        armor: []
      },
      barbarian: {
        weapons: [...simpleWeapons, ...martialWeapons],
        armor: ['light', 'medium']
      }
    };

    const playerClass = (player.class || 'fighter').toLowerCase();
    const defaultProfs = proficienciesByClass[playerClass] || proficienciesByClass.fighter;

    return {
      weapons: [...defaultProfs.weapons],
      armor: [...defaultProfs.armor]
    };
  }

  /**
   * Get item equipped in a specific slot
   * @param {Object} player - Player object
   * @param {string} slot - Equipment slot name
   * @returns {BaseItem|null} Equipped item or null
   */
  getEquippedInSlot(player, slot) {
    if (!player || !player.inventory) {
      return null;
    }

    return player.inventory.find(item => item.isEquipped && item.equippedSlot === slot) || null;
  }

  /**
   * Get all equipped items
   * @param {Object} player - Player object
   * @returns {Array<BaseItem>} Array of equipped items
   */
  getEquippedItems(player) {
    if (!player || !player.inventory) {
      return [];
    }

    return player.inventory.filter(item => item.isEquipped);
  }

  /**
   * Get equipped items organized by slot
   * @param {Object} player - Player object
   * @returns {Object} Map of slot -> item
   */
  getEquipmentBySlot(player) {
    const equipment = {};

    // Initialize all slots as empty
    const allSlots = [
      ...config.slots.weapon,
      ...config.slots.armor,
      ...config.slots.jewelry
    ];

    for (const slot of allSlots) {
      equipment[slot] = null;
    }

    // Fill in equipped items
    const equippedItems = this.getEquippedItems(player);
    for (const item of equippedItems) {
      if (item.equippedSlot) {
        equipment[item.equippedSlot] = item;
      }
    }

    return equipment;
  }

  /**
   * Calculate total armor class for player
   * @param {Object} player - Player object
   * @returns {Object} {baseAC: number, dexBonus: number, totalAC: number, breakdown: Array}
   */
  calculateAC(player) {
    if (!player) {
      return { baseAC: 10, dexBonus: 0, totalAC: 10, breakdown: [] };
    }

    const breakdown = [];
    let baseAC = 10; // Default unarmored AC
    let dexCap = Infinity;
    let magicalBonus = 0;
    let armorPiece = null;

    // Find armor (chest slot provides base AC)
    const chestArmor = this.getEquippedInSlot(player, EquipmentSlot.CHEST);
    if (chestArmor && chestArmor.armorProperties) {
      armorPiece = chestArmor;
      baseAC = chestArmor.armorProperties.baseAC || 10;
      dexCap = chestArmor.getMaxDexBonus ? chestArmor.getMaxDexBonus() : Infinity;

      // Check attunement before applying magical bonuses
      const isAttuned = !chestArmor.requiresAttunement || chestArmor.isAttuned;
      if (isAttuned && chestArmor.armorProperties.magicalACBonus) {
        magicalBonus += chestArmor.armorProperties.magicalACBonus;
      }

      breakdown.push(`Base AC ${baseAC} (${chestArmor.name})`);
    } else {
      breakdown.push('Base AC 10 (unarmored)');
    }

    // Calculate DEX bonus (capped by armor)
    const playerDex = player.dex || 10;
    const dexModifier = Math.floor((playerDex - 10) / 2);
    const cappedDexBonus = Math.max(0, Math.min(dexModifier, dexCap));

    if (cappedDexBonus > 0) {
      breakdown.push(`+${cappedDexBonus} DEX bonus`);
      if (dexCap !== Infinity && dexModifier > dexCap) {
        breakdown.push(`(capped at +${dexCap} by armor)`);
      }
    }

    // Add magical bonuses from other armor pieces (shields, jewelry with bonusAC)
    const equippedItems = this.getEquippedItems(player);
    for (const item of equippedItems) {
      if (item.instanceId === armorPiece?.instanceId) {
        continue; // Already counted
      }

      // Check attunement requirement before applying bonuses
      const isAttuned = !item.requiresAttunement || item.isAttuned;
      if (!isAttuned) {
        continue;
      }

      // Armor pieces with magical AC bonus
      if (item.armorProperties && item.armorProperties.magicalACBonus) {
        magicalBonus += item.armorProperties.magicalACBonus;
        breakdown.push(`+${item.armorProperties.magicalACBonus} AC (${item.name})`);
      }

      // Jewelry with bonus AC (rings of protection)
      if (item.bonusAC && item.bonusAC > 0) {
        magicalBonus += item.bonusAC;
        breakdown.push(`+${item.bonusAC} AC (${item.name})`);
      }
    }

    // Add magical AC bonus
    if (magicalBonus > 0 && !breakdown.some(b => b.includes('magical'))) {
      breakdown.push(`+${magicalBonus} magical bonus`);
    }

    const totalAC = baseAC + cappedDexBonus + magicalBonus;

    return {
      baseAC,
      dexBonus: cappedDexBonus,
      magicalBonus,
      totalAC,
      breakdown
    };
  }

  /**
   * Get attack bonus from equipped weapon
   * @param {Object} player - Player object
   * @param {string} hand - 'main_hand' or 'off_hand'
   * @returns {Object} {bonus: number, proficient: boolean, weapon: BaseItem|null}
   */
  getWeaponAttackBonus(player, hand = 'main_hand') {
    const slot = hand === 'off_hand' ? EquipmentSlot.OFF_HAND : EquipmentSlot.MAIN_HAND;
    const weapon = this.getEquippedInSlot(player, slot);

    if (!weapon || weapon.itemType !== ItemType.WEAPON) {
      return { bonus: 0, proficient: true, weapon: null };
    }

    const proficiency = this.checkProficiency(player, weapon);
    const weaponBonus = weapon.getAttackBonus ? weapon.getAttackBonus(proficiency.isProficient) : 0;

    return {
      bonus: weaponBonus,
      proficient: proficiency.isProficient,
      weapon: weapon
    };
  }

  /**
   * Check if player is dual wielding
   * @param {Object} player - Player object
   * @returns {boolean} True if dual wielding
   */
  isDualWielding(player) {
    const mainHand = this.getEquippedInSlot(player, EquipmentSlot.MAIN_HAND);
    const offHand = this.getEquippedInSlot(player, EquipmentSlot.OFF_HAND);

    return !!(mainHand && offHand &&
              mainHand.itemType === ItemType.WEAPON &&
              offHand.itemType === ItemType.WEAPON);
  }

  /**
   * Get equipment statistics
   * @param {Object} player - Player object
   * @returns {Object} Equipment statistics
   */
  getEquipmentStats(player) {
    const equipped = this.getEquippedItems(player);
    const bySlot = this.getEquipmentBySlot(player);

    // Count slots used by category
    const weaponSlots = config.slots.weapon.filter(slot => bySlot[slot] !== null).length;
    const armorSlots = config.slots.armor.filter(slot => bySlot[slot] !== null).length;
    const jewelrySlots = config.slots.jewelry.filter(slot => bySlot[slot] !== null).length;

    // Calculate total stat modifiers
    const statMods = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    for (const item of equipped) {
      if (item.isIdentified && item.statModifiers) {
        for (const stat in item.statModifiers) {
          statMods[stat] = (statMods[stat] || 0) + item.statModifiers[stat];
        }
      }
    }

    return {
      totalEquipped: equipped.length,
      weaponSlots,
      armorSlots,
      jewelrySlots,
      statModifiers: statMods,
      armorClass: this.calculateAC(player),
      isDualWielding: this.isDualWielding(player)
    };
  }

  /**
   * Get formatted equipment display for a player
   * @param {Object} player - Player object
   * @returns {string} Formatted equipment text
   */
  getEquipmentDisplay(player) {
    const bySlot = this.getEquipmentBySlot(player);
    const lines = [];

    lines.push('=== Equipment ===');

    // Weapons
    lines.push('\nWeapons:');
    for (const slot of config.slots.weapon) {
      const item = bySlot[slot];
      const slotName = slot.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (item) {
        lines.push(`  ${slotName}: ${item.getDisplayName()}`);
      } else {
        lines.push(`  ${slotName}: (empty)`);
      }
    }

    // Armor
    lines.push('\nArmor:');
    for (const slot of config.slots.armor) {
      const item = bySlot[slot];
      const slotName = slot.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (item) {
        lines.push(`  ${slotName}: ${item.getDisplayName()}`);
      } else {
        lines.push(`  ${slotName}: (empty)`);
      }
    }

    // Jewelry
    lines.push('\nJewelry:');
    for (const slot of config.slots.jewelry) {
      const item = bySlot[slot];
      const slotName = slot.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (item) {
        lines.push(`  ${slotName}: ${item.getDisplayName()}`);
      } else {
        lines.push(`  ${slotName}: (empty)`);
      }
    }

    // AC summary
    const ac = this.calculateAC(player);
    lines.push(`\nArmor Class: ${ac.totalAC}`);

    return lines.join('\n');
  }

  /**
   * Calculate total stat bonuses from all equipped items
   * @param {Object} player - Player object
   * @returns {Object} Stat bonuses {strength, dexterity, constitution, intelligence, wisdom, charisma}
   */
  calculateEquipmentStatBonuses(player) {
    const bonuses = {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0
    };

    if (!player.inventory) {
      return bonuses;
    }

    // Sum up stat bonuses from all equipped items
    for (const item of player.inventory) {
      if (!item.isEquipped) continue;

      // Check attunement requirement
      // Items requiring attunement only provide bonuses when attuned
      if (item.requiresAttunement && !item.isAttuned) {
        continue;
      }

      // Apply stat bonuses
      if (item.statModifiers) {
        for (const [stat, value] of Object.entries(item.statModifiers)) {
          if (bonuses.hasOwnProperty(stat)) {
            bonuses[stat] += value;
          }
        }
      }
    }

    return bonuses;
  }

  /**
   * Recalculate and update player's effective stats from base stats + equipment bonuses
   * @param {Object} player - Player object with baseStats property
   * @param {Object} playerDB - PlayerDB instance (optional, for persistence)
   */
  recalculatePlayerStats(player, playerDB = null) {
    // Initialize baseStats if not present (first time)
    if (!player.baseStats) {
      player.baseStats = {
        strength: player.stats?.strength ?? player.strength ?? 10,
        dexterity: player.stats?.dexterity ?? player.dexterity ?? 10,
        constitution: player.stats?.constitution ?? player.constitution ?? 10,
        intelligence: player.stats?.intelligence ?? player.intelligence ?? 10,
        wisdom: player.stats?.wisdom ?? player.wisdom ?? 10,
        charisma: player.stats?.charisma ?? player.charisma ?? 10
      };
    }

    // Calculate equipment bonuses
    const equipmentBonuses = this.calculateEquipmentStatBonuses(player);

    // Calculate effective stats (base + equipment)
    player.stats = {
      strength: player.baseStats.strength + equipmentBonuses.strength,
      dexterity: player.baseStats.dexterity + equipmentBonuses.dexterity,
      constitution: player.baseStats.constitution + equipmentBonuses.constitution,
      intelligence: player.baseStats.intelligence + equipmentBonuses.intelligence,
      wisdom: player.baseStats.wisdom + equipmentBonuses.wisdom,
      charisma: player.baseStats.charisma + equipmentBonuses.charisma
    };

    // Update individual properties (using short names for combat system compatibility)
    // Combat system uses: str, dex, con, int, wis, cha (see CombatStats.js:25-30)
    player.str = player.stats.strength;
    player.dex = player.stats.dexterity;
    player.con = player.stats.constitution;
    player.int = player.stats.intelligence;
    player.wis = player.stats.wisdom;
    player.cha = player.stats.charisma;

    // Store equipment bonuses for display
    player.equipmentBonuses = equipmentBonuses;

    // Recalculate and update armor class
    const acResult = this.calculateAC(player);
    player.armorClass = acResult.totalAC;

    // Update max HP based on CON modifier
    const conModifier = Math.floor((player.con - 10) / 2);
    const baseHp = 10 + (player.level - 1) * 5;
    const newMaxHp = baseHp + (conModifier * player.level);

    // Update max HP, but don't exceed current if it changed
    if (newMaxHp !== player.maxHp) {
      const hpPercent = player.currentHp / player.maxHp;
      player.maxHp = newMaxHp;
      player.currentHp = Math.min(Math.floor(newMaxHp * hpPercent), newMaxHp);
    }

    // Aggregate resistances from all equipped items
    // D&D 5e: Resistances stack multiplicatively (e.g., 0.8 * 0.8 = 0.64 = 36% reduction)
    // Cap at 75% resistance (0.25 multiplier minimum) per D&D 5e rules
    const resistances = {
      physical: 1.0,
      fire: 1.0,
      ice: 1.0,
      lightning: 1.0,
      poison: 1.0,
      necrotic: 1.0,
      radiant: 1.0,
      psychic: 1.0
    };

    for (const item of player.inventory) {
      if (item.isEquipped && item.resistances) {
        for (const [dmgType, multiplier] of Object.entries(item.resistances)) {
          if (resistances.hasOwnProperty(dmgType)) {
            // Stack multiplicatively (e.g., two 20% resist items = 0.8 * 0.8 = 0.64 = 36% resist)
            resistances[dmgType] *= multiplier;

            // Cap at 75% resistance (0.25 multiplier) per D&D 5e balance
            resistances[dmgType] = Math.max(0.25, resistances[dmgType]);
          }
        }
      }
    }

    player.resistances = resistances;

    // Log resistance changes for debugging
    const activeResistances = Object.entries(resistances)
      .filter(([type, mult]) => mult < 1.0)
      .map(([type, mult]) => `${type}: ${Math.round((1-mult)*100)}%`);

    logger.log(`Recalculated ${player.username} stats: STR ${player.str} (${equipmentBonuses.strength >= 0 ? '+' : ''}${equipmentBonuses.strength}), DEX ${player.dex} (${equipmentBonuses.dexterity >= 0 ? '+' : ''}${equipmentBonuses.dexterity}), CON ${player.con} (${equipmentBonuses.constitution >= 0 ? '+' : ''}${equipmentBonuses.constitution}), AC ${player.armorClass}, MaxHP ${player.maxHp}${activeResistances.length > 0 ? `, Resist: ${activeResistances.join(', ')}` : ''}`);

    // CRITICAL FIX: Save player state to database after stat changes
    // This ensures equipment bonuses and stat changes persist across server restarts
    if (playerDB && typeof playerDB.savePlayer === 'function') {
      playerDB.savePlayer(player);
    }
  }
}

// Export singleton instance
module.exports = new EquipmentManager();
