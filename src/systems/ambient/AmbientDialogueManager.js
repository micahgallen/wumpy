/**
 * AmbientDialogueManager - Event-Driven NPC Ambient Dialogue System
 *
 * Handles NPCs automatically speaking their dialogue lines at randomized intervals.
 * Uses timer-based architecture for periodic ambient messaging.
 *
 * Design Principles:
 * - Timer-based: Each NPC with dialogue gets a randomized interval (30-60s)
 * - Only speaks if NPC is alive and in a room with players
 * - Graceful handling of NPCs that move or die
 * - Clear attribution of who is speaking
 * - Minimal CPU overhead with individual timers per NPC
 *
 * Performance Characteristics:
 * - One timer per NPC with dialogue
 * - Efficient room player lookup
 * - No polling of all rooms/NPCs
 *
 * Integration:
 * - Reads NPC dialogue arrays from world.npcs
 * - Broadcasts messages to players via world.sendToRoom()
 * - Initialized during server bootstrap
 * - Clean shutdown with timer cleanup
 */

const logger = require('../../logger');
const colors = require('../../colors');

class AmbientDialogueManager {
  /**
   * Initialize the AmbientDialogueManager
   * @param {object} world - World instance
   * @param {Set} players - Set of all connected players
   */
  constructor(world = null, players = null) {
    this.world = world;
    this.players = players;
    this.npcTimers = new Map(); // Map of npcId -> timer reference
    this.active = false;

    if (world) {
      logger.log('AmbientDialogueManager initialized');
    }
  }

  /**
   * Initialize with world and players instances
   * @param {object} world - World instance
   * @param {Set} players - Set of all connected players
   */
  initialize(world, players) {
    this.world = world;
    this.players = players;
    logger.log('AmbientDialogueManager initialized with world and players');
  }

  /**
   * Start ambient dialogue for all NPCs with dialogue
   * Call this after server is fully initialized
   */
  start() {
    if (this.active) {
      logger.warn('AmbientDialogueManager already active');
      return;
    }

    if (!this.world || !this.players) {
      logger.error('Cannot start AmbientDialogueManager: world or players not set');
      return;
    }

    this.active = true;

    // Set up timers for all NPCs with dialogue
    let npcCount = 0;
    for (const npcId in this.world.npcs) {
      const npc = this.world.npcs[npcId];
      if (npc && npc.dialogue && Array.isArray(npc.dialogue) && npc.dialogue.length > 0) {
        this.startNPCDialogue(npcId);
        npcCount++;
      }
    }

    logger.log(`AmbientDialogueManager started for ${npcCount} NPCs with dialogue`);
  }

  /**
   * Start ambient dialogue timer for a specific NPC
   * @param {string} npcId - NPC ID to start dialogue for
   */
  startNPCDialogue(npcId) {
    // Don't start if already running
    if (this.npcTimers.has(npcId)) {
      return;
    }

    const scheduleNext = () => {
      // Random interval between 30-60 seconds (30000-60000ms)
      const interval = 30000 + Math.random() * 30000;

      const timer = setTimeout(() => {
        this.speakDialogue(npcId);
        // Schedule the next dialogue after this one
        if (this.active) {
          scheduleNext();
        }
      }, interval);

      this.npcTimers.set(npcId, timer);
    };

    // Start the first timer
    scheduleNext();
  }

  /**
   * Make an NPC speak a random dialogue line
   * @param {string} npcId - NPC ID to speak
   * @param {boolean} ignoreActive - If true, speak even if manager is not active (for manual triggers)
   */
  speakDialogue(npcId, ignoreActive = false) {
    // Skip if not active (unless explicitly overridden for manual triggers)
    if (!ignoreActive && !this.active) return;

    // Get the NPC
    const npc = this.world.getNPC(npcId);
    if (!npc) {
      logger.warn(`Cannot speak dialogue: NPC ${npcId} not found`);
      return;
    }

    // Check if NPC has dialogue
    if (!npc.dialogue || !Array.isArray(npc.dialogue) || npc.dialogue.length === 0) {
      return;
    }

    // Check if NPC is alive
    if (npc.isDead && npc.isDead()) {
      // NPC is dead, don't speak
      return;
    }

    // Find which room the NPC is currently in
    const roomId = this.findNPCRoom(npcId);
    if (!roomId) {
      // NPC not in any room (possibly dead/removed)
      return;
    }

    // Check if there are any players in the room
    if (!this.hasPlayersInRoom(roomId)) {
      // No players to hear the dialogue, skip
      return;
    }

    // Pick a random dialogue line
    const randomIndex = Math.floor(Math.random() * npc.dialogue.length);
    const dialogueLine = npc.dialogue[randomIndex];

    // Format the message with NPC attribution
    const message = colors.npc(npc.name) + ' says, ' + colors.dim('"') + dialogueLine + colors.dim('"');

    // Broadcast to all players in the room
    // Debug: Check what we're passing
    // console.log(`DEBUG: Calling sendToRoom with roomId=${roomId}, message="${message}", players=${this.players?.size}`);

    this.world.sendToRoom(roomId, message, [], this.players);
  }

  /**
   * Find which room an NPC is currently in
   * @param {string} npcId - NPC ID to find
   * @returns {string|null} Room ID or null if not found
   */
  findNPCRoom(npcId) {
    for (const roomId in this.world.rooms) {
      const room = this.world.rooms[roomId];
      if (room.npcs && room.npcs.includes(npcId)) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * Check if there are any players in a room
   * @param {string} roomId - Room ID to check
   * @returns {boolean} True if at least one player is in the room
   */
  hasPlayersInRoom(roomId) {
    if (!this.players) return false;

    for (const player of this.players) {
      if (player.currentRoom === roomId && player.state === 'playing') {
        return true;
      }
    }
    return false;
  }

  /**
   * Stop ambient dialogue for a specific NPC
   * Useful when an NPC dies or is removed
   * @param {string} npcId - NPC ID to stop dialogue for
   */
  stopNPCDialogue(npcId) {
    const timer = this.npcTimers.get(npcId);
    if (timer) {
      clearTimeout(timer);
      this.npcTimers.delete(npcId);
      logger.log(`Stopped ambient dialogue for NPC ${npcId}`);
    }
  }

  /**
   * Stop all ambient dialogue and clean up timers
   * Call this during server shutdown
   */
  stop() {
    if (!this.active) {
      return;
    }

    this.active = false;

    // Clear all timers
    for (const [npcId, timer] of this.npcTimers.entries()) {
      clearTimeout(timer);
    }
    this.npcTimers.clear();

    logger.log('AmbientDialogueManager stopped, all timers cleared');
  }

  /**
   * Get debug info about ambient dialogue state
   * @returns {object} Debug information
   */
  getDebugInfo() {
    const info = {
      active: this.active,
      totalNPCs: Object.keys(this.world.npcs).length,
      npcsWithDialogue: 0,
      activeTimers: this.npcTimers.size,
      npcDialogueCounts: {}
    };

    // Count NPCs with dialogue
    for (const npcId in this.world.npcs) {
      const npc = this.world.npcs[npcId];
      if (npc && npc.dialogue && Array.isArray(npc.dialogue) && npc.dialogue.length > 0) {
        info.npcsWithDialogue++;
        info.npcDialogueCounts[npcId] = npc.dialogue.length;
      }
    }

    return info;
  }

  /**
   * Manually trigger dialogue for an NPC (for testing/debugging)
   * @param {string} npcId - NPC ID to trigger dialogue for
   */
  triggerDialogue(npcId) {
    this.speakDialogue(npcId, true); // Pass ignoreActive=true for manual triggers
  }
}

// Export singleton instance
module.exports = new AmbientDialogueManager();
