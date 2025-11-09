/**
 * Command Registry
 * Central registry for command handlers with support for aliases, guards, and metadata
 */

const logger = require('../logger');

/**
 * Command registry storage
 * - commands: Map<name, descriptor>
 * - aliases: Map<alias, commandName>
 */
const commands = new Map();
const aliases = new Map();

/**
 * Register a command with the registry
 * @param {Object} descriptor - Command descriptor
 * @param {string} descriptor.name - Primary command name
 * @param {Array<string>} [descriptor.aliases=[]] - Array of command aliases
 * @param {Function} descriptor.execute - Command handler function
 * @param {Function} [descriptor.guard] - Optional guard function (returns {allowed: bool, reason: string})
 * @param {Object} [descriptor.help] - Optional help metadata
 * @throws {Error} If descriptor is invalid or command name conflicts
 */
function registerCommand(descriptor) {
  // Validate descriptor
  if (!descriptor || typeof descriptor !== 'object') {
    throw new Error('Command descriptor must be an object');
  }

  if (!descriptor.name || typeof descriptor.name !== 'string') {
    throw new Error('Command descriptor must have a string "name" property');
  }

  if (!descriptor.execute || typeof descriptor.execute !== 'function') {
    throw new Error('Command descriptor must have a function "execute" property');
  }

  const name = descriptor.name.toLowerCase();

  // Check for name conflicts
  if (commands.has(name)) {
    throw new Error(`Command "${name}" is already registered`);
  }

  if (aliases.has(name)) {
    throw new Error(`Command name "${name}" conflicts with existing alias`);
  }

  // Store the command descriptor
  commands.set(name, {
    name,
    execute: descriptor.execute,
    guard: descriptor.guard || null,
    help: descriptor.help || null,
    aliases: descriptor.aliases || []
  });

  // Register aliases
  if (descriptor.aliases && Array.isArray(descriptor.aliases)) {
    for (const alias of descriptor.aliases) {
      const normalizedAlias = alias.toLowerCase();

      // Check for alias conflicts
      if (commands.has(normalizedAlias)) {
        throw new Error(`Alias "${normalizedAlias}" conflicts with existing command name`);
      }

      if (aliases.has(normalizedAlias)) {
        throw new Error(`Alias "${normalizedAlias}" is already registered`);
      }

      aliases.set(normalizedAlias, name);
    }
  }

  logger.debug(`Registered command: ${name}` + (descriptor.aliases && descriptor.aliases.length > 0 ? ` (aliases: ${descriptor.aliases.join(', ')})` : ''));
}

/**
 * Get a command by name or alias
 * @param {string} nameOrAlias - Command name or alias
 * @returns {Object|null} Command descriptor or null if not found
 */
function getCommand(nameOrAlias) {
  if (!nameOrAlias || typeof nameOrAlias !== 'string') {
    return null;
  }

  const normalized = nameOrAlias.toLowerCase();

  // Check direct command name
  if (commands.has(normalized)) {
    return commands.get(normalized);
  }

  // Check aliases
  if (aliases.has(normalized)) {
    const commandName = aliases.get(normalized);
    return commands.get(commandName);
  }

  return null;
}

/**
 * Get all registered command names
 * @returns {Array<string>} Array of command names
 */
function getAllCommandNames() {
  return Array.from(commands.keys());
}

/**
 * Clear all registered commands (useful for testing)
 */
function clearRegistry() {
  commands.clear();
  aliases.clear();
}

module.exports = {
  registerCommand,
  getCommand,
  getAllCommandNames,
  clearRegistry
};
