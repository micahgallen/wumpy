# Duplicate Login Flow Diagrams

## Current (Vulnerable) Flow

```
CLIENT 1                          SERVER                          PLAYERS SET
--------                          ------                          -----------
   |
   |--[Connect TCP Socket]------>
                                  Create Player(socket1)
                                  player.username = null
                                  players.add(player) ----------> [Player1(null)]

   |<----[Banner + "Username:"]---
   |
   |--["cyberslayer"]------------>
                                  player.tempUsername = "cyberslayer"
                                  Check if account exists ✓

   |<----["Password:"]------------
   |
   |--["password"]--------------->
                                  Authenticate ✓
                                  player.username = "cyberslayer"
                                  player.state = 'playing'    --> [Player1("cyberslayer")]

   |<----[Welcome + look command]-


CLIENT 2 (DUPLICATE)              SERVER                          PLAYERS SET
--------                          ------                          -----------
   |
   |--[Connect TCP Socket]------>
                                  Create Player(socket2)
                                  player.username = null
                                  players.add(player) ----------> [Player1("cyberslayer")
                                                                   Player2(null)]

   |<----[Banner + "Username:"]---
   |
   |--["cyberslayer"]------------>
                                  player.tempUsername = "cyberslayer"
                                  Check if account exists ✓

   |<----["Password:"]------------
   |
   |--["password"]--------------->
                                  Authenticate ✓
                                  ⚠️  NO DUPLICATE CHECK! ⚠️
                                  player.username = "cyberslayer"
                                  player.state = 'playing'    --> [Player1("cyberslayer")
                                                                   Player2("cyberslayer")]

   |<----[Welcome + look command]-


RESULT: TWO PLAYERS WITH SAME USERNAME! 🐛


WHO COMMAND OUTPUT:
------------------
Online Players:
Username            Realm                    Level   Status      Idle
cyberslayer         Sesame Street            1       Active      2s
cyberslayer         Sesame Street            1       Active      1s
                    ^^^^^^^^                                     ^
                    DUPLICATE!                                   SAME USERNAME!
```

---

## Fixed Flow (With Active Sessions Map)

```
ACTIVE SESSIONS MAP (NEW):
Map<username, Player>


CLIENT 1                          SERVER                          PLAYERS SET / SESSIONS MAP
--------                          ------                          ---------------------------
   |
   |--[Connect TCP Socket]------>
                                  Create Player(socket1)
                                  player.username = null
                                  players.add(player) ----------> SET: [Player1(null)]
                                                                  MAP: {}

   |<----[Banner + "Username:"]---
   |
   |--["cyberslayer"]------------>
                                  player.tempUsername = "cyberslayer"
                                  Check if account exists ✓

   |<----["Password:"]------------
   |
   |--["password"]--------------->
                                  Authenticate ✓

                                  🔍 CHECK activeSessions.get("cyberslayer")
                                     → NOT FOUND

                                  player.username = "cyberslayer"
                                  player.state = 'playing'

                                  activeSessions.set("cyberslayer", player)

                                                               -> SET: [Player1("cyberslayer")]
                                                                  MAP: {"cyberslayer" -> Player1}

   |<----[Welcome + look command]-


CLIENT 2 (DUPLICATE ATTEMPT)     SERVER                          PLAYERS SET / SESSIONS MAP
--------                          ------                          ---------------------------
   |
   |--[Connect TCP Socket]------>
                                  Create Player(socket2)
                                  player.username = null
                                  players.add(player) ----------> SET: [Player1("cyberslayer")
                                                                        Player2(null)]
                                                                  MAP: {"cyberslayer" -> Player1}

   |<----[Banner + "Username:"]---
   |
   |--["cyberslayer"]------------>
                                  player.tempUsername = "cyberslayer"
                                  Check if account exists ✓

   |<----["Password:"]------------
   |
   |--["password"]--------------->
                                  Authenticate ✓

                                  🔍 CHECK activeSessions.get("cyberslayer")
                                     → FOUND: Player1 ⚠️

                                  🔌 DISCONNECT OLD SESSION:

CLIENT 1                             Send warning message to Player1
   |<----[You have been----------      socket1.end()
   |     disconnected...]              players.delete(Player1)
   |                                   activeSessions.delete("cyberslayer")
   X [Connection closed]
                                                                  SET: [Player2(null)]
                                                                  MAP: {}

                                  ✅ REGISTER NEW SESSION:
                                  player.username = "cyberslayer"
                                  player.state = 'playing'
                                  activeSessions.set("cyberslayer", player)

                                                               -> SET: [Player2("cyberslayer")]
                                                                  MAP: {"cyberslayer" -> Player2}

CLIENT 2
   |<----[Welcome + look command]-


RESULT: ONLY ONE ACTIVE SESSION! ✅


WHO COMMAND OUTPUT:
------------------
Online Players:
Username            Realm                    Level   Status      Idle
cyberslayer         Sesame Street            1       Active      1s
                    ^^^^^^^^
                    SINGLE INSTANCE!
```

---

## Disconnection Cleanup Flow

```
CLIENT                            SERVER                          PLAYERS SET / SESSIONS MAP
------                            ------                          ---------------------------

[Player actively connected]                                       SET: [Player1("cyberslayer")]
                                                                  MAP: {"cyberslayer" -> Player1}

   |--[quit command or close]---->

                                  socket.on('end') triggered

                                  🔍 CHECK: Is this the active session?
                                     activeSessions.get("cyberslayer") === Player1?
                                     → YES ✓

                                  🧹 CLEANUP:
                                  activeSessions.delete("cyberslayer")
                                  players.delete(Player1)

                                                               -> SET: []
                                                                  MAP: {}
   X [Connection closed]


RESULT: Clean session removal. Username available for reconnection.
```

---

## Ghost Connection (Dirty Disconnect) Flow

```
CLIENT 1                          SERVER                          PLAYERS SET / SESSIONS MAP
--------                          ------                          ---------------------------

[Player actively connected]                                       SET: [Player1("cyberslayer")]
                                                                  MAP: {"cyberslayer" -> Player1}

   X [Network failure/crash]
     [No 'end' event fired]
                                  ⚠️ GHOST CONNECTION:
                                  Player1 still in memory
                                  Socket may not be marked as destroyed yet
                                                               -> SET: [Player1("cyberslayer")]
                                                                  MAP: {"cyberslayer" -> Player1}
                                                                       (STALE!)


CLIENT 2 (Reconnect attempt)      SERVER
--------                          ------
   |
   |--[Connect TCP Socket]------>
                                  Create Player(socket2)
                                  players.add(player)           -> SET: [Player1("cyberslayer")
                                                                        Player2(null)]
                                                                  MAP: {"cyberslayer" -> Player1}
   |
   |--[Login as "cyberslayer"]-->
                                  Authenticate ✓

                                  🔍 CHECK activeSessions.get("cyberslayer")
                                     → FOUND: Player1 (GHOST!) 👻

                                  🔌 ATTEMPT DISCONNECT OF GHOST:

                                  if (!Player1.socket.destroyed) {
                                    Player1.send(warning)
                                    Player1.socket.end()
                                  }

                                  players.delete(Player1)
                                  activeSessions.delete("cyberslayer")

                                                               -> SET: [Player2(null)]
                                                                  MAP: {}

                                  ✅ REGISTER NEW SESSION:
                                  activeSessions.set("cyberslayer", Player2)

                                                               -> SET: [Player2("cyberslayer")]
                                                                  MAP: {"cyberslayer" -> Player2}
   |
   |<----[Welcome + look command]-


RESULT: Ghost connection cleaned up. Reconnection successful. ✅
```

---

## Data Structure Comparison

### BEFORE (Vulnerable):

```javascript
// Only one data structure tracks players
const players = new Set();
// Set<Player> - stores Player objects by reference
// No way to look up by username efficiently
// Allows multiple Player objects with same username

// Example state with duplicate login:
Set {
  Player { username: "cyberslayer", socket: Socket1, state: "playing" },
  Player { username: "cyberslayer", socket: Socket2, state: "playing" }
}
                    ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                    BOTH ACTIVE! 🐛
```

### AFTER (Fixed):

```javascript
// Two synchronized data structures
const players = new Set();
const activeSessions = new Map();
// Set<Player> - stores all Player objects for iteration
// Map<string, Player> - maps username (lowercase) to Player object

// Example state with proper single-session enforcement:
Set {
  Player { username: "cyberslayer", socket: Socket2, state: "playing" }
}

Map {
  "cyberslayer" -> Player { username: "cyberslayer", socket: Socket2, state: "playing" }
}
                                                                       ↑↑↑↑↑↑↑↑
                                                                       ONLY ONE ACTIVE! ✅

// Previous connection was removed when new one authenticated
```

---

## Synchronization Invariants

The fix maintains these invariants at all times:

1. **Uniqueness:** `activeSessions.size <= players.size`
   - At most one active session per username

2. **Consistency:** For all `username` in `activeSessions`:
   - `activeSessions.get(username)` must be present in `players` Set

3. **Completeness:** For all `Player p` in `players`:
   - If `p.state === 'playing'` and `p.username !== null`, then
   - `activeSessions.get(p.username.toLowerCase()) === p`

4. **Case Insensitivity:**
   - `activeSessions.get("CyberSlayer")` === `activeSessions.get("cyberslayer")`
   - All keys stored as lowercase

---

## Code Integration Points

### Where activeSessions is Modified:

1. **Successful Login** (`handleLoginPassword()`)
   - Check for duplicate
   - Disconnect old session if exists
   - Add new session to map

2. **New Account Creation** (`handleCreatePassword()`)
   - Add new session to map

3. **Clean Disconnection** (`socket.on('end')`)
   - Remove from map if this is the active session

4. **Error Disconnection** (`socket.on('error')`)
   - Remove from map if this is the active session

### Where activeSessions is Queried:

1. **Login Authentication** - Check for existing session
2. **Disconnection Cleanup** - Verify this is the active session before removal

### Where activeSessions is NOT Used (Intentionally):

1. **`who` command** - Still iterates `players` Set (now guaranteed unique)
2. **`parseCommand()`** - No changes needed
3. **Combat system** - No changes needed
4. **Admin commands** - No changes needed (they use `players` Set)

---

## Performance Considerations

### Memory:

- **Additional storage:** O(N) where N = number of logged-in players
- **Map overhead:** ~40 bytes per entry (username string + pointer)
- **Impact:** Negligible (even 1000 players = ~40KB)

### CPU:

- **Login:** One additional Map lookup + one Map insert - O(1)
- **Disconnect:** One additional Map lookup + one Map delete - O(1)
- **Impact:** Negligible (< 1ms per operation)

### Network:

- **Disconnect message:** Adds one send() call to old connection
- **Impact:** Negligible (< 100 bytes)

**Conclusion:** The fix has **zero measurable performance impact**.

---

## Security Considerations

### Denial of Service (DoS) Prevention:

**Attack Scenario:** Attacker repeatedly logs in to disconnect legitimate player.

**Mitigation:**
1. Legitimate player can immediately reconnect
2. Attacker must know password (credential-based attack)
3. Can be detected via admin audit logs
4. Can be mitigated with rate limiting (future enhancement)

**Verdict:** Not a significant concern (requires compromised credentials).

### Session Hijacking:

**Question:** Could an attacker steal someone's session by logging in?

**Answer:**
- Attacker must know the password
- If password is compromised, player security is already broken
- This fix actually **improves** security by disconnecting potentially hijacked sessions

### Password Brute Force:

**Question:** Does this enable password guessing?

**Answer:**
- No change from current behavior
- Failed login attempts already fail silently
- Can be mitigated with rate limiting (future enhancement)

---

## Testing Matrix

| Test Case | Expected Behavior | Status |
|-----------|------------------|--------|
| Basic duplicate login | Old session disconnected, new session active | ⏳ To Test |
| Case insensitive | "Cyber" and "cyber" are same session | ⏳ To Test |
| Clean disconnect + reconnect | No error, seamless reconnection | ⏳ To Test |
| Ghost connection cleanup | Stale session removed, reconnection succeeds | ⏳ To Test |
| Multiple unique users | All can login simultaneously | ⏳ To Test |
| Rapid reconnection | No race condition issues | ⏳ To Test |
| `who` command accuracy | No duplicate usernames shown | ⏳ To Test |
| Combat system stability | No errors with single session | ⏳ To Test |
| Admin commands | Targeting by username works correctly | ⏳ To Test |
| Simultaneous login attempts | One succeeds, order doesn't matter | ⏳ To Test |

---

**Document Version:** 1.0
**Created:** 2025-11-07
**Author:** MUD Architect (Claude Code)
