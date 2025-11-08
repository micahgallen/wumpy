/**
 * Dice Rolling Utilities
 *
 * Provides D&D-style dice rolling with validation and parsing
 * Supports formats like "1d6", "2d8+3", "1d20-2"
 */

/**
 * Parse a dice string into components
 * @param {string} dice - Dice notation (e.g., "1d6", "2d8+3")
 * @returns {Object|null} Parsed dice components or null if invalid
 * @property {number} count - Number of dice to roll
 * @property {number} sides - Number of sides per die
 * @property {number} modifier - Bonus or penalty to add
 */
function parseDiceString(dice) {
  if (typeof dice !== 'string') {
    console.error(`Invalid dice string type: ${typeof dice}`);
    return null;
  }

  // Pattern: XdY or XdY+Z or XdY-Z
  const match = dice.match(/^(\d+)d(\d+)([+\-]\d+)?$/);
  if (!match) {
    console.error(`Invalid dice string format: ${dice}`);
    return null;
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  // Validate ranges (prevent abuse)
  if (count < 1 || count > 100) {
    console.error(`Dice count out of range (1-100): ${count}`);
    return null;
  }

  if (sides < 2 || sides > 100) {
    console.error(`Dice sides out of range (2-100): ${sides}`);
    return null;
  }

  if (Math.abs(modifier) > 1000) {
    console.error(`Dice modifier out of range (-1000 to +1000): ${modifier}`);
    return null;
  }

  return { count, sides, modifier };
}

/**
 * Roll a single die with specified number of sides
 * @param {number} sides - Number of sides on the die
 * @returns {number} Random number between 1 and sides (inclusive)
 */
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll a d20 (most common in D&D)
 * @returns {number} Random number between 1 and 20
 */
function rollD20() {
  return rollDie(20);
}

/**
 * Roll multiple dice and sum the results
 * @param {string} diceString - Dice notation (e.g., "2d6+3")
 * @returns {number} Total roll result
 */
function rollDice(diceString) {
  const parsed = parseDiceString(diceString);
  if (!parsed) {
    console.error(`Failed to parse dice string: ${diceString}, returning 0`);
    return 0;
  }

  let total = 0;
  for (let i = 0; i < parsed.count; i++) {
    total += rollDie(parsed.sides);
  }

  total += parsed.modifier;
  return total;
}

/**
 * Roll damage dice with optional critical hit (doubles dice count)
 * D&D 5e: Critical hits double the DICE rolled, NOT the modifiers
 * @param {string} damageDice - Damage dice notation (e.g., "1d6")
 * @param {boolean} isCritical - Whether this is a critical hit
 * @returns {number} Total damage (minimum 1)
 */
function rollDamage(damageDice, isCritical = false) {
  const parsed = parseDiceString(damageDice);
  if (!parsed) {
    console.error(`Failed to parse damage dice: ${damageDice}, returning 1`);
    return 1;
  }

  let total = 0;

  // Normal dice roll
  for (let i = 0; i < parsed.count; i++) {
    total += rollDie(parsed.sides);
  }

  // Critical: roll dice AGAIN (not the modifier)
  if (isCritical) {
    for (let i = 0; i < parsed.count; i++) {
      total += rollDie(parsed.sides);
    }
  }

  // Add modifier ONCE (not doubled on crit)
  total += parsed.modifier;

  // Minimum 1 damage (D&D 5e rule)
  return Math.max(1, total);
}

/**
 * Roll with advantage (roll twice, take higher)
 * @returns {Object} Roll results and chosen value
 * @property {number[]} rolls - Both d20 rolls
 * @property {number} result - Higher of the two rolls
 */
function rollWithAdvantage() {
  const roll1 = rollD20();
  const roll2 = rollD20();
  const result = Math.max(roll1, roll2);

  return {
    rolls: [roll1, roll2],
    result: result
  };
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @returns {Object} Roll results and chosen value
 * @property {number[]} rolls - Both d20 rolls
 * @property {number} result - Lower of the two rolls
 */
function rollWithDisadvantage() {
  const roll1 = rollD20();
  const roll2 = rollD20();
  const result = Math.min(roll1, roll2);

  return {
    rolls: [roll1, roll2],
    result: result
  };
}

/**
 * Roll an attack with advantage/disadvantage/normal
 * @param {string} advantageType - 'advantage', 'disadvantage', or 'normal'
 * @returns {Object} Attack roll details
 * @property {number[]} rolls - Array of d20 rolls (1 or 2)
 * @property {number} natural - The chosen natural roll (before modifiers)
 * @property {number} total - The natural roll (modifiers applied separately)
 */
function rollAttack(advantageType = 'normal') {
  if (advantageType === 'advantage') {
    const { rolls, result } = rollWithAdvantage();
    return {
      rolls: rolls,
      natural: result,
      total: result
    };
  } else if (advantageType === 'disadvantage') {
    const { rolls, result } = rollWithDisadvantage();
    return {
      rolls: rolls,
      natural: result,
      total: result
    };
  } else {
    // Normal roll
    const roll = rollD20();
    return {
      rolls: [roll],
      natural: roll,
      total: roll
    };
  }
}

/**
 * Validate a dice string without rolling
 * @param {string} dice - Dice notation to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidDiceString(dice) {
  return parseDiceString(dice) !== null;
}

/**
 * Get average value of a dice roll (useful for balance calculations)
 * @param {string} diceString - Dice notation
 * @returns {number} Average roll value
 */
function getAverageDiceValue(diceString) {
  const parsed = parseDiceString(diceString);
  if (!parsed) {
    return 0;
  }

  // Average of a die = (sides + 1) / 2
  const averagePerDie = (parsed.sides + 1) / 2;
  return (averagePerDie * parsed.count) + parsed.modifier;
}

module.exports = {
  parseDiceString,
  rollDie,
  rollD20,
  rollDice,
  rollDamage,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollAttack,
  isValidDiceString,
  getAverageDiceValue
};
