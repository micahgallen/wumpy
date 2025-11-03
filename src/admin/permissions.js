/**
 * Admin Permissions System
 * Defines roles, permission matrix, and ceiling rules
 */

// Role enumeration (ordered by authority level: lowest to highest)
const Role = {
  PLAYER: 'Player',
  CREATOR: 'Creator',
  SHERIFF: 'Sheriff',
  ADMIN: 'Admin'
};

// Numeric rank values for comparison (higher = more authority)
const RankValue = {
  [Role.PLAYER]: 0,
  [Role.CREATOR]: 1,
  [Role.SHERIFF]: 2,
  [Role.ADMIN]: 3
};

// Command permission constants
const Command = {
  KICK: 'kick',
  BAN: 'ban',
  UNBAN: 'unban',
  ADDLEVEL: 'addlevel',
  REMOVELEVEL: 'removelevel',
  KILL: 'kill',
  SPAWN: 'spawn',
  PROMOTE: 'promote',
  DEMOTE: 'demote',
  ADMINHELP: 'adminhelp',
  REVIVE: 'revive'
};

// Permission matrix: maps commands to minimum required role
const PermissionMatrix = {
  [Command.KICK]: Role.SHERIFF,
  [Command.BAN]: Role.SHERIFF,
  [Command.UNBAN]: Role.SHERIFF,
  [Command.ADDLEVEL]: Role.CREATOR,
  [Command.REMOVELEVEL]: Role.CREATOR,
  [Command.KILL]: Role.CREATOR,
  [Command.SPAWN]: Role.CREATOR,
  [Command.REVIVE]: Role.CREATOR,
  [Command.PROMOTE]: Role.ADMIN,
  [Command.DEMOTE]: Role.ADMIN,
  [Command.ADMINHELP]: Role.PLAYER // Everyone can see help
};

// Feature flags (deprecated - Sheriff no longer has spawn permission)
const FeatureFlags = {
  SHERIFF_CAN_SPAWN: false
};

/**
 * Get the numeric rank value for a role
 * @param {string} role - Role name
 * @returns {number} Rank value (higher = more authority)
 */
function getRankValue(role) {
  return RankValue[role] ?? RankValue[Role.PLAYER];
}

/**
 * Check if actor has permission to execute a command
 * @param {Object} actor - Actor object with 'role' property
 * @param {string} command - Command name
 * @returns {boolean} True if actor has permission
 */
function hasPermission(actor, command) {
  const actorRole = actor.role || Role.PLAYER;
  const requiredRole = PermissionMatrix[command];

  if (!requiredRole) {
    return false; // Unknown command
  }

  // Special case: spawn command with feature flag
  if (command === Command.SPAWN && FeatureFlags.SHERIFF_CAN_SPAWN) {
    return getRankValue(actorRole) >= getRankValue(Role.SHERIFF);
  }

  return getRankValue(actorRole) >= getRankValue(requiredRole);
}

/**
 * Check if issuer can promote target to targetRole
 * Ceiling rules:
 * 1. No one can promote above their own rank
 * 2. Only Admin can promote anyone (Sheriff and Creator cannot promote)
 * 3. Cannot promote self (except Admin can self-promote)
 *
 * @param {Object} issuer - Issuer object with 'role' and 'id' properties
 * @param {Object} target - Target object with 'role' and 'id' properties
 * @param {string} targetRole - Desired role for target
 * @returns {Object} { allowed: boolean, reason: string }
 */
function canPromote(issuer, target, targetRole) {
  const issuerRole = issuer.role || Role.PLAYER;
  const currentTargetRole = target.role || Role.PLAYER;

  // Self-promotion check (only Admin can self-promote)
  if (issuer.id === target.id && issuerRole !== Role.ADMIN) {
    return {
      allowed: false,
      reason: 'You cannot promote yourself (only Admin can self-promote)'
    };
  }

  // Only Admin can promote
  if (issuerRole !== Role.ADMIN) {
    return {
      allowed: false,
      reason: 'Only Admin can promote players'
    };
  }

  // Cannot promote above own rank (Admin is highest, so this prevents promoting to non-existent ranks)
  if (getRankValue(targetRole) > getRankValue(issuerRole)) {
    return {
      allowed: false,
      reason: `You cannot promote above your own rank (${issuerRole})`
    };
  }

  // Cannot promote someone who is already at or above issuer's rank (unless self-promoting as Admin)
  if (getRankValue(currentTargetRole) >= getRankValue(issuerRole) && issuer.id !== target.id) {
    return {
      allowed: false,
      reason: `Target is already at or above your rank`
    };
  }

  return { allowed: true };
}

/**
 * Check if issuer can demote target
 * Ceiling rules:
 * 1. Only Admin can demote anyone (Sheriff and Creator cannot demote)
 * 2. Admin cannot be demoted by anyone except Admin
 * 3. Cannot demote self (except Admin can self-demote)
 *
 * @param {Object} issuer - Issuer object with 'role' and 'id' properties
 * @param {Object} target - Target object with 'role' and 'id' properties
 * @returns {Object} { allowed: boolean, reason: string }
 */
function canDemote(issuer, target) {
  const issuerRole = issuer.role || Role.PLAYER;
  const targetRole = target.role || Role.PLAYER;

  // Self-demotion check (only Admin can self-demote)
  if (issuer.id === target.id && issuerRole !== Role.ADMIN) {
    return {
      allowed: false,
      reason: 'You cannot demote yourself (only Admin can self-demote)'
    };
  }

  // Only Admin can demote
  if (issuerRole !== Role.ADMIN) {
    return {
      allowed: false,
      reason: 'Only Admin can demote players'
    };
  }

  // Admin can only be demoted by Admin
  if (targetRole === Role.ADMIN && issuerRole !== Role.ADMIN) {
    return {
      allowed: false,
      reason: 'Admin can only be demoted by Admin'
    };
  }

  // Cannot demote someone at or above your rank (unless self-demoting as Admin)
  if (getRankValue(targetRole) >= getRankValue(issuerRole) && issuer.id !== target.id) {
    return {
      allowed: false,
      reason: 'You cannot demote someone at or above your rank'
    };
  }

  // Already at minimum rank
  if (targetRole === Role.PLAYER) {
    return {
      allowed: false,
      reason: 'Target is already at the minimum rank (Player)'
    };
  }

  return { allowed: true };
}

/**
 * Get the next lower rank (for demotion without specified target role)
 * @param {string} currentRole - Current role
 * @returns {string|null} Next lower role, or null if already at minimum
 */
function getNextLowerRank(currentRole) {
  const rankMap = {
    [Role.ADMIN]: Role.SHERIFF,
    [Role.SHERIFF]: Role.CREATOR,
    [Role.CREATOR]: Role.PLAYER,
    [Role.PLAYER]: null
  };
  return rankMap[currentRole] || null;
}

/**
 * Validate if a role string is valid
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.values(Role).includes(role);
}

module.exports = {
  Role,
  RankValue,
  Command,
  PermissionMatrix,
  FeatureFlags,
  getRankValue,
  hasPermission,
  canPromote,
  canDemote,
  getNextLowerRank,
  isValidRole
};
