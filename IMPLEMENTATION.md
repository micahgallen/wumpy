# MUD Server Implementation Summary

## Overview
This document describes the implementation of a bare bones but fully functional MUD server for "The Wumpy and Grift". The server implements complete player management, world loading, and command processing systems.

## Architecture

### Core Components

#### 1. server.js - Main Server & Player Class
**Purpose**: TCP server and player connection management

**Key Classes**:
- `Player`: Represents a connected player with socket, username, current room, and state

**Key Functions**:
- `handleInput(player, input)`: Routes input based on player state
- `handleLoginUsername(player, username)`: Processes username during login
- `handleLoginPassword(player, password)`: Authenticates password
- `handleCreateUsername(player, response)`: Confirms new account creation
- `handleCreatePassword(player, password)`: Creates new player account

**Player States**:
- `login_username`: Waiting for username input
- `login_password`: Waiting for password input
- `create_username`: Confirming new account creation (yes/no)
- `create_password`: Waiting for password for new account
- `playing`: In-game, processing commands

**Connection Flow**:
1. New connection creates Player instance
2. Display welcome banner
3. Prompt for username
4. If username exists → request password → authenticate
5. If username doesn't exist → confirm creation → set password
6. On successful auth/creation → transition to 'playing' state
7. Show initial room with 'look' command

#### 2. playerdb.js - Player Data Persistence
**Purpose**: Manage player accounts and persistence

**Key Class**: `PlayerDB`

**Key Methods**:
- `load()`: Load player data from players.json on startup
- `save()`: Write player data to disk
- `hashPassword(password)`: Hash password using SHA-256
- `createPlayer(username, password)`: Create new account (returns null if exists)
- `authenticate(username, password)`: Verify credentials (returns player data or null)
- `updatePlayerRoom(username, roomId)`: Update player's current location
- `exists(username)`: Check if username is registered

**Data Format**:
```javascript
{
  "username": {
    "username": "string",
    "passwordHash": "hex string",
    "currentRoom": "room_id",
    "createdAt": "ISO timestamp"
  }
}
```

**Security Features**:
- Passwords hashed with SHA-256 (never stored in plain text)
- Usernames converted to lowercase for consistency
- Atomic save operations

#### 3. world.js - World Data Management
**Purpose**: Load and manage world data (rooms, NPCs, objects)

**Key Class**: `World`

**Key Methods**:
- `load()`: Initialize world loading
- `loadRealm(realmName)`: Load all data for a specific realm
- `loadDirectory(dirPath, storage)`: Load all JSON files from directory
- `getRoom(roomId)`: Retrieve room by ID
- `getNPC(npcId)`: Retrieve NPC by ID
- `getObject(objectId)`: Retrieve object by ID
- `formatRoom(roomId)`: Generate formatted room description for display
- `findExit(roomId, direction)`: Find destination room for a direction

**Data Storage**:
```javascript
{
  rooms: { "room_id": {...} },
  npcs: { "npc_id": {...} },
  objects: { "object_id": {...} }
}
```

**Room Formatting**:
- Room name with underline
- Room description
- Available exits
- NPCs present (with descriptions)
- Objects present (with names)

#### 4. commands.js - Command System
**Purpose**: Parse and execute player commands

**Key Functions**:
- `parseCommand(input, player, world, playerDB)`: Parse input and execute command
- `movePlayer(player, direction, world, playerDB)`: Handle movement logic

**Command Structure**:
Each command is a function: `(player, args, world, playerDB) => void`

**Implemented Commands**:
- `look`: Display current room
- `help`: Show available commands
- `quit`: Disconnect gracefully
- `north`, `south`, `east`, `west`, `up`, `down`: Movement
- `n`, `s`, `e`, `w`, `u`, `d`: Movement aliases

**Command Flow**:
1. Parse input into command name and arguments
2. Convert command to lowercase
3. Look up command in commands object
4. Execute command with player context
5. If command not found, display error message

**Movement Logic**:
1. Find exit in current room matching direction
2. Validate destination room exists
3. Update player's current room
4. Save new position to database
5. Display movement message
6. Automatically execute 'look' in new room

## Data Flow

### Player Login Flow
```
Connection → Username prompt → Check if exists
  → Exists: Password prompt → Authenticate
    → Success: Load player data → Enter game
    → Fail: Re-prompt username
  → Doesn't exist: Confirm creation → Password prompt → Create account → Enter game
```

### Player Command Flow
```
Input → Parse command → Look up command handler → Execute with context
  → Update player state
  → Update database if needed
  → Send response to player
```

### World Loading Flow
```
Server start → World constructor
  → Load realm directories
    → Load rooms/*.js
    → Load npcs/*.js
    → Load objects/*.js
  → Store in memory indexes
  → Ready for queries
```

## Key Design Decisions

### 1. State Machine for Player Flow
Using explicit states (`login_username`, `create_password`, `playing`, etc.) makes the connection flow clear and maintainable. Each state has a dedicated handler function.

### 2. Modular Architecture
Separating concerns into distinct modules (server, playerdb, world, commands) allows:
- Easy testing of individual components
- Clear responsibility boundaries
- Future expansion without modifying core code

### 3. Player Class with send() Method
Encapsulating the socket write operation in `player.send()` provides:
- Clean abstraction over network communication
- Protection against writing to destroyed sockets
- Consistent interface for all message sending

### 4. Command Object Pattern
Using an object of command functions (instead of switch statement) enables:
- Easy addition of new commands
- Self-documenting command list
- Simple command lookup
- Future expansion (command permissions, aliases, etc.)

### 5. World Data Caching
Loading all world data into memory on startup provides:
- Fast lookups (no file I/O during gameplay)
- Consistent world state
- Simple query interface

### 6. Exit Validation
Always checking that destination rooms exist prevents:
- Players getting stuck in non-existent rooms
- Cryptic errors from missing data
- Server crashes from null references

## Error Handling

### Connection Errors
- Socket errors logged but don't crash server
- Disconnections cleaned up properly
- Player removed from active set

### Command Errors
- Unknown commands provide helpful message
- Invalid movement directions give feedback
- Command execution errors caught and logged

### Data Errors
- Missing world files logged as warnings
- Invalid world data skipped with error log
- Player database corruption handled gracefully

### Authentication Errors
- Invalid passwords don't reveal existence of username
- Failed logins allow retry
- Empty passwords/usernames handled

## Performance Considerations

### Memory
- All world data cached in memory (fast but memory-intensive)
- Player accounts loaded once on startup
- One Player object per connection

### Disk I/O
- Player data saved synchronously on every update (safe but slower)
- World data loaded once on startup (fast startup)
- No caching of player database (always fresh from disk)

### Network
- Blocking I/O for simplicity
- No buffering of output (sent immediately)
- Line-based input processing

## Testing Results

### Tested Scenarios
1. New player account creation
2. Existing player login
3. Invalid password handling
4. Multiple simultaneous connections
5. Movement between rooms
6. Invalid movement attempts
7. Unknown command handling
8. Graceful disconnection
9. Player data persistence across server restarts
10. World data loading

### Known Limitations
1. Exit destinations not all implemented (shop, bar, etc. rooms don't exist yet)
2. No inventory system
3. NPCs displayed but not interactive
4. Objects shown but can't be examined or manipulated
5. No player-to-player communication
6. No combat system
7. No character stats/progression
8. Passwords use SHA-256 (should use bcrypt for production)
9. No rate limiting or abuse prevention
10. No logging of player actions

## Extension Points

### Adding New Commands
1. Add function to commands object in commands.js
2. Function signature: `(player, args, world, playerDB) => void`
3. Use `player.send()` for output
4. Update help command text

### Adding New Rooms
1. Create JSON file in `world/<realm>/rooms/`
2. Set unique `id` field
3. Define exits with direction and destination room
4. List NPC and object IDs
5. Server automatically loads on restart

### Adding Player Attributes
1. Add fields to player data in `playerdb.createPlayer()`
2. Update Player class in server.js with new properties
3. Add commands to view/modify attributes
4. Update save logic if needed

### Adding Persistence
1. Call `playerDB.save()` after state changes
2. Store additional data in player record
3. Load and apply data on login

## File Locations

All file paths referenced in this implementation:

- `/Users/au288926/Documents/mudmud/server.js` - Main server
- `/Users/au288926/Documents/mudmud/playerdb.js` - Player database
- `/Users/au288926/Documents/mudmud/world.js` - World loader
- `/Users/au288926/Documents/mudmud/commands.js` - Command system
- `/Users/au288926/Documents/mudmud/players.json` - Player data (auto-generated)
- `/Users/au288926/Documents/mudmud/world/sesame_street/rooms/street.js` - Starting room
- `/Users/au288926/Documents/mudmud/world/sesame_street/npcs/big_bird.js` - Example NPC
- `/Users/au288926/Documents/mudmud/world/sesame_street/objects/trashcan.js` - Example object

## Next Steps

### Immediate Priorities
1. Create additional rooms (shop, bar, teleport booth, Reality Street)
2. Implement inventory system (take, drop, inventory commands)
3. Add object interaction (examine, open, close)
4. Create NPC dialogue system (talk command)

### Medium Term
1. Add player-to-player communication (say, tell, emote)
2. Implement combat system
3. Add character stats and progression
4. Create additional realms

### Long Term
1. Guild system with special abilities
2. Colored text support
3. ASCII art integration
4. Web-based client
5. Quest system

## Conclusion

This implementation provides a solid foundation for a MUD server with:
- Complete player account management
- Persistent data storage
- Extensible command system
- Flexible world data loading
- Clean, modular architecture

All core systems are in place and functioning. The server can handle multiple simultaneous players, persist data across restarts, and provides a clear path for future feature development.
