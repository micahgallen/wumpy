# MUD Features Roadmap
## The Wumpy and Grift - Development Priorities

**Last Updated**: November 1, 2025
**Current Phase**: Core Fundamentals Enhancement

---

## Current Implementation Status

### Fully Implemented (Working)
- Player account creation with password hashing
- Player authentication and login system
- Persistent player data storage (players.json)
- World data loading system (rooms, NPCs, objects)
- Basic command parser and dispatcher
- Room navigation with directional movement
- Room display with exits, NPCs, and objects
- Multi-player connection handling
- Graceful disconnect handling
- 10 fully-connected rooms in Sesame Street
- 8 unique NPCs with personalities
- 24 interactive objects with rich descriptions

### Partially Implemented
- **NPC System**: NPCs are visible but not interactive (no dialogue, examination)
- **Object System**: Objects display in rooms but can't be examined, taken, or used
- **Player Persistence**: Position saved, but no inventory or stats persistence

### Not Implemented
- Inventory system
- Object interaction
- NPC dialogue
- Combat system
- Character stats/progression
- Communication (say, tell, emote)
- Colored text output
- Guild system
- Spells/abilities
- Quest system

---

## Phase 1: Core Fundamentals (CRITICAL PRIORITY)

These features are essential for basic MUD functionality and should be implemented immediately.

### 1.1 Color Text Support
**Status**: Not Started
**Priority**: CRITICAL
**Complexity**: Low
**Dependencies**: None

**Description**: Add ANSI color code support throughout the system to enhance visual presentation and readability.

**Implementation**:
- Create `colors.js` utility module with ANSI escape codes
- Define color constants (red, green, yellow, blue, cyan, magenta, white, bright variants)
- Helper functions: `colorize(text, color)`, `stripColors(text)`
- Update `world.js` room formatter to use colors
- Update command outputs to use colors

**Color Scheme**:
- Room names: Bright Cyan
- Exits: Yellow
- NPCs: Green
- Objects: Magenta
- Player messages: White (default)
- Error messages: Red
- System messages: Bright Blue
- Success messages: Bright Green

**Estimated Time**: 2-3 hours

---

### 1.2 Inventory System
**Status**: Not Started
**Priority**: CRITICAL
**Complexity**: Medium
**Dependencies**: Object system enhancements

**Description**: Allow players to pick up, carry, and drop objects. Essential for item-based gameplay.

**Implementation**:
- Add `inventory` array to Player class
- Add `weight` and `capacity` properties to Player (optional for v1)
- Add `is_takeable` flag to objects (already present in world data)
- Implement `get/take [item]` command
- Implement `drop [item]` command
- Implement `inventory/i` command
- Update room display to dynamically show/hide objects based on pickup/drop
- Persist inventory in players.json
- Load inventory on player login

**Edge Cases**:
- Taking non-takeable objects (furniture, etc.)
- Taking objects not in current room
- Dropping objects already dropped
- Ambiguous item names (multiple matches)
- Container capacity limits (future enhancement)

**Estimated Time**: 4-6 hours

---

### 1.3 Examine/Look At System
**Status**: Not Started
**Priority**: CRITICAL
**Complexity**: Low-Medium
**Dependencies**: None

**Description**: Allow players to examine NPCs and objects for detailed information beyond room descriptions.

**Implementation**:
- Implement `examine/ex [target]` command
- Implement `look at [target]` alias
- Search current room for matching NPC by keywords
- Search current room for matching object by keywords
- Search player inventory for matching object by keywords
- Display NPC detailed description, level, dialogue hint
- Display object detailed description, properties
- Handle ambiguous targets (multiple matches)
- Handle invalid targets (not found)

**Display Format**:
```
> examine blue wumpy
Blue Wumpy (Level 1)
A melancholic blue creature sits here, contemplating the existential
weight of being a kickable entity in an uncaring universe...

The wumpy looks like it might have something to say.
```

**Estimated Time**: 3-4 hours

---

### 1.4 Enhanced Command Set
**Status**: Partial (only basic commands)
**Priority**: HIGH
**Complexity**: Low
**Dependencies**: Inventory system, examine system

**Description**: Expand the command vocabulary to include essential MUD commands.

**New Commands**:
- `inventory/i` - Show carried items
- `examine/ex [target]` - Detailed inspection
- `get/take [item]` - Pick up object
- `drop [item]` - Drop object
- `say [message]` - Speak in room
- `emote/: [action]` - Perform emote
- `who` - List online players
- `score` - Show character stats
- `commands` - List all available commands (enhanced help)

**Estimated Time**: 2-3 hours (after dependencies)

---

## Phase 2: Essential Gameplay (HIGH PRIORITY)

These features make the MUD playable and engaging for multiple sessions.

### 2.1 Basic Communication System
**Status**: Not Started
**Priority**: HIGH
**Complexity**: Medium
**Dependencies**: None

**Implementation**:
- `say [message]` - Broadcast to current room
- `tell [player] [message]` - Private message
- `emote/: [action]` - Third-person action
- `shout [message]` - Broadcast to entire area (future: realm-wide)
- Room-based message broadcasting to all players in room
- Player-to-player message routing
- Colorized output for different communication types

**Display Examples**:
```
> say Hello everyone!
You say, "Hello everyone!"
[Others see]: Alice says, "Hello everyone!"

> emote waves cheerfully
You wave cheerfully.
[Others see]: Alice waves cheerfully.

> tell bob I found a cookie!
You tell Bob, "I found a cookie!"
[Bob sees]: Alice tells you, "I found a cookie!"
```

**Estimated Time**: 4-5 hours

---

### 2.2 NPC Dialogue System
**Status**: Not Started
**Priority**: HIGH
**Complexity**: Medium
**Dependencies**: None

**Implementation**:
- `talk [npc]` or `talk to [npc]` command
- Random dialogue selection from NPC's dialogue array
- State tracking for conversation (basic)
- Dialogue cooldowns to prevent spam
- Future: Dialogue trees, quest triggers

**Example**:
```
> talk to blue wumpy
The Blue Wumpy stares into the middle distance, questioning its life choices.

> talk to big bird
Big Bird says, "Have you seen my friend, Mr. Snuffleupagus?"
```

**Estimated Time**: 3-4 hours

---

### 2.3 Container System
**Status**: Not Started
**Priority**: HIGH
**Complexity**: Medium-High
**Dependencies**: Inventory system

**Implementation**:
- `open [container]` command
- `close [container]` command
- `look in [container]` command
- `get [item] from [container]` command
- `put [item] in [container]` command
- Track container state (open/closed)
- Track container contents
- Prevent access to closed containers
- Weight/capacity limits per container

**Example Containers** (already in world):
- Cookie jar (general store)
- Trashcan (contains Oscar - special case)
- Nightstand (hotel room)
- Shelves (general store)

**Estimated Time**: 6-8 hours

---

### 2.4 Object Interaction System
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium
**Dependencies**: None (standalone commands)

**Implementation**:
- `use [object]` command for usable objects
- `sit on [furniture]` command
- `sleep in [bed]` command
- `read [book/sign]` command
- Object-specific responses based on `is_usable`, `can_sit_on`, etc.
- State changes (TV on/off, jukebox playing, etc.)

**Example Usable Objects** (already in world):
- Jukebox (play random song)
- Television (watch cooking show loop)
- Dartboard (play darts)
- Telephone (mysterious calls)

**Estimated Time**: 5-6 hours

---

### 2.5 Character Stats System
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium
**Dependencies**: None

**Implementation**:
- Add stats to Player class: HP, max HP, level, XP, strength, dexterity, intelligence, etc.
- `score` command to display stats
- Initialize stats on character creation
- Persist stats in players.json
- Display HP in prompts (optional)
- Stat modification system (for future combat/items)

**Example Score Display**:
```
> score
Name: Alice                    Level: 1
HP: 100/100                    XP: 0/1000

Strength:     10
Dexterity:    10
Intelligence: 10

You are a fledgling adventurer in The Wumpy and Grift.
```

**Estimated Time**: 3-4 hours

---

## Phase 3: Social & Communication (MEDIUM PRIORITY)

Features that enhance multiplayer interaction and community building.

### 3.1 Enhanced Player List
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Low
**Dependencies**: Character stats system

**Implementation**:
- `who` command with detailed player list
- Show username, level, current area, idle time
- Filter by area, level range
- Colorized display
- Player count statistics

**Example**:
```
> who
Players Online (3):
-------------------
Alice    [Lvl 1]  Sesame Street
Bob      [Lvl 3]  General Store (idle 5m)
Charlie  [Lvl 2]  Bar

Total: 3 players
```

**Estimated Time**: 2-3 hours

---

### 3.2 Social Commands
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Low-Medium
**Dependencies**: Communication system

**Implementation**:
- Emotion commands: `laugh`, `cry`, `dance`, `bow`, `wave`, etc.
- Targeted emotions: `hug [player]`, `poke [player]`, etc.
- Social action library (20-30 common actions)
- Customizable emotes for flexibility
- Colorized social output

**Example**:
```
> laugh
You laugh heartily.
[Others see]: Alice laughs heartily.

> hug blue wumpy
You hug the Blue Wumpy. It seems surprised but accepting.
```

**Estimated Time**: 3-4 hours

---

### 3.3 Communication Channels
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium
**Dependencies**: Basic communication system

**Implementation**:
- Global chat channel (newbie, ooc)
- Guild channels (when guilds implemented)
- Area channels (realm-specific)
- Channel subscription system
- Channel history/scrollback
- Admin channels

**Commands**:
- `newbie [message]` - Newbie help channel
- `chat [message]` - Global OOC chat
- `gchat [message]` - Guild chat (future)

**Estimated Time**: 4-5 hours

---

### 3.4 Player Groups/Parties
**Status**: Not Started
**Priority**: LOW
**Complexity**: Medium
**Dependencies**: Communication system

**Implementation**:
- `group [player]` - Invite to group
- `ungroup [player]` - Remove from group
- `follow [player]` - Auto-follow leader
- Shared XP (when combat implemented)
- Group chat channel
- Group movement coordination

**Estimated Time**: 5-6 hours

---

## Phase 4: Progression Systems (MEDIUM-HIGH PRIORITY)

Character advancement, rewards, and long-term engagement.

### 4.1 Combat System
**Status**: Not Started
**Priority**: HIGH
**Complexity**: High
**Dependencies**: Character stats, inventory system

**Implementation**:
- `kill [target]` or `attack [target]` command
- Turn-based combat rounds
- Damage calculation based on stats
- NPC AI (aggression levels, targeting)
- Death and respawn mechanics
- Combat flee/escape
- XP rewards for kills
- Loot drops

**Combat Flow**:
1. Player initiates combat
2. Combat rounds execute automatically
3. Both sides attack each turn
4. Combat ends on death or flee
5. Winner gains XP, loser respawns

**Estimated Time**: 10-15 hours

---

### 4.2 Experience & Leveling
**Status**: Not Started
**Priority**: HIGH
**Complexity**: Medium
**Dependencies**: Combat system, character stats

**Implementation**:
- XP gain from combat, quests, exploration
- Level-up thresholds (exponential curve)
- Stat increases on level-up
- Level-up notifications
- Skill point allocation (future)
- Level-based content gating

**Level Formula**: XP needed = 1000 * (level ^ 1.5)

**Estimated Time**: 4-5 hours

---

### 4.3 Equipment System
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium-High
**Dependencies**: Inventory system

**Implementation**:
- Equipment slots: weapon, armor, helmet, boots, gloves, etc.
- `equip [item]` or `wear [item]` command
- `unequip [slot]` or `remove [item]` command
- Stat bonuses from equipment
- Level/class requirements for equipment
- Equipment durability (future)
- Magical properties (future)

**Estimated Time**: 6-8 hours

---

### 4.4 Wumpy Kicking Mechanic
**Status**: Not Started
**Priority**: MEDIUM (High thematic importance!)
**Complexity**: Low-Medium
**Dependencies**: None (can be standalone)

**Description**: Implement the signature wumpy kicking feature - a core part of the MUD's identity.

**Implementation**:
- `kick [wumpy]` command
- Check if NPC has `is_kickable` flag
- Select random response from `kick_responses` array
- Apply physics: wumpy moves to random adjacent room
- Cooldown timer to prevent abuse
- Optional: XP for successful kicks
- Optional: Wumpy personality-based reactions

**Example**:
```
> kick blue wumpy
The Blue Wumpy accepts its fate with philosophical resignation as it flies
through the air.

The Blue Wumpy sails north into the distance!
```

**Estimated Time**: 3-4 hours

---

### 4.5 Basic Quest System
**Status**: Not Started
**Priority**: LOW
**Complexity**: High
**Dependencies**: Inventory, NPC dialogue, combat

**Implementation**:
- Quest data structure (objectives, rewards, requirements)
- Quest log/journal
- Quest acceptance from NPCs
- Objective tracking (kill X, collect Y, talk to Z)
- Quest completion and rewards
- Quest chains
- Repeatable quests

**Estimated Time**: 12-15 hours

---

## Phase 5: Advanced Features (LOW-MEDIUM PRIORITY)

Complex systems that add depth and uniqueness to the MUD.

### 5.1 Guild System (CRITICAL FOR DESIGN VISION)
**Status**: Not Started
**Priority**: MEDIUM (High thematic importance)
**Complexity**: Very High
**Dependencies**: Character stats, leveling, abilities system

**Description**: The cornerstone of the MUD's design - themed guilds with unique abilities.

**Planned Guilds** (from DESIGN.md):
- Transformers Guild (with hottub!)
- Additional themed guilds TBD

**Implementation**:
- Guild selection at character creation or via quest
- Guild-specific abilities/spells
- Guild advancement paths
- Guild halls (special areas)
- Guild-specific items/equipment
- Guild chat channels
- Guild ranks/hierarchy
- Guild quests

**Estimated Time**: 20-30 hours

---

### 5.2 Magic/Spell System
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Very High
**Dependencies**: Guild system, character stats, combat

**Implementation**:
- Spell learning system
- Mana/resource management
- Spell casting commands
- Spell targeting (self, player, NPC, area)
- Spell effects (damage, healing, buffs, debuffs)
- Spell cooldowns
- Spell interruption
- Guild-specific spell trees

**Example Spells**:
- Offensive: fireball, lightning bolt
- Defensive: shield, resist
- Utility: teleport, light, detect magic
- Healing: heal, cure poison
- Buffs: strength, haste, invisibility

**Estimated Time**: 15-20 hours

---

### 5.3 NPC Roaming/AI
**Status**: Not Started
**Priority**: LOW
**Complexity**: Medium
**Dependencies**: None

**Description**: Make NPCs with `roaming` flag wander between rooms, creating dynamic encounters.

**Implementation**:
- Periodic NPC movement system (timer-based)
- Pathfinding between connected rooms
- Room boundaries (don't leave designated area)
- Movement notifications to players in room
- Respect NPC behavior flags (aggressive, friendly, etc.)
- Time-of-day behavior patterns (future)

**Example**:
```
The Blue Wumpy wanders in from the north, looking contemplative.
...
The Blue Wumpy wanders south, still muttering philosophy.
```

**Estimated Time**: 6-8 hours

---

### 5.4 Merchant/Shop System
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium
**Dependencies**: Inventory system, currency system

**Implementation**:
- NPC merchant flag recognition
- `buy [item]` and `sell [item]` commands
- `list` command to show merchant inventory
- Item pricing system
- Currency tracking (gold, coins, etc.)
- Merchant inventory that restocks
- Haggling system (future)
- Player-run shops (future)

**NPCs Ready for Merchant System**:
- Mr. Hooper (General Store shopkeeper)
- Grover (Bartender - selling drinks)

**Estimated Time**: 8-10 hours

---

### 5.5 Crafting System
**Status**: Not Started
**Priority**: LOW
**Complexity**: Very High
**Dependencies**: Inventory, equipment, skill system

**Implementation**:
- Crafting skills (blacksmithing, alchemy, cooking, etc.)
- Recipe system
- Material gathering
- Crafting interface/commands
- Skill progression
- Quality tiers (common, rare, legendary)
- Item customization

**Estimated Time**: 20-25 hours

---

### 5.6 ASCII Art Integration
**Status**: Not Started
**Priority**: LOW
**Complexity**: Low
**Dependencies**: Color system

**Implementation**:
- ASCII art storage format (text files or embedded)
- Art display system (handle line-by-line rendering)
- Art for special locations (guild halls, boss rooms)
- Art for special events (level-up, guild join)
- Optional art toggle (for screen reader compatibility)
- Colorized ASCII art support

**Estimated Time**: 4-6 hours

---

### 5.7 Area Resets & Object Respawning
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium
**Dependencies**: World system

**Implementation**:
- Reset timers for areas
- Object respawn in original locations
- NPC respawn after death
- Restore room state (doors, containers)
- Reset notification to players in area
- Configurable reset intervals

**Estimated Time**: 5-7 hours

---

### 5.8 Weather & Time System
**Status**: Not Started
**Priority**: LOW
**Complexity**: Medium
**Dependencies**: None

**Implementation**:
- Game time tracking (faster than real time)
- Day/night cycles
- Weather patterns per realm
- Weather effects on gameplay (visibility, movement)
- Seasonal variations
- Time-based room descriptions
- Time-based NPC spawns

**Estimated Time**: 6-8 hours

---

## Phase 6: Polish & Advanced Features (LOW PRIORITY)

Nice-to-have features that enhance immersion and player experience.

### 6.1 WebSocket Client
**Status**: Not Started
**Priority**: LOW
**Complexity**: High
**Dependencies**: None (parallel development)

**Description**: Modern web-based client to replace telnet, per DESIGN.md goals.

**Implementation**:
- WebSocket server alongside TCP
- HTML/CSS/JS client interface
- Rich text formatting (colors, fonts)
- Clickable exits/objects
- Command history
- Macros/aliases
- Settings panel
- Mobile-responsive design

**Estimated Time**: 30-40 hours

---

### 6.2 Player Housing
**Status**: Not Started
**Priority**: LOW
**Complexity**: Very High
**Dependencies**: Equipment, inventory, currency

**Implementation**:
- Personal room generation
- Room customization
- Furniture placement
- Storage containers
- Decoration system
- Guest access control
- Rental/ownership mechanics

**Estimated Time**: 25-30 hours

---

### 6.3 Mail System
**Status**: Not Started
**Priority**: LOW
**Complexity**: Medium
**Dependencies**: None

**Implementation**:
- `mail [player] [message]` command
- Inbox/outbox
- Mail persistence
- Item attachments (future)
- Mail to offline players
- Mail expiration

**Estimated Time**: 5-6 hours

---

### 6.4 Achievement System
**Status**: Not Started
**Priority**: LOW
**Complexity**: Medium
**Dependencies**: Event tracking system

**Implementation**:
- Achievement definitions
- Progress tracking
- Unlock notifications
- Achievement display
- Rewards for achievements
- Leaderboards

**Estimated Time**: 8-10 hours

---

### 6.5 Admin Tools
**Status**: Not Started
**Priority**: MEDIUM
**Complexity**: Medium
**Dependencies**: Permission system

**Implementation**:
- Admin permission levels
- `goto [room]` - Teleport to any room
- `summon [player]` - Bring player to you
- `kick [player]` - Boot player
- `ban [player]` - Ban from server
- `shutdown` - Graceful server shutdown
- `reload` - Reload world data
- World editing commands
- Player inspection/modification

**Estimated Time**: 10-12 hours

---

### 6.6 Help System Enhancement
**Status**: Not Started
**Priority**: LOW
**Complexity**: Low
**Dependencies**: None

**Implementation**:
- `help [topic]` - Context-sensitive help
- Help file system (text files)
- Searchable help index
- Tutorial system for new players
- Command examples
- Concept explanations (guilds, combat, etc.)

**Estimated Time**: 6-8 hours

---

### 6.7 Aliases & Macros
**Status**: Not Started
**Priority**: LOW
**Complexity**: Medium
**Dependencies**: None

**Implementation**:
- `alias [shortcut] [command]` - Create alias
- Persistent alias storage per player
- Multi-command macros
- Variable substitution
- Default aliases (ge=get, dr=drop, etc.)

**Estimated Time**: 4-5 hours

---

## Implementation Priority Summary

### Immediate (Next Sprint)
1. Color text support - **2-3 hours**
2. Examine command - **3-4 hours**
3. Inventory system - **4-6 hours**
4. Enhanced command set - **2-3 hours**
5. Basic communication (say, emote) - **4-5 hours**

**Total**: ~15-21 hours of core development

### Short Term (1-2 Months)
- NPC dialogue system
- Container system
- Object interaction system
- Character stats
- Combat system
- Leveling system
- Wumpy kicking
- Who/score commands

### Medium Term (3-6 Months)
- Guild system (high design priority!)
- Magic/spell system
- Merchant system
- Equipment system
- NPC roaming
- Quest system
- Area resets

### Long Term (6+ Months)
- WebSocket client
- Player housing
- Crafting system
- Advanced social features
- Admin tools
- Achievement system

---

## Technical Debt & Refactoring

### Current Technical Issues
1. **Password Hashing**: Using SHA-256 instead of bcrypt/argon2
2. **No Rate Limiting**: Vulnerable to command spam
3. **Synchronous File I/O**: playerDB.save() blocks on every save
4. **No Logging System**: Console.log only, need proper logging
5. **No Event System**: Hard to extend for plugins/modules
6. **No Permission System**: All players have same access
7. **No Input Validation**: Limited sanitization of player input

### Recommended Refactors
- Implement event emitter pattern for extensibility
- Add async/await for all file operations
- Create logging module (Winston or Pino)
- Add input validation/sanitization layer
- Implement permission/role system
- Add rate limiting middleware
- Consider MVC or similar architecture for scaling

---

## Testing Strategy

### Current Testing
- Manual testing via telnet
- Basic smoke tests
- No automated test suite

### Recommended Testing
- Unit tests for core systems (commands, world loader, playerDB)
- Integration tests for command flows
- Load testing for concurrent players
- Regression testing for new features
- Test fixtures for world data
- Continuous integration setup

### Testing Tools
- Mocha/Jest for unit tests
- Supertest for integration tests
- k6 or Artillery for load testing

---

## Metrics & Success Criteria

### Phase 1 Success
- [ ] Colors displayed correctly in all outputs
- [ ] Players can examine any NPC/object
- [ ] Players can pick up and drop objects
- [ ] Inventory persists across sessions
- [ ] Players can communicate with say/emote
- [ ] All core commands functional and documented

### Phase 2 Success
- [ ] NPCs respond to dialogue commands
- [ ] Containers can be opened and used
- [ ] Objects can be interacted with (use, sit, read)
- [ ] Character stats tracked and displayed
- [ ] Who command shows accurate player list

### Phase 3 Success
- [ ] Combat system functional and balanced
- [ ] Experience and leveling working
- [ ] Wumpies can be kicked (signature feature!)
- [ ] Equipment system operational

### Phase 4+ Success
- [ ] At least 2 guilds implemented with unique abilities
- [ ] Spell system functional
- [ ] Merchant NPCs buying/selling
- [ ] WebSocket client deployed

---

## Resource Estimates

### Total Development Time (All Features)
- **Core Fundamentals (Phase 1)**: 15-21 hours
- **Essential Gameplay (Phase 2)**: 30-40 hours
- **Social & Communication (Phase 3)**: 15-20 hours
- **Progression Systems (Phase 4)**: 40-50 hours
- **Advanced Features (Phase 5)**: 100-120 hours
- **Polish & Advanced (Phase 6)**: 100-120 hours

**Grand Total**: ~300-370 hours of development

### Realistic MVP Timeline
**Minimal Viable Product** (Phases 1-2 complete): 45-60 hours
**Playable MUD** (Phases 1-3 complete): 60-80 hours
**Full-Featured MUD** (Phases 1-4 complete): 100-130 hours
**Design Vision Complete** (All phases): 300-370 hours

---

## Notes

This roadmap is a living document and will be updated as development progresses. Priorities may shift based on player feedback, technical discoveries, or creative inspiration.

The MUD is already functional and playable in its current state. Each phase adds layers of depth and engagement rather than fixing broken systems.

**Current Focus**: Phase 1 implementation to enhance the already-rich world content created by the builder.

---

*"You can't just go building a better world for people. Only people can build a better world for people. Otherwise it's just a cage."* - Terry Pratchett

But we can build the tools, systems, and framework that let players build their own better world. That's what this roadmap represents.
