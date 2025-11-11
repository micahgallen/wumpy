# Ambient Systems

This directory contains systems that provide ambient, atmospheric interactions in the game world.

## AmbientDialogueManager

The `AmbientDialogueManager` makes NPCs automatically speak their dialogue lines at randomized intervals, creating a living, breathing world.

### Features

- NPCs speak every 30-60 seconds (randomized)
- Random dialogue line selection from each NPC's dialogue array
- Smart broadcasting (only when players are present)
- Handles dead NPCs and room changes gracefully
- Minimal performance overhead (individual timers per NPC)

### Usage

The system is automatically initialized during server startup. No manual configuration required.

#### Adding Dialogue to an NPC

Simply add a `dialogue` array to the NPC's JSON definition:

```json
{
  "id": "friendly_shopkeeper",
  "name": "Bob the Shopkeeper",
  "dialogue": [
    "Welcome to my shop! Take a look around.",
    "These prices are the best in town!",
    "I just got a new shipment in yesterday.",
    "Let me know if you need any help."
  ]
}
```

The system will automatically detect and initialize the NPC on server restart.

### API

#### Manual Trigger (for testing)

```javascript
const AmbientDialogueManager = require('./AmbientDialogueManager');

// Trigger dialogue immediately for a specific NPC
AmbientDialogueManager.triggerDialogue('friendly_shopkeeper');
```

#### Debug Information

```javascript
const info = AmbientDialogueManager.getDebugInfo();
console.log(info);
// {
//   active: true,
//   totalNPCs: 12,
//   npcsWithDialogue: 12,
//   activeTimers: 12,
//   npcDialogueCounts: { ... }
// }
```

### Testing

#### Unit Test
```bash
node test/test-ambient-dialogue.js
```

#### Live Demo
```bash
node test/demo-ambient-dialogue-live.js
```

This will start the system and show NPCs speaking in real-time with actual timer delays.

### Configuration

To adjust the timing interval, edit `AmbientDialogueManager.js`:

```javascript
// Current: 30-60 seconds
const interval = 30000 + Math.random() * 30000;

// Example: 60-120 seconds
const interval = 60000 + Math.random() * 60000;

// Example: 10-20 seconds (for testing)
const interval = 10000 + Math.random() * 10000;
```

### Architecture

```
ServerBootstrap
  └─> Initialize AmbientDialogueManager
      └─> Start timers for all NPCs with dialogue
          └─> Every 30-60s (randomized):
              ├─> Check if NPC is alive
              ├─> Find NPC's room
              ├─> Check if players are present
              └─> Broadcast random dialogue line
```

### Performance

- **Memory**: ~1KB per NPC with dialogue
- **CPU**: Negligible (fires every 30-60s)
- **Network**: Only when players are in room
- **Scalability**: Designed for hundreds of NPCs

### Future Enhancements

See `/home/micah/wumpy/docs/AMBIENT_DIALOGUE_SYSTEM.md` for:
- Emote support
- Conditional/contextual dialogue
- Dialogue groups (idle, combat, quest)
- Proximity-aware dialogue
- Admin commands

### Troubleshooting

**NPCs not speaking?**
1. Check if NPC has `dialogue` array in JSON
2. Verify system started: Look for "AmbientDialogueManager started" in logs
3. Ensure players are in the room with the NPC
4. Check that NPC is alive (not dead)

**Performance issues?**
1. Check active timer count: `AmbientDialogueManager.getDebugInfo()`
2. Verify timers are cleaned up on shutdown
3. Monitor server logs for errors

### Documentation

- **Full Documentation**: `/home/micah/wumpy/docs/AMBIENT_DIALOGUE_SYSTEM.md`
- **Implementation Summary**: `/home/micah/wumpy/IMPLEMENTATION_SUMMARY.md`
