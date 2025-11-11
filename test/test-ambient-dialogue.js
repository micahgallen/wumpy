/**
 * Test script for ambient dialogue system
 * Tests that NPCs can speak their dialogue lines
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
    this.messages = [];
  }

  send(message) {
    this.messages.push(message);
    console.log(`[${this.username}] ${message}`);
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
const testPlayer1 = new MockPlayer('TestPlayer1', 'sesame_street_01');
const testPlayer2 = new MockPlayer('TestPlayer2', 'bar');
players.add(testPlayer1);
players.add(testPlayer2);

console.log('\nPlayers created:');
console.log(`  - ${testPlayer1.username} in ${testPlayer1.currentRoom}`);
console.log(`  - ${testPlayer2.username} in ${testPlayer2.currentRoom}`);

// Initialize ambient dialogue manager
console.log('\nInitializing AmbientDialogueManager...');
AmbientDialogueManager.initialize(world, players);

// Get debug info
console.log('\nAmbient Dialogue Debug Info:');
const debugInfo = AmbientDialogueManager.getDebugInfo();
console.log(`  Total NPCs: ${debugInfo.totalNPCs}`);
console.log(`  NPCs with dialogue: ${debugInfo.npcsWithDialogue}`);
console.log('\nNPCs with dialogue:');
for (const [npcId, count] of Object.entries(debugInfo.npcDialogueCounts)) {
  const npc = world.getNPC(npcId);
  console.log(`  - ${npc.name} (${npcId}): ${count} lines`);
}

// Test world.sendToRoom directly first
console.log('\n\n=== Testing world.sendToRoom Directly ===');
console.log('Calling world.sendToRoom("sesame_street_01", "Test message", [], players)');
world.sendToRoom('sesame_street_01', 'Direct test message', [], players);

// Test manual dialogue trigger for NPCs in sesame_street_01
console.log('\n\n=== Testing Manual Dialogue Trigger ===');
console.log('NPCs in sesame_street_01:');
const room = world.getRoom('sesame_street_01');
console.log(`  Room has NPCs: ${room?.npcs?.length || 0}`);
console.log(`  Players in test: ${players.size}`);
console.log(`  TestPlayer1 room: ${testPlayer1.currentRoom}`);
console.log(`  TestPlayer1 state: ${testPlayer1.state}`);

if (room && room.npcs) {
  for (const npcId of room.npcs) {
    const npc = world.getNPC(npcId);
    console.log(`\n  Triggering dialogue for: ${npc.name}`);
    AmbientDialogueManager.triggerDialogue(npcId);
  }
}

// Test NPCs in bar room
console.log('\n\nNPCs in bar:');
const barRoom = world.getRoom('bar');
if (barRoom && barRoom.npcs) {
  for (const npcId of barRoom.npcs) {
    const npc = world.getNPC(npcId);
    console.log(`\n  Triggering dialogue for: ${npc.name}`);
    AmbientDialogueManager.triggerDialogue(npcId);
  }
}

// Test with player not in room
console.log('\n\n=== Testing Empty Room (No Players) ===');
const testPlayerEmpty = new MockPlayer('TestPlayerEmpty', 'general_store');
players.clear();
players.add(testPlayerEmpty);
console.log(`Player moved to general_store`);

const storeRoom = world.getRoom('general_store');
if (storeRoom && storeRoom.npcs) {
  for (const npcId of storeRoom.npcs) {
    const npc = world.getNPC(npcId);
    console.log(`\n  Triggering dialogue for: ${npc.name}`);
    AmbientDialogueManager.triggerDialogue(npcId);
  }
}

// Now try dialogue in sesame_street_01 (should not broadcast - no players there)
console.log('\n\n=== Testing sesame_street_01 With No Players ===');
console.log('Triggering dialogue for Bert (should not broadcast):');
AmbientDialogueManager.triggerDialogue('bert_fire_safety');

// Verify messages received
console.log('\n\n=== Message Summary ===');
console.log(`TestPlayer1 received ${testPlayer1.messages.length} messages`);
console.log(`TestPlayer2 received ${testPlayer2.messages.length} messages`);
console.log(`TestPlayerEmpty received ${testPlayerEmpty.messages.length} messages`);

console.log('\n\nTest complete!');
