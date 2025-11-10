---
title: Server Refactor Quick Start Guide
status: proposed
created: 2025-11-10
related: [SERVER_REFACTOR_PLAN.md]
---

# Server Refactor Quick Start Guide

This is a quick reference for beginning the server.js refactoring work. For the full plan, see [SERVER_REFACTOR_PLAN.md](SERVER_REFACTOR_PLAN.md).

## Current State

```
src/server.js (869 lines)
├── Player class definition (96 lines)
├── Item/shop loading (19 lines)
├── Component initialization (22 lines)
├── State restoration (38 lines)
├── Input router (55 lines)
├── Login flow handlers (153 lines)
├── Account creation handlers (94 lines)
├── Duplicate login handlers (149 lines)
├── Login finalization (86 lines)
├── TCP server setup (53 lines)
├── Main function (30 lines)
└── Graceful shutdown (60 lines)
```

## Target State

```
src/
├── server.js (50-100 lines) ─────────── Main entry point
└── server/
    ├── Player.js (~100 lines) ───────── Player class
    ├── SessionManager.js (~200 lines) ─── Session tracking
    ├── AuthenticationFlow.js (~350 lines) Login/creation
    ├── ConnectionHandler.js (~150 lines)  Socket handling
    ├── ServerBootstrap.js (~200 lines) ── Initialization
    └── ShutdownHandler.js (~100 lines) ── Graceful shutdown
```

## Phase 1: Extract Player Class (START HERE)

### Checklist

- [ ] Create `src/server/` directory
- [ ] Create `src/server/Player.js` with Player class
- [ ] Update `src/server.js` to import from `./server/Player`
- [ ] Update `module.exports` in server.js to re-export Player
- [ ] Run `npm test` to verify no breakage
- [ ] Test manual login/logout
- [ ] Commit changes

### Commands

```bash
# 1. Create directory
mkdir -p src/server

# 2. Create Player.js (see template below)
# Use your editor to create src/server/Player.js

# 3. Test
npm test

# 4. Manual test
npm start
# In another terminal: telnet localhost 4000

# 5. Commit
git add src/server/Player.js src/server.js
git commit -m "refactor: extract Player class to src/server/Player.js

- Move Player class from server.js to dedicated module
- Maintain backward compatibility via re-export
- No behavior changes, pure code organization
- All tests passing"
```

### Player.js Template

```javascript
/**
 * Player Class
 * Represents a connected player with session state and game stats
 */
class Player {
  constructor(socket) {
    this.socket = socket;
    this.username = null;
    this.description = null;
    this.currentRoom = null;
    this.inventory = [];
    this.lastActivity = Date.now();
    this.state = 'login_username';
    this.tempUsername = null;
    this.tempPlayerData = null;
    this.tempExistingPlayer = null;
    this.tauntIndex = 0;

    // Combat stats (D20 system)
    this.level = 1;
    this.xp = 0;
    this.strength = 10;
    this.dexterity = 10;
    this.constitution = 10;
    this.intelligence = 10;
    this.wisdom = 10;
    this.charisma = 10;

    // Calculate starting HP with CON modifier: 15 + CON_mod
    const conMod = Math.floor((this.constitution - 10) / 2);
    this.maxHp = 15 + conMod;
    this.hp = this.maxHp;

    this.resistances = {};
    this.isGhost = false;
    this.lastDamageTaken = 0;
  }

  /**
   * Send a message to the player
   * @param {string} message - Message to send
   */
  send(message) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(message);
    }
  }

  /**
   * Send a message without newline
   * @param {string} message - Message to send
   */
  prompt(message) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(message);
    }
  }

  /**
   * Send the command prompt (> )
   */
  sendPrompt() {
    if (this.socket && !this.socket.destroyed && this.state === 'playing') {
      this.socket.write('\n> ');
    }
  }

  /**
   * Take damage and update HP
   * @param {number} damage - Amount of damage to take
   */
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
  }

  /**
   * Check if the player is dead
   * @returns {boolean} True if hp <= 0
   */
  isDead() {
    return this.hp <= 0;
  }
}

module.exports = Player;
```

### Changes to server.js

At the top of server.js, REPLACE:
```javascript
/**
 * Player class - Represents a connected player
 */
class Player {
  // ... 96 lines ...
}
```

WITH:
```javascript
const Player = require('./server/Player');
```

At the bottom of server.js, UPDATE:
```javascript
// Export Player class for testing
module.exports = { Player };
```

That's it for Phase 1!

## Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        server.js (main)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ async main() {                                            │  │
│  │   const components = await ServerBootstrap.initialize()  │  │
│  │   const server = net.createServer(...)                   │  │
│  │   ShutdownHandler.registerHandlers(components)           │  │
│  │   server.listen(PORT)                                    │  │
│  │ }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌───────────────┐   ┌──────────────┐   ┌──────────────┐
    │ServerBootstrap│   │ConnectionHdlr│   │ShutdownHdlr  │
    └───────┬───────┘   └──────┬───────┘   └──────────────┘
            │                  │
            │                  ├─────────────┐
            ▼                  ▼             ▼
    ┌──────────────┐   ┌──────────────┐ ┌──────────────┐
    │ PlayerDB     │   │  AuthFlow    │ │SessionManager│
    │ World        │   └──────────────┘ └──────────────┘
    │ CombatEngine │           │                │
    │ RespawnMgr   │           └────────────────┘
    │ AdminSystem  │
    └──────────────┘

Legend:
├─ ServerBootstrap: Loads items, shops, components, state
├─ ConnectionHandler: Manages TCP sockets, creates Players
├─ AuthenticationFlow: Handles login/creation state machine
├─ SessionManager: Tracks active sessions, duplicate logins
└─ ShutdownHandler: Saves state on SIGTERM/SIGINT
```

## Data Flow: Player Login

```
1. TCP Connection
   └─> ConnectionHandler.handleNewConnection()
       └─> Creates new Player(socket)
           └─> Adds to players Set
               └─> Sends banner + "Username: " prompt

2. Username Input
   └─> ConnectionHandler.onData()
       └─> AuthenticationFlow.handleInput(player, input)
           └─> handleLoginUsername()
               ├─> playerDB.exists(username) ?
               │   ├─ YES: state = 'login_password'
               │   └─ NO:  state = 'create_username'
               └─> Prompts accordingly

3. Password Input
   └─> handleLoginPassword()
       ├─> playerDB.authenticate(username, password)
       ├─> Load player data (inventory, stats, currency)
       ├─> Calculate maxHp, recalculate stats with equipment
       └─> Check for duplicate login
           ├─ NO DUPLICATE:
           │  ├─> sessionManager.registerSession(player)
           │  ├─> state = 'playing'
           │  └─> parseCommand('look')
           │
           └─ DUPLICATE:
              ├─> sessionManager.handleDuplicateLogin()
              └─> state = 'duplicate_login_choice'

4a. Reconnect Choice (Option 1)
    └─> sessionManager.handleReconnect()
        ├─> Transfer socket to existing player
        ├─> Clean up old socket
        ├─> Remove new player from Set
        └─> Continue at existing location

4b. Respawn Choice (Option 2)
    └─> sessionManager.handleRespawnWithCooldown()
        ├─> Set old player state = 'pending_disconnect'
        ├─> setTimeout(5000)
        ├─> After cooldown: disconnect old session
        └─> finalize new login at entry point
```

## Common Tasks

### Run Tests
```bash
npm test                  # All tests
npm run test:combat       # Combat only
npm run test:integration  # Integration only
```

### Manual Testing
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Connect
telnet localhost 4000
# Or: nc localhost 4000

# Test scenarios:
# 1. Create new account
# 2. Login with existing account
# 3. Login while already logged in (duplicate)
#    - Test reconnect (option 1)
#    - Test respawn with cooldown (option 2)
# 4. Disconnect and reconnect
# 5. Ctrl+C server, verify state saves
```

### Check Test Coverage
```bash
# After each phase, verify all tests pass
npm test 2>&1 | grep -E "(PASSED|FAILED|Error)"
```

### Verify No Regressions
```bash
# Before refactor: save baseline
npm test > baseline_tests.txt

# After each phase: compare
npm test > phase1_tests.txt
diff baseline_tests.txt phase1_tests.txt
# Should show no differences in test results
```

## Phase Progression

| Phase | Status | File Created | Lines Removed from server.js |
|-------|--------|--------------|------------------------------|
| 1. Player | Ready | `server/Player.js` | ~100 |
| 2. SessionManager | Next | `server/SessionManager.js` | ~200 |
| 3. AuthenticationFlow | Pending | `server/AuthenticationFlow.js` | ~400 |
| 4. ConnectionHandler | Pending | `server/ConnectionHandler.js` | ~150 |
| 5. ServerBootstrap | Pending | `server/ServerBootstrap.js` | ~200 |
| 6. ShutdownHandler | Pending | `server/ShutdownHandler.js` | ~100 |
| 7. Cleanup | Pending | Documentation | - |

## Success Criteria Per Phase

### Phase 1: Player Class
- [x] Player.js created with all methods
- [ ] server.js imports Player correctly
- [ ] module.exports maintains backward compat
- [ ] `npm test` passes
- [ ] Manual login/logout works
- [ ] Combat still works (damage, death)

### Phase 2: SessionManager
- [ ] SessionManager.js created
- [ ] activeSessions Map moved
- [ ] handleReconnect() method works
- [ ] handleRespawnWithCooldown() method works
- [ ] Duplicate login scenarios work
- [ ] All tests pass

(Continue for each phase...)

## Getting Help

### Where to Look
- **Full Plan**: `docs/SERVER_REFACTOR_PLAN.md`
- **Architecture Docs**: `docs/wiki/architecture/`
- **Command System**: `docs/wiki/architecture/command-system.md`
- **Project Instructions**: `.claude/instructions.md`

### Common Issues

**Issue**: Tests fail after Phase 1
- **Check**: Did you update the require statement?
- **Check**: Is Player exported from Player.js?
- **Check**: Did you re-export from server.js?

**Issue**: Players can't login after refactor
- **Check**: Are all state handlers still wired up?
- **Check**: Is handleInput() routing correctly?
- **Check**: Check logger output for errors

**Issue**: Duplicate login doesn't work
- **Check**: SessionManager.activeSessions being used?
- **Check**: Socket transfer logic intact?
- **Check**: setTimeout for 5-second cooldown working?

## Next Steps After Phase 1

Once Phase 1 is complete and tested:
1. Review the changes with team
2. Merge to main branch
3. Tag release: `v1.1.0-phase1`
4. Begin Phase 2: SessionManager
5. Follow same pattern: create module, move code, test, commit

---

**Remember**: Each phase should be independently testable and maintain backward compatibility. Take it slow, test thoroughly, and don't skip manual testing!
