# Admin System

A comprehensive role-based admin system for The Wumpy and Grift MUD.

## Features

- **Role-Based Permissions**: Admin, Sheriff, Creator, Player ranks (lowest to highest)
- **Ceiling Rules**: Strict rules prevent privilege escalation and unauthorized promotions
- **Persistent Storage**: Roles and bans persist across server restarts
- **Audit Logging**: All admin actions logged with timestamp, issuer, and reason
- **Ban System**: Ban by player ID or IP address with optional expiry
- **Rate Limiting**: Prevent command spam with configurable rate limits
- **Dual Interface**: Both in-game chat commands (@) and console interface
- **Comprehensive Testing**: Full test suite covering permissions, ceiling rules, and operations

## Quick Start

### 1. Run Migration (First Time)

```bash
node scripts/migrateAddAdminRole.js
```

This grants Admin role to player "cyberslayer" and sets all other players to Player role.

### 2. Start Server

The admin system bootstraps automatically:

```bash
node src/server.js
```

### 3. Use Commands

In-game (as cyberslayer):
```
@adminhelp
@kick playerName Reason here
@promote trustworthy Admin
```

Console:
```bash
node -e "require('./src/admin/consoleBinding').executeConsoleCommand('promote player1 Admin', context)"
```

## File Structure

```
src/admin/
├── permissions.js      # Roles, permission matrix, ceiling rules
├── storage.js          # File and memory storage adapters
├── audit.js            # Audit logging system
├── service.js          # Core admin operations
├── commands.js         # Command implementations
├── rateLimit.js        # Rate limiting
├── chatBinding.js      # In-game @ command routing
├── consoleBinding.js   # Console interface
├── bootstrap.js        # Initialization and lifecycle hooks
└── README.md           # This file

data/admin/
├── roles.json          # Persistent role assignments
└── bans.json           # Persistent ban list

logs/
└── admin.log           # Audit log (auto-rotates at 10MB)
```

## Commands

| Command      | Usage                                  | Min Rank |
|--------------|----------------------------------------|----------|
| kick         | `@kick <player> [reason]`              | Sheriff  |
| ban          | `@ban <player\|ip> [hours] [reason]`   | Sheriff  |
| unban        | `@unban <player\|ip>`                  | Sheriff  |
| addlevel     | `@addlevel <player> <delta>`           | Creator  |
| removelevel  | `@removelevel <player> <levels>`       | Creator  |
| kill         | `@kill <player\|npc>`                  | Creator  |
| spawn        | `@spawn <itemId> [qty]`                | Creator  |
| promote      | `@promote <player> <role>`             | Admin    |
| demote       | `@demote <player> [role]`              | Admin    |
| adminhelp    | `@adminhelp`                           | Player   |

## Ceiling Rules

### Promotion

- Cannot promote above own rank
- Only Admin can promote anyone (Sheriff and Creator cannot promote)
- No self-promotion (except Admin)
- Cannot promote peers or superiors

### Demotion

- Cannot demote at or above own rank
- Only Admin can demote anyone (Sheriff and Creator cannot demote)
- No self-demotion (except Admin)
- One-step demotion when role omitted: Admin → Sheriff → Creator → Player

## Integration

The admin system integrates with the server automatically. Key integration points:

### Server Initialization (src/server.js)

```javascript
const { bootstrapAdmin, createBanEnforcementHook, updatePlayerInfoOnLogin } = require('./admin/bootstrap');

// Bootstrap admin system
const adminSystem = await bootstrapAdmin({
  playerDB,
  world,
  allPlayers: players,
  combatEngine
});

// Create ban enforcement hook
const banEnforcementHook = createBanEnforcementHook(adminSystem.adminService);
```

### Login Flow

```javascript
// Check ban before allowing login
if (banEnforcementHook && banEnforcementHook(player)) {
  return; // Player is banned
}

// Update player info after successful login
if (adminSystem) {
  await updatePlayerInfoOnLogin(adminSystem.adminService, player);
}
```

### Command Parsing (src/commands.js)

```javascript
const { isAdminCommand, executeAdminCommand } = require('./admin/chatBinding');

// Check for admin commands (starting with @)
if (adminSystem && isAdminCommand(trimmed)) {
  const context = {
    adminService: adminSystem.adminService,
    rateLimiter: adminSystem.rateLimiter,
    allPlayers, world, playerDB, combatEngine
  };
  executeAdminCommand(trimmed, player, context);
  return;
}
```

## Testing

Run the comprehensive test suite:

```bash
node tests/admin.spec.js
```

Tests cover:
- Permission matrix validation
- Ceiling rules (promote/demote)
- Role management
- Ban system (player ID, IP, expiry)
- Storage persistence
- Rate limiting
- Edge cases and security

## Documentation

- **Full Documentation**: `/docs/admin-system.md`
- **Demo Guide**: `/docs/admin-demo.md`
- **Migration Script**: `/scripts/migrateAddAdminRole.js`
- **Test Suite**: `/tests/admin.spec.js`

## API Usage

### AdminService

```javascript
const AdminService = require('./admin/service');
const { FileStorageAdapter } = require('./admin/storage');

const storage = new FileStorageAdapter();
const service = new AdminService(storage);
await service.initialize();

// Grant role
await service.grantRole('player1', 'Sheriff', issuer, 'Player1', '192.168.1.1');

// Ban player
await service.ban({ playerID: 'player1' }, issuer, 24, 'Reason');

// Check if banned
const ban = service.isBanned('player1', '192.168.1.1');

// Promote with ceiling checks (only Admin can promote)
await service.promote('player1', 'Creator', issuer, target);
```

### Permissions

```javascript
const { hasPermission, canPromote, canDemote, Role } = require('./admin/permissions');

// Check permission
hasPermission({ role: Role.SHERIFF }, 'kick'); // true
hasPermission({ role: Role.ADMIN }, 'promote'); // true

// Check promotion allowed (only Admin can promote)
const result = canPromote(issuer, target, Role.CREATOR);
if (!result.allowed) {
  console.log(result.reason);
}
```

### Audit Logging

```javascript
const { writeAuditLog, readAuditLog, searchAuditLog } = require('./admin/audit');

// Write log entry
writeAuditLog({
  issuerID: 'admin1',
  issuerRank: 'Admin',
  command: 'kick',
  args: ['player1'],
  result: 'success',
  reason: 'Spamming'
});

// Read recent entries
const recent = readAuditLog(100);

// Search logs
const filtered = searchAuditLog({
  issuerID: 'admin1',
  command: 'ban'
});
```

## Configuration

### Rate Limiting

Edit `src/admin/bootstrap.js`:

```javascript
const rateLimiter = new RateLimiter(5, 10); // 5 commands per 10 seconds
```

### Feature Flags

Edit `src/admin/permissions.js`:

```javascript
const FeatureFlags = {
  SHERIFF_CAN_SPAWN: false // Set to true to allow Sheriff to spawn
};
```

### Storage Location

Edit storage path in bootstrap:

```javascript
const storage = new FileStorageAdapter('/custom/path/data/admin');
```

## Security Notes

1. **Audit Everything**: All admin actions are logged to `logs/admin.log`
2. **Ceiling Rules**: Strictly enforced to prevent privilege escalation
3. **Rate Limiting**: Prevents command spam and DoS attacks
4. **Ban Enforcement**: Checked at login and connection time
5. **IP Tracking**: Multiple IPs tracked per player for ban evasion detection
6. **Input Validation**: All commands validate arguments before execution
7. **Permission Checks**: Every command checks permissions before execution

## Maintenance

### View Active Bans

```javascript
const bans = adminService.listBans();
```

### View Role Assignments

```javascript
const roles = adminService.roles;
```

### Clear Expired Bans

Expired bans are automatically filtered during `isBanned()` checks. To permanently remove:

```javascript
adminService.bans = adminService.bans.filter(ban => {
  return !ban.expiresAt || new Date(ban.expiresAt) > new Date();
});
await adminService.storage.saveBans(adminService.bans);
```

### Backup Data

```bash
cp data/admin/roles.json backups/roles-$(date +%Y%m%d).json
cp data/admin/bans.json backups/bans-$(date +%Y%m%d).json
```

## Troubleshooting

### Commands not working

1. Check player role: `adminService.getRole('username')`
2. Check permissions: `hasPermission(actor, command)`
3. Check audit log: `cat logs/admin.log | grep username`

### Bans not enforcing

1. Verify ban exists: `cat data/admin/bans.json`
2. Check ban expiry timestamp
3. Verify `banEnforcementHook` is installed in server.js

### Roles not persisting

1. Check file permissions on `data/admin/roles.json`
2. Verify storage adapter is FileStorageAdapter
3. Check for write errors in server logs

## License

Part of The Wumpy and Grift MUD codebase.
