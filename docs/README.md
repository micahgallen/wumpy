# Documentation Library

**Navigation:** This describes the Library/Systems organizational structure. For wiki-based system documentation, see [Wiki Index](wiki/_wiki-index.md). For a complete documentation map, see [Documentation Index](_INDEX.md).

This folder separates active references, operational guides, in-progress plans, and historical archives. The **library** contains practical guides, while the **wiki** contains authoritative system documentation. Both systems are actively maintained and serve complementary purposes.

## Directory Guide
- `library/` — Canonical documentation kept current for day-to-day development.
  - `library/general/` — Project overview and architecture (`AGENTS.md`, `DESIGN.md`).
  - `library/admin/` — Active admin system manuals (`admin-system.md`).
  - `library/combat/` — Combat player guides and diagrams (`COMBAT_QUICK_START.md`).
  - `library/ux/` — UX reference materials (`BEFORE_AFTER_EXAMPLES.md`).
- `operations/` — Playbook-style checklists and demos for running live flows.
- `systems/` — Deep technical design docs by subsystem (combat, items, status).
- `plans-roadmaps/` — Future work, handoffs, and in-flight planning notes.
- `reports/` — MOVED TO ARCHIVE: See `archive/phase-reports/reports/` for completed work.
- `archives/` — Superseded material retained for historical reference (see `archives/README.md`).
- `wiki/` — Wiki-based system documentation (architecture, patterns, mechanics)
- `reference/` — Quick lookup tables (combat stats, item properties)
- `work-logs/` — Chronological session logs documenting development

## Quick Entry Points
- New contributor onboarding: `library/general/AGENTS.md`
- Combat feature walkthroughs: `library/combat/COMBAT_QUICK_START.md`
- Admin permissions and capabilities: `library/admin/admin-system.md`
- Current roadmap: `plans-roadmaps/FEATURES_ROADMAP.md`
- Latest combat implementation status: `archive/phase-reports/reports/combat/COMBAT_IMPLEMENTATION_STATUS.md`

## Maintaining This Layout
- Place new canonical docs under `library/` and keep them updated as the source of truth.
- File operational runbooks under `operations/` so liveops tooling stays discoverable.
- When closing out work, move planning notes into `reports/` (or `archives/` if superseded).
- Add a short status note when archiving material, and list it in `archives/README.md`.

For older content or context before Phase 2, check the `archives/` section; everything else in this tree is intended to reflect the current build.

Or use netcat:
```bash
nc localhost 4000
```

### Testing
Use the provided test script:
```bash
./test_mud.sh
```

Or the existing mudtester.sh script:
```bash
./mudtester.sh localhost 4000
```

## Usage Example

### Creating a New Account
```
==================================================
  Welcome to The Wumpy and Grift!
  A satirical MUD of 90s nostalgia
==================================================

Username: alice
Account 'alice' does not exist. Create it? (yes/no): yes
Choose a password: mypassword

Account created! Welcome to The Wumpy and Grift, alice!
Type 'help' for a list of commands.

Sesame Street
=============
You are standing on a wide, friendly-looking street...
```

### Playing the Game
```
> look
Sesame Street
=============
You are standing on a wide, friendly-looking street. The pavement is clean...

Exits: north, south, east, west

A giant, yellow bird is standing here, looking around with a friendly...
You see a dented, metal trashcan here.

> examine big bird
Big Bird (Level 5)
A giant, yellow bird is standing here, looking around with a friendly...

The Big Bird looks like they might have something to say.

> get trashcan
You can't take a dented, metal trashcan. It's too heavy or fixed in place.

> north
You move north.

Northern End of Sesame Street
==============================
The northern end of the street opens up to a wider plaza area...

> inventory
You are not carrying anything.

> say Hello, Sesame Street!
You say, "Hello, Sesame Street!"

> who
Players Online (1):
-------------------
  Alice - Sesame Street

Total: 1 player(s)

> help
Available Commands:
-------------------
Movement:
  north, south, east, west - Move in a cardinal direction
  n, s, e, w              - Short aliases for directions
  up, down, u, d          - Move up or down

Interaction:
  look / l                - Look around the current room
  examine [target]        - Examine an NPC or object in detail
  ex [target]             - Short form of examine
  get/take [item]         - Pick up an object
  drop [item]             - Drop an object from inventory
  inventory / i           - Show what you're carrying

Communication:
  say [message]           - Speak to others in the room
  emote [action]          - Perform an emote/action
  : [action]              - Short form of emote

Information:
  who                     - List online players
  score                   - Show your character stats
  help                    - Show this help message

System:
  quit                    - Disconnect from the game

> quit
Farewell! Come back soon.
```

## Technical Details

### Player Data Format
Each player account is stored with:
- `username`: Display name (original case preserved)
- `passwordHash`: SHA-256 hash of password
- `currentRoom`: ID of player's current location
- `inventory`: Array of object IDs the player is carrying
- `createdAt`: ISO timestamp of account creation

### World Data Format
All world data files use `.js` extension but contain JSON:

**Rooms** (`world/*/rooms/*.js`):
```json
{
  "id": "sesame_street_01",
  "name": "Sesame Street",
  "description": "You are standing on a wide, friendly-looking street...",
  "exits": [
    {"direction": "north", "room": "teleport_booth"}
  ],
  "npcs": ["big_bird"],
  "objects": ["trashcan"]
}
```

**NPCs** (`world/*/npcs/*.js`):
```json
{
  "id": "big_bird",
  "name": "Big Bird",
  "description": "A giant, yellow bird is standing here...",
  "keywords": ["bird", "big bird"],
  "level": 5,
  "hp": 100,
  "dialogue": ["Have you seen my friend, Mr. Snuffleupagus?"]
}
```

**Objects** (`world/*/objects/*.js`):
```json
{
  "id": "trashcan",
  "name": "a dented, metal trashcan",
  "description": "It's a large, dented, metal trashcan...",
  "keywords": ["trashcan", "can", "trash"],
  "is_container": true,
  "can_be_opened": true,
  "is_open": false
}
```

## Implementation Notes

### What's Implemented
- Complete player creation and login flow with colored UI
- Password hashing for security
- Player data persistence (survives server restarts)
- Inventory system with persistence
- World data loading from JSON files (10 rooms, 8 NPCs, 24 objects)
- Room navigation with colored exits
- Enhanced command parsing with aliases
- Room display with colorized NPCs and objects
- Object examination system
- Item pickup and drop mechanics
- Communication commands (say, emote)
- Player tracking (who command)
- Character information display (score command)
- Graceful disconnection handling
- Comprehensive error handling with helpful messages
- ANSI color support throughout the interface

### Not Yet Implemented
- NPC dialogue system (talk command)
- Object interaction (opening containers, using objects, sitting/sleeping)
- Combat system
- Character stats/levels/progression
- Multiple player room broadcasting (say/emote broadcast)
- Quest system
- Guild system
- Magic/spell system
- Merchant/shop system
- NPC roaming behavior
- Wumpy kicking mechanic
- WebSocket support
- Additional realms beyond Sesame Street

### Security Considerations
- Passwords are hashed with SHA-256 (note: for production, use bcrypt or argon2)
- Usernames are case-insensitive to prevent confusion
- No minimum username length requirement (consider adding)
- Basic error handling prevents server crashes

## Dependencies
None! Uses only Node.js built-in modules:
- `net` - TCP socket server
- `fs` - File system operations
- `crypto` - Password hashing
- `path` - File path handling

All color output uses standard ANSI escape codes compatible with most terminal emulators.

## Testing

The server has been tested with:
1. New player account creation with colored UI
2. Existing player login with inventory restoration
3. Invalid password rejection
4. Multiple simultaneous connections
5. Room navigation with colored room displays
6. Enhanced command parsing with aliases
7. Object examination (NPCs and objects)
8. Item pickup and drop with inventory updates
9. Inventory persistence across sessions
10. Communication commands (say, emote)
11. Who command showing online players
12. Score command displaying character info
13. Graceful disconnect handling
14. Player data persistence with inventory
15. Color output in various terminal emulators

## Future Development

See **FEATURES_ROADMAP.md** for a comprehensive, prioritized list of planned features.

### Immediate Priorities (Phase 2)
1. NPC dialogue system - Allow talking to NPCs
2. Container system - Open/close containers, look inside, get from/put in
3. Object interaction - Use objects (jukebox, TV, telephone, etc.)
4. Room broadcasting - Make say/emote visible to all players in room
5. Basic combat system - Fight NPCs, gain experience

### Medium Term (Phase 3-4)
1. Character stats and leveling system
2. Equipment system (weapons, armor)
3. Wumpy kicking mechanic (core theme!)
4. Merchant/shop system
5. NPC roaming behavior
6. Quest system

### Long Term (Phase 5+)
1. Guild system with unique abilities (critical for design vision!)
2. Magic/spell system
3. WebSocket-based web client
4. Additional realms (Florida, Texas, Disney World, etc.)
5. Player housing
6. Crafting system

See DESIGN.md for complete vision and planned features.

## License

This is a passion project - see design documentation for details.
