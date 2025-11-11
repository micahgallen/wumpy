/**
 * Live demo of ambient dialogue system
 * Shows NPCs speaking over time with real timer intervals
 */

const path = require('path');
const World = require('../src/world');
const AmbientDialogueManager = require('../src/systems/ambient/AmbientDialogueManager');

// Mock player for testing
class MockPlayer {
  constructor(username, roomId) {
    this.username = username;
    this.currentRoom = roomId;
    this.state = 'playing';
  }

  send(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }

  sendPrompt() {
    // No-op for testing
  }
}

// Initialize the world
console.log('Initializing world...');
const world = new World();

// Create mock players
const players = new Set();
const testPlayer = new MockPlayer('TestPlayer', 'sesame_street_01');
players.add(testPlayer);

console.log('\nPlayer created:');
console.log(`  - ${testPlayer.username} in ${testPlayer.currentRoom}`);

// Initialize ambient dialogue manager
console.log('\nInitializing AmbientDialogueManager...');
AmbientDialogueManager.initialize(world, players);

// Get debug info
console.log('\nAmbient Dialogue Debug Info:');
const debugInfo = AmbientDialogueManager.getDebugInfo();
console.log(`  Total NPCs: ${debugInfo.totalNPCs}`);
console.log(`  NPCs with dialogue: ${debugInfo.npcsWithDialogue}`);
console.log(`  Active before start: ${debugInfo.active}`);

// Start the system
console.log('\n=== Starting Ambient Dialogue System ===');
AmbientDialogueManager.start();

const afterStartInfo = AmbientDialogueManager.getDebugInfo();
console.log(`  Active: ${afterStartInfo.active}`);
console.log(`  Active timers: ${afterStartInfo.activeTimers}`);

// List NPCs in the room
const room = world.getRoom('sesame_street_01');
console.log(`\nNPCs in ${room.name}:`);
if (room && room.npcs) {
  for (const npcId of room.npcs) {
    const npc = world.getNPC(npcId);
    console.log(`  - ${npc.name} (${npc.dialogue.length} lines)`);
  }
}

console.log('\n=== Waiting for ambient dialogue... ===');
console.log('NPCs will speak every 30-60 seconds.');
console.log('Press Ctrl+C to exit.\n');

// Trigger one immediate dialogue for each NPC to show what it looks like
console.log('Triggering sample dialogue from each NPC:\n');
if (room && room.npcs) {
  for (const npcId of room.npcs) {
    AmbientDialogueManager.triggerDialogue(npcId);
  }
}

console.log('\n--- Now waiting for automatic dialogue (30-60s intervals) ---\n');

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n\n=== Shutting down ===');
  AmbientDialogueManager.stop();
  console.log('Ambient dialogue system stopped.');
  process.exit(0);
});

// Prevent script from exiting
setInterval(() => {
  // Just keep alive - NPCs will speak via their timers
}, 60000);
