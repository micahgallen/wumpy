# Admin System Documentation

## Overview

The MUD Admin System provides a comprehensive role-based permission system with persistent storage, audit logging, and both in-game and console command interfaces. The system implements strict ceiling rules to prevent privilege escalation and ensures all administrative actions are logged for accountability.

## Table of Contents

1. [Roles and Permissions](#roles-and-permissions)
2. [Permission Matrix](#permission-matrix)
3. [Ceiling Rules](#ceiling-rules)
4. [Data Storage](#data-storage)
5. [Commands](#commands)
6. [Ban System](#ban-system)
7. [Audit Logging](#audit-logging)
8. [Rate Limiting](#rate-limiting)
9. [Setup and Migration](#setup-and-migration)
10. [Testing](#testing)
11. [Console Interface](#console-interface)

---

## Roles and Permissions

### Role Hierarchy

The system defines four roles in order of authority (lowest to highest):

1. **Player** - Default role, no admin privileges
2. **Creator** - Can create content (kill NPCs for testing, spawn items)
3. **Sheriff** - Can enforce rules (kick, ban, unban)
4. **Admin** - Highest authority, full access to all commands (can promote/demote anyone)

### Role Assignment

- New players default to **Player** role
- Roles are persistent across server restarts
- Roles are stored by player ID (lowercase username)
- Each role assignment tracks:
  - Player's last known name
  - IP addresses used
  - Who granted the role
  - When the role was granted

---

## Permission Matrix

| Command      | Minimum Role | Description                    |
|--------------|--------------|--------------------------------|
| kick         | Sheriff      | Disconnect a player            |
| ban          | Sheriff      | Ban player or IP               |
| unban        | Sheriff      | Remove a ban                   |
| addlevel     | Creator      | Add levels to a player         |
| removelevel  | Creator      | Remove levels from a player    |
| kill         | Creator      | Instantly kill player/NPC      |
| spawn        | Creator      | Spawn items for testing        |
| promote      | Admin        | Promote player to higher role  |
| demote       | Admin        | Demote player to lower role    |
| adminhelp    | Player       | Show available admin commands  |

### Feature Flags

- **SHERIFF_CAN_SPAWN**: Deprecated (Sheriff no longer has spawn permission)

---

## Ceiling Rules

The system enforces strict ceiling rules to prevent abuse:

### Promotion Rules

1. **Only Admin can promote**
   - Sheriff and Creator cannot promote anyone
   - Only Admin has the promote command

2. **Cannot promote above own rank**
   - Admin cannot promote anyone above Admin (Admin is highest)

3. **No self-promotion** (except Admin)
   - Players cannot promote themselves
   - Exception: Admin can self-promote (for testing/maintenance)

4. **Cannot promote peers**
   - Admin cannot promote another Admin (unless self)

### Demotion Rules

1. **Only Admin can demote**
   - Sheriff and Creator cannot demote anyone
   - Only Admin has the demote command

2. **Admin can only be demoted by Admin**
   - Provides protection for highest authority

3. **No self-demotion** (except Admin)
   - Players cannot demote themselves
   - Exception: Admin can self-demote

4. **One-step demotion when role omitted**
   - Admin → Sheriff → Creator → Player
   - If target role not specified, demotes one step down

### Example Scenarios

```
✓ Admin promotes Player to Creator (allowed)
✗ Sheriff promotes Player to Creator (denied - only Admin can promote)
✗ Creator promotes self to Sheriff (denied - no self-promotion)
✓ Admin promotes Sheriff to Admin (allowed)
✗ Sheriff demotes Creator (denied - only Admin can demote)
✓ Admin demotes Sheriff to Creator (allowed)
```

---

## Data Storage

### Directory Structure

```
data/admin/
  ├── roles.json      # Role assignments
  └── bans.json       # Ban list
```

### Storage Adapters

Two storage implementations:

1. **FileStorageAdapter** - Production use, persists to JSON files
2. **MemoryStorageAdapter** - Testing only, data in memory

### roles.json Format

```json
{
  "playerid": {
    "role": "Admin",
    "lastKnownName": "PlayerName",
    "ips": ["192.168.1.100", "10.0.0.50"],
    "grantedBy": "creator",
    "grantedAt": "2025-11-03T12:00:00.000Z"
  }
}
```

### bans.json Format

```json
[
  {
    "playerID": "badplayer",
    "ip": "192.168.1.100",
    "playerName": "BadPlayer",
    "reason": "Harassment",
    "issuer": "sheriff1",
    "issuerName": "Sheriff Bob",
    "timestamp": "2025-11-03T12:00:00.000Z",
    "expiresAt": "2025-11-04T12:00:00.000Z"
  }
]
```

### Ban Expiry

- `expiresAt: null` = Permanent ban
- `expiresAt: <ISO timestamp>` = Temporary ban
- Expired bans are automatically filtered out during checks

---

## Commands

### In-Game Chat Commands (@ prefix)

All admin commands are prefixed with `@` in chat:

#### @kick

**Usage:** `@kick <playerOrId> [reason]`

Disconnect a player from the server.

**Examples:**
```
@kick cyberslayer
@kick cyberslayer Spamming chat
```

**Requirements:** Sheriff+

---

#### @ban

**Usage:** `@ban <playerOrId|ip> [hours] [reason]`

Ban a player by ID/name or IP address.

**Duration formats:**
- `24` or `24h` = 24 hours
- `7d` = 7 days
- `30m` = 30 minutes
- `0` or omit = Permanent

**Examples:**
```
@ban cyberslayer                    # Permanent ban
@ban cyberslayer 24 Griefing        # 24-hour ban
@ban 192.168.1.100 7d IP ban        # 7-day IP ban
```

**Requirements:** Sheriff+

---

#### @unban

**Usage:** `@unban <playerOrId|ip>`

Remove a ban by player ID or IP.

**Examples:**
```
@unban cyberslayer
@unban 192.168.1.100
```

**Requirements:** Sheriff+

---

#### @addlevel

**Usage:** `@addlevel <playerOrId> <delta>`

Add levels to a player.

**Examples:**
```
@addlevel cyberslayer 5      # Add 5 levels
@addlevel cyberslayer -2     # Subtract 2 levels (use @removelevel instead)
```

**Requirements:** Creator+

---

#### @removelevel

**Usage:** `@removelevel <playerOrId> <levels>`

Remove levels from a player. Cannot reduce below level 1.

**Examples:**
```
@removelevel cyberslayer 2      # Remove 2 levels
@removelevel abuser 5           # Remove 5 levels
```

**Requirements:** Creator+

**Notes:**
- Automatically adjusts player HP proportionally
- Cannot reduce player below level 1
- Only accepts positive numbers

---

#### @kill

**Usage:** `@kill <playerOrId|npcId>`

Instantly kill a player or NPC.

**Examples:**
```
@kill cyberslayer
@kill gronk_the_cannibal
```

**Requirements:** Creator+

---

#### @spawn

**Usage:** `@spawn <itemId> [qty]`

Spawn items in your inventory.

**Examples:**
```
@spawn test_cookie
@spawn test_cookie 10
```

**Requirements:** Creator+ (configurable for Sheriff)

---

#### @promote

**Usage:** `@promote <playerOrId> <role>`

Promote a player to a higher role.

**Valid roles:** Admin, Sheriff, Creator

**Examples:**
```
@promote cyberslayer Admin
@promote trustworthy Sheriff
```

**Requirements:** Admin (subject to ceiling rules)

---

#### @demote

**Usage:** `@demote <playerOrId> [role]`

Demote a player to a lower role.

If role is omitted, demotes one step:
- Admin → Sheriff
- Sheriff → Creator
- Creator → Player

**Examples:**
```
@demote badactor              # Demote one step
@demote badactor Player       # Demote to specific role
```

**Requirements:** Admin (subject to ceiling rules)

---

#### @adminhelp

**Usage:** `@adminhelp` or `@help`

Display available admin commands based on your role.

**Requirements:** Anyone

---

## Ban System

### Ban Types

1. **Player ID Ban** - Bans specific player account
2. **IP Ban** - Bans IP address (affects all accounts from that IP)
3. **Combined Ban** - Can ban both player ID and IP simultaneously

### Ban Enforcement

Bans are checked at:
- Player login (after password authentication)
- Connection time

Banned players see:
```
==================================================
You are banned from this server.
==================================================

Reason: [ban reason]
Duration: [until date or "Permanent"]
Banned by: [issuer name]
```

### Viewing Bans

**In-game:** Admins can use `@adminhelp` but cannot list bans in-game (use console)

**Console:**
```bash
admin> bans
```

---

## Audit Logging

All admin actions are logged to `logs/admin.log`.

### Log Format

```
[timestamp] [issuerID:issuerRank] command(args) -> result | reason
```

### Example Log Entries

```
[2025-11-03T12:00:00.000Z] [sheriff1:Sheriff] kick(cyberslayer) -> success | Spamming
[2025-11-03T12:05:00.000Z] [sheriff1:Sheriff] promote(player1, Creator) -> denied | Only Admin can promote players
[2025-11-03T12:10:00.000Z] [admin1:Admin] ban(badplayer, 24) -> success | Harassment
```

### Log Rotation

- Logs rotate automatically at 10MB
- Rotated logs are timestamped: `admin-2025-11-03T12-00-00.log`
- Old logs are preserved for auditing

### Reading Logs

```javascript
const { readAuditLog, searchAuditLog } = require('./src/admin/audit');

// Read last 100 entries
const recent = readAuditLog(100);

// Search by criteria
const filtered = searchAuditLog({
  issuerID: 'admin1',
  command: 'kick',
  limit: 50
});
```

---

## Rate Limiting

Admin commands are rate-limited to prevent spam:

- **Default:** 5 commands per 10 seconds per player
- Rate limits reset after the time window
- Rate limit state is tracked per player
- Exceeding limit shows: "Rate limit exceeded. Try again in X seconds."

### Configuration

Edit `src/admin/rateLimit.js`:

```javascript
const rateLimiter = new RateLimiter(5, 10); // maxCommands, windowSeconds
```

### Clearing Rate Limits

```javascript
rateLimiter.clearLimit('playerID');
```

---

## Setup and Migration

### First-Time Setup

1. Install the system:
   ```bash
   # System is automatically integrated with server
   node src/server.js
   ```

2. Run migration (if you have existing players):
   ```bash
   node scripts/migrateAddAdminRole.js
   ```

   This will:
   - Create backup of `players.json`
   - Add `role: "Player"` to all existing players
   - Grant `role: "Admin"` to player "cyberslayer"

3. Verify migration:
   - Check `backups/` directory for backup file
   - Check `players.json` for role assignments

### Bootstrapping

The admin system bootstraps automatically on server start:

```javascript
const { bootstrapAdmin } = require('./admin/bootstrap');

const adminSystem = await bootstrapAdmin({
  playerDB,
  world,
  allPlayers: players,
  combatEngine
});
```

### One-Time Grant

On first run, player **cyberslayer** receives Admin role automatically if:
- They exist in the player database
- They don't already have a role assigned

---

## Testing

### Running Tests

```bash
node tests/admin.spec.js
```

### Test Coverage

- ✓ Permission matrix validation
- ✓ Ceiling rules (promote/demote)
- ✓ Role hierarchy
- ✓ Ban system (player ID, IP, expiry)
- ✓ Storage adapters (file and memory)
- ✓ Rate limiting
- ✓ Admin service operations
- ✓ Persistence across restarts

### Test Fixtures

Tests use `MemoryStorageAdapter` for isolation:

```javascript
const storage = new MemoryStorageAdapter();
const service = new AdminService(storage);
await service.initialize();
```

---

## Console Interface

### Starting Console

The console interface allows server operators to run admin commands from the terminal:

```javascript
const { initConsoleInterface } = require('./admin/consoleBinding');

const rl = initConsoleInterface({
  adminService,
  rateLimiter,
  allPlayers,
  world,
  playerDB,
  combatEngine
});
```

### Console Commands

All commands work without `@` prefix:

```bash
admin> help
admin> kick player1 Reason here
admin> ban player1 24h Griefing
admin> addlevel player1 5
admin> removelevel player1 2
admin> promote player1 Admin
admin> demote player1
admin> bans        # List all active bans
admin> roles       # List all role assignments
admin> exit        # Exit console interface
```

### Console Privileges

Console commands execute with **Creator** privileges (full access).

### Programmatic Execution

```javascript
const { executeConsoleCommand } = require('./admin/consoleBinding');

const result = await executeConsoleCommand('kick player1', context);
console.log(result.messages);
```

---

## Security Considerations

1. **Ceiling Rules**: Strictly enforced to prevent privilege escalation
2. **Audit Logging**: All actions logged with issuer, timestamp, and reason
3. **Rate Limiting**: Prevents command spam and DoS attacks
4. **Ban Enforcement**: Checked at login and connection time
5. **IP Tracking**: Multiple IPs tracked per player for ban evasion detection
6. **Input Validation**: All commands validate arguments before execution
7. **Permission Checks**: Every command checks permissions before execution

---

## Architecture

### Module Structure

```
src/admin/
  ├── permissions.js      # Role definitions, permission matrix, ceiling rules
  ├── storage.js          # Storage adapters (File and Memory)
  ├── audit.js            # Audit logging system
  ├── service.js          # Core admin operations
  ├── commands.js         # Command implementations
  ├── rateLimit.js        # Rate limiting
  ├── chatBinding.js      # In-game @ command routing
  ├── consoleBinding.js   # Console interface
  └── bootstrap.js        # Initialization and lifecycle hooks
```

### Integration Points

1. **Server Lifecycle**
   - Bootstrap during server startup
   - Ban enforcement on player connect
   - Role update on player login

2. **Command Router**
   - Intercept @ commands in parseCommand()
   - Route to admin command handlers
   - Pass context (adminService, rateLimiter, etc.)

3. **Player Database**
   - Store roles separately from player data
   - Track player info updates
   - Support offline player operations

---

## Troubleshooting

### Player Can't Use Admin Commands

1. Check role assignment:
   ```bash
   admin> roles
   ```

2. Verify permission matrix in `src/admin/permissions.js`

3. Check audit log for denied attempts:
   ```bash
   grep "denied" logs/admin.log
   ```

### Ban Not Working

1. Verify ban exists:
   ```bash
   admin> bans
   ```

2. Check ban hasn't expired

3. Verify IP address matching (socket.remoteAddress)

### Role Not Persisting

1. Check `data/admin/roles.json` exists and is writable

2. Verify storage adapter initialization in bootstrap

3. Check for file system errors in server logs

### Rate Limit Too Strict

Edit `src/admin/bootstrap.js`:

```javascript
const rateLimiter = new RateLimiter(10, 10); // 10 commands per 10 seconds
```

---

## Examples

### Complete Workflow: New Admin Setup

```bash
# 1. Run migration
node scripts/migrateAddAdminRole.js

# 2. Start server
node src/server.js

# 3. Login as cyberslayer (already has Admin role)
# In-game chat:
@adminhelp

# 4. Promote another player to Admin
@promote trustworthy Admin

# 5. Test permissions
@kick spammer Spamming chat
@addlevel newbie 5

# 6. Check audit log
# In console:
admin> bans
admin> roles
```

### Complete Ban Workflow

```bash
# Ban player for 24 hours
@ban griefer 24h Destroying builds

# Check if banned (console)
admin> bans

# Unban after appeal
@unban griefer

# Ban IP permanently
@ban 192.168.1.100 0 Known troublemaker
```

---

## API Reference

### AdminService

```javascript
const service = new AdminService(storage);
await service.initialize();

// Role management
await service.grantRole(playerID, role, issuer, playerName, playerIP);
await service.revokeRole(playerID, issuer);
service.getRole(playerID);
service.getRoleData(playerID);

// Ban management
await service.ban(target, issuer, hours, reason);
await service.unban(target, issuer);
service.isBanned(playerID, ip);
service.listBans();

// Promote/demote with ceiling checks
await service.promote(targetID, newRole, issuer, target);
await service.demote(targetID, newRole, issuer, target);
```

### Permissions

```javascript
const { hasPermission, canPromote, canDemote } = require('./admin/permissions');

// Check permission
hasPermission({ role: 'Admin' }, 'kick'); // true

// Check promotion allowed
canPromote(issuer, target, targetRole); // { allowed: boolean, reason: string }

// Check demotion allowed
canDemote(issuer, target); // { allowed: boolean, reason: string }
```

### Storage

```javascript
const { FileStorageAdapter } = require('./admin/storage');

const storage = new FileStorageAdapter('/path/to/data');
const roles = await storage.loadRoles();
await storage.saveRoles(roles);
const bans = await storage.loadBans();
await storage.saveBans(bans);
```

---

## Future Enhancements

Potential improvements for future versions:

1. **Web Dashboard** - View logs, bans, and roles in browser
2. **Discord Integration** - Send admin notifications to Discord
3. **Permission Groups** - Custom permission sets beyond fixed roles
4. **Temporary Admin** - Grant admin for limited time
5. **Action Approval** - Require multiple admins to approve bans
6. **Player Reports** - Allow players to report issues to admins
7. **Admin Chat Channel** - Private channel for admin communication

---

## Credits

Developed for The Wumpy and Grift MUD.

Built with Node.js and designed for extensibility, security, and ease of use.

---

## License

Part of The Wumpy and Grift MUD codebase.
