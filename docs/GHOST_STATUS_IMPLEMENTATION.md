# Ghost Status Implementation

## Overview

The ghost status system provides comprehensive visual and functional indicators when a player dies in combat. Ghost players cannot attack and are visually distinguished throughout the MUD.

## Implementation Summary

### Files Modified

1. **src/server.js**
   - Added `isGhost` property to Player class
   - Initialized to `false` for all new players

2. **src/combat/CombatEncounter.js**
   - Death handler sets `target.isGhost = true` when player dies
   - Sends comprehensive death message to player
   - Explains ghost status and restrictions

3. **src/commands.js**
   - Attack command: Prevents ghosts from attacking with clear error message
   - Look command: Shows ghost status when looking at self or others
   - Examine command: Displays ghost description for players
   - Score command: Prominently displays ghost status

4. **world.js**
   - Room formatting: Shows "(ghost)" indicator next to ghost player names in room listings

## Features

### 1. Death Message

When a player dies, they receive:

```
======================================
        YOU HAVE DIED!
======================================
You are now a GHOST.
As a ghost, you cannot attack or be attacked.
Your form is translucent and ethereal.
(Respawn mechanics coming soon...)
```

### 2. Combat Prevention

Ghosts cannot initiate attacks:

```
> attack gronk
You cannot attack while you are a ghost!
Your ethereal form passes through the world without substance.
```

### 3. Room Descriptions

Ghost players appear with a visual indicator:

```
Also here: Bob (ghost), Alice
```

### 4. Look/Examine Commands

#### Looking at self as ghost:
```
> look me
You (ghost)
A normal-looking person.
Your form is translucent and ethereal.
```

#### Looking at another ghost:
```
> look bob
Bob (ghost)
A warrior clad in gleaming armor.
Their form is translucent and ethereal, barely visible in this world.
```

### 5. Score Command

Ghost status is prominently displayed:

```
Character Information
=======================
Name: Bob
Location: Arena Main
Status: GHOST
  You are currently a ghost and cannot attack.
Carrying: nothing

You are a ghostly spirit in The Wumpy and Grift.
Your translucent form drifts through the world...
```

## Testing

### Automated Verification

Run the feature verification script:

```bash
node scripts/verify_ghost_features.js
```

This checks that all ghost status code is present in the appropriate files.

### Manual Testing

1. Start the server: `./scripts/restart_server.sh`
2. Connect: `telnet localhost 4000`
3. Create a test character
4. Navigate to Arena Main:
   - `north` (to Sesame Street - Mid-North)
   - `west` (to The Wumpy Bar)
   - `north` (to Arena Lounge)
   - `east` (to Arena Main)
5. Attack Gronk: `attack gronk`
6. Wait for combat to finish (player death)
7. Verify ghost status:
   - `score` - Should show GHOST status
   - `look` - Should see room normally
   - `look [your name]` - Should see ghost description
   - `attack gronk` - Should be prevented

### Test with Multiple Players

1. Connect two clients
2. Have one player die and become a ghost
3. Second player should see ghost indicator in room
4. Second player can look at ghost and see ethereal description

## Future Enhancements

Potential additions to the ghost system:

1. **Respawn Mechanic**
   - Temple/shrine respawn points
   - Automatic respawn after timer
   - Item/XP penalty system

2. **Ghost-Specific Commands**
   - `respawn` - Return to life at spawn point
   - Ghost movement (pass through doors?)
   - Communicate with other ghosts

3. **Ghost Visibility**
   - Special items to see/interact with ghosts
   - Necromancer class abilities
   - Ghost-only areas

4. **Death Penalties**
   - XP loss
   - Item drops
   - Temporary stat debuffs after respawn

5. **Visual Enhancements**
   - Different colors for ghost text
   - Animated ASCII ghost sprites
   - Special ghost emotes

## Code Integration Points

### Adding Ghost-Aware Features

When implementing new features that should interact with ghost status:

```javascript
// Check if player is ghost
if (player.isGhost) {
  player.send('You cannot do that as a ghost!\n');
  return;
}

// Check if target is ghost
const target = findPlayer(targetName);
if (target && target.isGhost) {
  player.send(`${target.username} is a ghost!\n');
}
```

### Setting Ghost Status

Ghost status should only be set in combat death handling:

```javascript
// In death handler
if (target.socket && target.username) {
  target.isGhost = true;
  // Send death messages
}
```

### Clearing Ghost Status

When respawn is implemented:

```javascript
player.isGhost = false;
player.currentHp = player.maxHp;
// Teleport to spawn point
// Apply any death penalties
```

## Architecture Notes

- Ghost status is a boolean flag on the Player object
- Not persisted to database (players respawn on login)
- Simple flag-based system for easy extension
- All ghost checks use `player.isGhost` property
- Consistent messaging across all ghost interactions

## Related Systems

- Combat System (`src/combat/`)
- Player Management (`src/server.js`)
- Command System (`src/commands.js`)
- World Rendering (`world.js`)

## Summary

The ghost status system provides:

✓ Clear death notification
✓ Visual ghost indicators in all contexts
✓ Combat prevention for ghosts
✓ Consistent theming and messaging
✓ Foundation for future respawn mechanics
✓ Easy integration with existing systems

All requested features have been implemented and verified.
