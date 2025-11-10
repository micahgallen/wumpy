# Critical Bug Analysis: Duplicate Login Vulnerability

## Executive Summary

**Severity:** CRITICAL
**Impact:** Game-breaking - Players can create multiple simultaneous instances of themselves
**Root Cause:** No duplicate login prevention logic exists in the authentication flow
**Status:** Identified, fix proposed

---

## Issue Description

A single player can login multiple times with the same credentials and be instanced twice (or more) in the game simultaneously. This creates multiple Player objects in the `players` Set, all with the same username but different socket connections. This breaks fundamental MUD assumptions and can cause:

1. **Duplication exploits** - Players can be in multiple locations simultaneously
2. **Combat system abuse** - Multiple instances could attack the same NPC
3. **Inventory duplication** - Pickup/drop operations could be exploited
4. **State corruption** - PlayerDB saves only reflect the last disconnecting instance
5. **Chat/social confusion** - "who" command shows the same player multiple times
6. **XP/leveling exploits** - Multiple instances could gain XP from same kills

---

## Current Login Flow Analysis

### Connection Establishment (`/home/micah/wumpy/src/server.js`)

**Lines 339-347:**
```javascript
const server = net.createServer(socket => {
  const player = new Player(socket);
  players.add(player);  // ← NO DUPLICATE CHECK HERE

  logger.log('A new connection has been established.');

  // Welcome banner
  player.send('\n' + getBanner() + '\n');
  player.prompt('Username: ');
```

**VULNERABILITY #1:** Every new TCP connection immediately creates a new Player object and adds it to the `players` Set **without checking if that username is already connected**.

### Authentication Flow (`handleLoginPassword`, Lines 183-256)

**Lines 189-194:**
```javascript
const playerData = playerDB.authenticate(player.tempUsername, password);

if (playerData) {
  // Check ban before allowing login
  if (banEnforcementHook && banEnforcementHook(player)) {
    return; // Player is banned, connection will be closed
  }
```

**Lines 237-248:**
```javascript
player.state = 'playing';

// Update admin info
if (adminSystem) {
  updatePlayerInfoOnLogin(adminSystem.adminService, player);
}

logger.log(`Player ${player.username} logged in.`);

player.send('\n' + colors.success(`Welcome back, ${player.username}!\n\n`));
parseCommand('look', player, world, playerDB, players, null, null, adminSystem);
player.sendPrompt();
```

**VULNERABILITY #2:** After successful authentication, the player's `username` is set and they transition to 'playing' state. **No check is performed to see if another Player object with the same username already exists in the `players` Set.**

### Data Structures

**`players` Set (Line 97):**
```javascript
const players = new Set();
```

The `players` Set stores Player objects, but Set equality is based on **object identity**, not username. Two Player objects with the same username are considered different elements.

**Player Class (Lines 16-92):**
```javascript
class Player {
  constructor(socket) {
    this.socket = socket;
    this.username = null;  // Set later during login
    // ... other properties
  }
}
```

Each Player object is unique even if `username` is identical.

---

## Why Duplicate Logins Are Not Prevented

### Key Architectural Gaps

1. **No active session tracking** - The server does not maintain a mapping of `username -> Player` to track active sessions
2. **Set-based storage** - The `players` Set stores objects by reference, not by username
3. **No login validation** - The authentication flow validates credentials but not session uniqueness
4. **No "already logged in" check** - Neither `server.js` nor `playerdb.js` checks for existing connections

### Code Path for Duplicate Login

1. **Connection 1:**
   - TCP socket connects → `Player(socket1)` created → added to `players`
   - User enters "cyberslayer" / "password"
   - Authentication succeeds → `player.username = "cyberslayer"`, `state = 'playing'`
   - Player A is now in game

2. **Connection 2 (DUPLICATE):**
   - TCP socket connects → `Player(socket2)` created → added to `players`
   - User enters "cyberslayer" / "password" (same credentials!)
   - Authentication succeeds → `player.username = "cyberslayer"`, `state = 'playing'`
   - Player B is now in game **with identical username**

3. **Result:**
   - `players` Set now contains TWO Player objects
   - Both have `username === "cyberslayer"`
   - Both are in `state === 'playing'`
   - Both can execute commands independently
   - Both show up in "who" command (Line 30 in `/home/micah/wumpy/src/commands/core/who.js`)

---

## Evidence in Code

### Who Command Shows Duplicates

**`/home/micah/wumpy/src/commands/core/who.js` (Lines 29-52):**
```javascript
for (const p of allPlayers) {
  if (p.username && p.state === 'playing') {
    // ... display player
  }
}
```

This iterates over ALL Player objects. If two objects have the same username, both are displayed.

### PlayerDB Has No Connection State

**`/home/micah/wumpy/src/playerdb.js`:**

The PlayerDB class manages persistent account data but has **zero awareness** of active connections. It does not track which accounts are currently logged in. The `authenticate()` method (Lines 113-148) only validates credentials - it does not check or track session state.

### Disconnection Handling

**`/home/micah/wumpy/src/server.js` (Lines 356-363):**
```javascript
socket.on('end', () => {
  if (player.username) {
    logger.log(`Player ${player.username} disconnected.`);
  } else {
    logger.log('A connection disconnected before logging in.');
  }
  players.delete(player);
});
```

Each Player object is removed from the Set on disconnect, but **there's no notification to other instances** of the same username. If Connection 1 disconnects, Connection 2 remains active.

---

## Impact Assessment

### Gameplay Exploits

1. **Multi-location presence:** Player instances can move to different rooms
2. **Combat duplication:** Multiple instances can attack from different angles
3. **Item duplication:** One instance drops, another picks up repeatedly
4. **XP farming:** Multiple instances collect XP from shared kills
5. **Social confusion:** Chat and emotes from "same" player appear disjointed

### Data Corruption Risks

1. **Last-write-wins:** PlayerDB saves whoever logs out last
2. **Inventory loss:** If instance A picks up items, instance B's logout overwrites
3. **Level rollback:** XP/level gains on one instance could be lost
4. **Location desync:** Player's saved location depends on which instance saved last

### Technical Issues

1. **Combat system confusion:** CombatEngine may not handle duplicate usernames
2. **Admin commands:** Targeting by username may affect wrong instance
3. **Broadcast messages:** Room-wide messages duplicated to same player
4. **Performance:** Memory leak potential if instances accumulate

---

## Recommended Fix

### Primary Solution: Active Session Map + Disconnect Existing Session

Add a username-to-Player mapping and enforce single-session-per-username.

**Implementation Location:** `/home/micah/wumpy/src/server.js`

#### Step 1: Add Active Sessions Map

**After Line 97:**
```javascript
const players = new Set();
const activeSessions = new Map(); // username -> Player object
const activeInteractions = new Map();
```

#### Step 2: Enforce Single Session in Login Flow

**In `handleLoginPassword()`, after line 243 (after successful authentication), add:**

```javascript
player.state = 'playing';

// CHECK FOR DUPLICATE LOGIN
const existingPlayer = activeSessions.get(player.username.toLowerCase());
if (existingPlayer) {
  logger.log(`Duplicate login detected for ${player.username}. Disconnecting existing session.`);

  // Notify the old session
  existingPlayer.send('\n' + colors.warning('You have been disconnected because your account logged in from another location.\n'));

  // Close the old connection
  existingPlayer.socket.end();

  // Remove old player from players set
  players.delete(existingPlayer);

  // Remove from active sessions (will be re-added below)
  activeSessions.delete(player.username.toLowerCase());
}

// Register this player as the active session
activeSessions.set(player.username.toLowerCase(), player);

// Update admin info
if (adminSystem) {
  updatePlayerInfoOnLogin(adminSystem.adminService, player);
}
```

#### Step 3: Update Disconnection Handler

**Modify `socket.on('end')` at line 356:**

```javascript
socket.on('end', () => {
  if (player.username) {
    logger.log(`Player ${player.username} disconnected.`);

    // Remove from active sessions map
    // (Only if THIS player object is the current active session)
    if (activeSessions.get(player.username.toLowerCase()) === player) {
      activeSessions.delete(player.username.toLowerCase());
    }
  } else {
    logger.log('A connection disconnected before logging in.');
  }
  players.delete(player);
});
```

#### Step 4: Update Error Handler

**Modify `socket.on('error')` at line 366:**

```javascript
socket.on('error', err => {
  logger.error('Socket error:', err);

  // Remove from active sessions if this is the active player
  if (player.username && activeSessions.get(player.username.toLowerCase()) === player) {
    activeSessions.delete(player.username.toLowerCase());
  }

  players.delete(player);
});
```

#### Step 5: Handle New Account Creation

**In `handleCreatePassword()`, after line 314 (after creating account), add:**

```javascript
player.state = 'playing';

// Register new player in active sessions
activeSessions.set(player.username.toLowerCase(), player);

// Update admin info
if (adminSystem) {
  updatePlayerInfoOnLogin(adminSystem.adminService, player);
}
```

---

## Alternative Approaches Considered

### Option B: Reject New Login Attempt

Instead of disconnecting the old session, reject the new login:

**Pros:**
- Existing player not disrupted
- Simpler to implement
- Clear feedback to attacker/accidental duplicate

**Cons:**
- Legitimate player can't reconnect if their old session is stuck
- Could be used to lock out players (denial of service)
- Requires timeout mechanism for stale sessions

**Verdict:** Not recommended. Disconnecting the old session is standard MUD behavior.

### Option C: Share Session State (Link Sockets)

Allow multiple connections to control the same Player object:

**Pros:**
- Player could connect from multiple clients
- Resilient to connection issues

**Cons:**
- Extremely complex to implement correctly
- Race conditions on command input
- Unclear which socket to send output to
- Not a standard MUD pattern

**Verdict:** Not recommended. Out of scope for bug fix.

---

## Edge Cases and Considerations

### 1. Session Timeout / Ghost Connections

**Issue:** What if Connection 1 disconnects uncleanly (no 'end' event) and remains in `activeSessions`?

**Mitigation:** Check `existingPlayer.socket.destroyed` before attempting disconnect:

```javascript
if (existingPlayer) {
  if (!existingPlayer.socket.destroyed) {
    existingPlayer.send('\n' + colors.warning('You have been disconnected...\n'));
    existingPlayer.socket.end();
  }
  players.delete(existingPlayer);
  activeSessions.delete(player.username.toLowerCase());
}
```

### 2. Race Condition: Simultaneous Logins

**Issue:** Two connections authenticate at exactly the same time.

**Impact:** Both might pass the duplicate check and both get registered.

**Mitigation:** Minimal risk in practice due to:
1. Network latency makes exact timing unlikely
2. JavaScript event loop is single-threaded
3. Second login will still disconnect first when it completes

**Enhancement (if needed):** Add a "logging in" flag to prevent race:
```javascript
const loggingInUsers = new Set(); // usernames currently authenticating
```

### 3. Case Sensitivity

**Issue:** "CyberSlayer" vs "cyberslayer"

**Current State:** PlayerDB uses `.toLowerCase()` for storage (Line 63, 114 in playerdb.js).

**Implementation:** Use `.toLowerCase()` consistently in `activeSessions` map (already in proposed fix).

### 4. Admin Commands Targeting Players

**Issue:** Commands like `admin ban <username>` need to work with activeSessions.

**Assessment:** Current admin system uses `allPlayers` set and filters by username. Should work correctly after fix since only one Player object per username will exist.

### 5. Combat System

**Issue:** Does CombatEngine handle username as unique identifier?

**Assessment:** Needs verification, but fix prevents issue by ensuring uniqueness.

---

## Testing Plan

### Unit Tests

**File:** `/home/micah/wumpy/tests/test_duplicate_login.js`

```javascript
const assert = require('assert');
const net = require('net');

// Test 1: Basic duplicate login prevention
async function testDuplicateLogin() {
  // Connect client 1
  const client1 = await connectAndLogin('testuser', 'password');

  // Verify client 1 is in game
  const who1 = await sendCommand(client1, 'who');
  assert(who1.includes('testuser'));

  // Connect client 2 with same credentials
  const client2 = await connectAndLogin('testuser', 'password');

  // Verify client 1 was disconnected
  assert(client1.destroyed === true);

  // Verify client 2 is now in game
  const who2 = await sendCommand(client2, 'who');
  assert(who2.includes('testuser'));

  // Verify only ONE instance in 'who' list
  const matches = (who2.match(/testuser/g) || []).length;
  assert(matches === 1);
}

// Test 2: Disconnection cleans up activeSessions
async function testSessionCleanup() {
  const client = await connectAndLogin('testuser2', 'password');

  // Disconnect
  client.end();

  // Wait for cleanup
  await sleep(100);

  // Reconnect should succeed without "kicking" anyone
  const client2 = await connectAndLogin('testuser2', 'password');
  assert(client2.destroyed === false);
}

// Test 3: Case insensitivity
async function testCaseInsensitive() {
  const client1 = await connectAndLogin('TestUser', 'password');
  const client2 = await connectAndLogin('testuser', 'password');

  // Client 1 should be disconnected
  assert(client1.destroyed === true);
}
```

### Manual Testing

1. **Basic duplicate prevention:**
   - Connect via telnet/mudclient as "cyberslayer"
   - From another terminal, connect again as "cyberslayer"
   - Verify first connection receives disconnect message
   - Verify second connection is active
   - Run `who` command and verify only one "cyberslayer" is listed

2. **Clean disconnection:**
   - Login as "texan"
   - Disconnect cleanly (quit command)
   - Login again as "texan"
   - Verify no error, successful reconnection

3. **Dirty disconnection:**
   - Login as "cyberslayer"
   - Kill the client process (simulate network failure)
   - Wait 5 seconds
   - Login again as "cyberslayer"
   - Verify successful reconnection (old ghost session removed)

4. **Player interaction:**
   - Login as "player1"
   - Login as "player2"
   - Attempt to login as "player1" again from another client
   - Verify player2 sees player1 disconnect and reconnect in `who` list
   - Verify no duplication in game state

---

## Implementation Checklist

- [ ] Add `activeSessions` Map to server.js
- [ ] Implement duplicate check in `handleLoginPassword()`
- [ ] Implement duplicate check in `handleCreatePassword()`
- [ ] Update disconnect handler to clean up `activeSessions`
- [ ] Update error handler to clean up `activeSessions`
- [ ] Add socket.destroyed check for ghost connections
- [ ] Test basic duplicate login prevention
- [ ] Test clean disconnection and reconnection
- [ ] Test dirty disconnection (ghost session) handling
- [ ] Test case-insensitive username handling
- [ ] Verify `who` command shows no duplicates
- [ ] Verify combat system not affected
- [ ] Verify admin commands work correctly
- [ ] Test with multiple simultaneous users
- [ ] Code review for race conditions
- [ ] Document new behavior in DESIGN.md or ARCHITECTURE.md

---

## Files Requiring Modification

### Primary Changes
- **`/home/micah/wumpy/src/server.js`** - Add activeSessions map and duplicate login logic

### Testing
- **`/home/micah/wumpy/tests/test_duplicate_login.js`** (NEW) - Comprehensive test suite

### Documentation
- **`/home/micah/wumpy/docs/library/general/CLAUDE.md`** - Update with session management notes
- **`/home/micah/wumpy/docs/reports/bugs/DUPLICATE_LOGIN_FIX.md`** (NEW) - Implementation report after fix is applied

---

## Success Criteria

Fix is considered successful when:

1. ✅ A player cannot login twice with the same username
2. ✅ Attempting duplicate login disconnects the old session
3. ✅ Disconnected player receives clear notification message
4. ✅ New session becomes the active session
5. ✅ `who` command never shows duplicate usernames
6. ✅ Clean disconnection allows immediate reconnection
7. ✅ Dirty disconnection (ghost connection) is handled gracefully
8. ✅ Username comparison is case-insensitive
9. ✅ All existing tests continue to pass
10. ✅ No new bugs introduced in combat, admin, or social systems

---

## References

- **MUD Best Practices:** Single-session-per-username is standard across all major MUDs (DikuMUD, LPMud, CircleMUD, etc.)
- **Related Bug:** `/home/micah/wumpy/docs/reports/bugs/BUGFIX_LOGIN_CRASH.md` - Shows how tempUsername is used during login
- **Server Architecture:** `/home/micah/wumpy/docs/library/general/CLAUDE.md` - Server structure and player management
- **Who Command:** `/home/micah/wumpy/src/commands/core/who.js` - Demonstrates iteration over players Set

---

## Conclusion

The duplicate login vulnerability is a **critical architectural oversight** resulting from the absence of active session tracking. The server correctly authenticates credentials but fails to enforce single-session-per-username, allowing multiple Player objects with identical usernames to exist simultaneously.

The recommended fix introduces an `activeSessions` Map to track username-to-Player mappings and enforces uniqueness by disconnecting existing sessions when a duplicate login occurs. This approach is:

- ✅ Standard MUD behavior
- ✅ Minimal code change (< 30 lines)
- ✅ No breaking changes to existing systems
- ✅ Handles edge cases (ghost connections, case sensitivity)
- ✅ Provides clear user feedback

**Priority:** CRITICAL - Should be fixed before any public release or testing with multiple players.

**Estimated Implementation Time:** 1-2 hours (coding + testing)

---

**Report Generated:** 2025-11-07
**Investigated by:** MUD Architect (Claude Code)
**Severity Level:** CRITICAL
