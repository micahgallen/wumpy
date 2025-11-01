# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"The Wumpy and Grift" is a text-based Multi-User Dungeon (MUD) built with Node.js. It's a satirical reflection of the world through 90s nostalgia, inspired by classic LPC MUDs like LooneyMUD and Discworld. The game uses TCP sockets for real-time multiplayer communication.

## Running the Server

```bash
node server.js
```

The server listens on port 4000.

### Testing Connectivity

Use the provided test script:

```bash
./mudtester.sh localhost 4000
```

Note: This requires `gtimeout` to be installed (GNU coreutils on macOS).

## Architecture

### Server Architecture (server.js)

- **Core Module**: Uses Node.js built-in `net` module for TCP connections
- **Player Management**: Players are tracked in a Set, each with a socket, name, and state ('new' or 'playing')
- **Connection Flow**:
  1. New connection creates a Player instance
  2. Player enters 'new' state and is prompted for name
  3. After providing name, transitions to 'playing' state
  4. All subsequent input is treated as commands (currently echoed back)

### World Data Structure

World data lives in `world/` directory with a hierarchical structure:

```
world/
  <realm_name>/
    rooms/     - Room definitions
    npcs/      - Non-player character definitions
    objects/   - Interactive object definitions
```

**World Data Format**: All world files use `.js` extension but contain JSON data. They are CommonJS modules that can be required by the server.

### Data Schema

**Rooms** (e.g., `world/sesame_street/rooms/street.js`):
- `id`: Unique room identifier
- `name`: Display name
- `description`: Room text shown to players
- `exits`: Array of `{direction, room}` objects linking to other rooms
- `npcs`: Array of NPC IDs present in the room
- `objects`: Array of object IDs in the room

**NPCs** (e.g., `world/sesame_street/npcs/big_bird.js`):
- `id`: Unique NPC identifier
- `name`: Display name
- `description`: Examination text
- `keywords`: Terms players can use to reference the NPC
- `level`, `hp`: Combat stats
- `dialogue`: Array of potential NPC speech

**Objects** (e.g., `world/sesame_street/objects/trashcan.js`):
- `id`: Unique object identifier
- `name`: Display name
- `description`: Examination text
- `keywords`: Terms players can use to reference the object
- `is_container`, `can_be_opened`, `is_open`: Container properties
- `contains`: Array of IDs for nested objects/NPCs

### Planned World Realms

Initial realms to be implemented (see DESIGN.md):
- **Sesame Street**: Starting area with shop, bar, wandering wumpies, teleport booth
- **Reality Street**: Darker, more dangerous version of Sesame Street
- **The Simpsons**, **Florida**, **Texas**, **Disney World**, **Saturday Morning Cartoons**, **Wumpy University**: Additional themed realms

## Current Implementation Status

### Completed Features (Phase 1)
- ✅ Player account system with password authentication
- ✅ Full world loading system (10 rooms, 8 NPCs, 25 objects in Sesame Street)
- ✅ Movement and navigation (north, south, east, west, etc.)
- ✅ Inventory system (get, drop, examine)
- ✅ Communication commands (say, emote, who, score)
- ✅ ANSI color support throughout
- ✅ ASCII art welcome banner
- ✅ Text wrapping at 80 characters
- ✅ Professional command prompts and spacing

### Key Modules
- `server.js` - Main TCP server, player management, state machine
- `playerdb.js` - Authentication and persistence
- `world.js` - World data loader with room formatting
- `commands.js` - Command parser and all game commands
- `colors.js` - ANSI color utilities and text wrapping
- `banner.js` - ASCII art welcome screen

## Next Steps

### Immediate Priorities (Phase 2 - Next Session)

Based on FEATURES_ROADMAP.md, these are the highest-priority features to implement next:

1. **Wumpy Kicking Mechanic** (3-4 hours)
   - Signature feature of the MUD!
   - Implement `kick [wumpy]` command
   - Wumpies fly to adjacent rooms with personality-based responses
   - Files: `commands.js`, update wumpy NPCs with `kick_responses`

2. **NPC Dialogue System** (3-4 hours)
   - `talk [npc]` or `talk to [npc]` command
   - NPCs respond with random dialogue from their `dialogue` array
   - Files: `commands.js`

3. **Container System** (6-8 hours)
   - `open/close [container]` commands
   - `look in [container]`, `get [item] from [container]`
   - Many objects already flagged as containers (trashcan, cookie jar, etc.)
   - Files: `commands.js`, `world.js`

4. **Object Interaction** (5-6 hours)
   - `use [object]` for usable objects (jukebox, TV, telephone, dartboard)
   - `sit on [furniture]`, `sleep in [bed]`, `read [sign/book]`
   - Files: `commands.js`

5. **NPC Roaming AI** (6-8 hours)
   - Make wumpies with `roaming: true` flag wander between rooms
   - Timer-based movement with room notifications
   - Files: `world.js` or new `npc_ai.js`

### Secondary Features
- Room broadcasting for say/emote (currently only echoes to self)
- Character stats tracking (HP, level, XP)
- Combat system (Phase 4)
- More realms (Reality Street, etc.)

See `FEATURES_ROADMAP.md` for complete prioritized list of 50+ planned features.

## Development Notes

- **No External Dependencies**: Project uses only Node.js built-in modules
- **No Test Suite**: Currently no automated tests configured
- **No Linting/Formatting**: No style enforcement tools in place
- **Port Forwarding**: Server is configured for remote access on port 4000
