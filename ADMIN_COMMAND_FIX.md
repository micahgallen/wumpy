# Admin Command Conflict Fix

## Issue
When logged in as admin, typing `kill wumpy` (intending to use the combat command) triggered the admin kill command instead, and it killed the wrong NPC globally (Gronk) rather than the blue wumpy in the current room.

## Problems Identified

1. **Command Conflict**: Admin `kill` command was intercepting the normal combat `kill` command
2. **Global Targeting**: Admin kill searched all NPCs globally without prioritizing the current room
3. **Wrong Target**: NPCs with the same keywords across different rooms could be killed accidentally

## Solution

### 1. Renamed Admin Command
- Changed admin `kill` to `slay`
- This eliminates the conflict with the combat `kill` command
- Now players can use `kill <target>` for combat, and admins use `slay <target>` for admin kills

### 2. Room-Aware Targeting
- Added new `findNPCInRoom()` function that:
  - First searches NPCs in the current room
  - Only falls back to global search if not found locally
  - Prioritizes exact NPC ID matches, then keyword matches
- This ensures admins kill the intended target in their room

## Changes Made

### Files Modified

**`src/admin/permissions.js`**
- Renamed `KILL: 'kill'` to `SLAY: 'slay'` in Command enum
- Updated permission matrix to use `Command.SLAY`

**`src/admin/chatBinding.js`**
- Removed `'kill'` from admin commands list
- Added `'slay'` to admin commands list
- Updated imports to use `slayCommand` instead of `killCommand`
- Updated command map to route `'slay'` to `slayCommand`

**`src/admin/commands.js`**
- Added `findNPCInRoom(target, player, world)` function (lines 61-84)
- Renamed `killCommand` to `slayCommand`
- Updated `slayCommand` to use `findNPCInRoom()` for NPC targeting
- Updated admin help to show `@slay` command
- Exported `findNPCInRoom` for potential use by other commands

## Usage

### Before (Problematic)
```
> kill wumpy
Killed Gronk the Wumpy Gladiator (wumpy)  // Wrong NPC, different room!
```

### After (Fixed)
```
> kill wumpy
Combat has begun!  // Uses normal combat system
Player strikes Blue Wumpy!

> slay wumpy
Slain Blue Wumpy  // Admin command, targets NPC in current room
```

## Admin Commands

### Combat vs Admin Kill

| Command | Type | Description |
|---------|------|-------------|
| `kill <target>` | Normal | Start combat with target (works for all players) |
| `attack <target>` | Normal | Alias for kill command |
| `slay <target>` | Admin | Instantly kill target, prioritizes current room (Creator+) |

### Slay Command Details

**Syntax**: `slay <playerOrNpc>` or `@slay <playerOrNpc>`

**Permission**: Creator or higher

**Behavior**:
1. Searches for players globally by name
2. If not a player, searches for NPCs:
   - **First**: Checks NPCs in the current room
   - **Then**: Falls back to global NPC search if not found locally
3. Sets target HP to 0
4. For players: Sets ghost status
5. Logs action in audit log

**Examples**:
```bash
# In a room with Blue Wumpy
slay wumpy          # Kills Blue Wumpy (current room)

# To kill a specific NPC by ID (if keywords conflict)
slay wumpy_blue     # Uses exact NPC ID

# Kill a player
slay PlayerName     # Works globally for players
```

## Testing

### Test 1: Combat Command Works
1. Stand in a room with an NPC
2. Type: `kill <npc>`
3. Expected: Combat initiates (not instant death)

### Test 2: Admin Slay in Current Room
1. As admin, stand in a room with an NPC
2. Type: `slay <npc>`
3. Expected: NPC in your room dies instantly

### Test 3: No Conflict
1. As admin with Creator+ role
2. Type: `kill wumpy` - should start combat
3. Type: `slay wumpy` - should instantly kill

### Test 4: Room Priority
1. Multiple NPCs with same keywords in different rooms
2. Stand in room with blue wumpy
3. Type: `slay wumpy`
4. Expected: Kills the wumpy in your current room, not elsewhere

## Backwards Compatibility

**Breaking Change**: The `@kill` admin command is now `@slay`

If any scripts or documentation reference `@kill`, they need to be updated to `@slay`.

**Migration**:
- Old: `@kill player` → New: `@slay player`
- Old: `kill` (combat) → Still works: `kill` (combat)
- Combat commands unchanged
