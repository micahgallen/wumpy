# Admin System Demo Guide

This guide walks through demonstrating all features of the admin system.

## Setup

1. **Ensure migration has run:**
   ```bash
   node scripts/migrateAddAdminRole.js
   ```

2. **Start the server:**
   ```bash
   node src/server.js
   ```

3. **Connect to the MUD:**
   ```bash
   telnet localhost 4000
   ```

---

## Demo Scenario 1: Basic Admin Commands

### Login as Admin (cyberslayer)

```
Username: cyberslayer
Password: [your password]
```

### View available commands

```
@adminhelp
```

You should see commands available to Admin rank:
- @kick
- @addlevel
- @kill
- @adminhelp

### Test kick command

1. Connect with a second client as a test user
2. As cyberslayer:
   ```
   @kick testuser Demonstration kick
   ```
3. Test user should be disconnected with message showing reason

### Test addlevel command

```
@addlevel testuser 5
```

Verify in logs that the level was changed.

### Test kill command (on NPC)

```
@kill wumpy
```

Or on a player:
```
@kill testuser
```

Player should become a ghost.

---

## Demo Scenario 2: Permission Denials

### Login as regular Player

```
Username: testuser
Password: [password]
```

### Attempt admin commands

```
@kick someone
```

Should see: "You do not have permission to use this command."

```
@promote someone Admin
```

Should see: "You do not have permission to use this command."

### Check audit log

All denied attempts are logged in `logs/admin.log`:
```
[timestamp] [testuser:Player] kick(someone) -> denied | Insufficient permissions
```

---

## Demo Scenario 3: Ban System

### Ban a player (as Admin)

```
@ban testuser 24h Test ban
```

Should succeed because Admin has all permissions (Sheriff+).

### Promote someone to Sheriff

As Admin, you can promote:

```
@promote someuser Sheriff
```

This will give someone Sheriff powers (ban, unban, kick).

### Now test Sheriff commands

Connect as the newly promoted Sheriff and try:

```
@ban testuser 24h Demonstration ban
```

### Verify ban

1. Testuser should be disconnected
2. Try to reconnect as testuser - should see ban message
3. Check audit log:
   ```
   [timestamp] [cyberslayer:Sheriff] ban(testuser, 24) -> success | Demonstration ban
   ```

### Unban

```
@unban testuser
```

Testuser can now connect again.

---

## Demo Scenario 4: Ceiling Rules

### Attempt by non-Admin to promote

Connect as a Sheriff and try:
```
@promote testuser Creator
```

Should fail with: "Only Admin can promote players"

### Attempt by Creator to promote

Connect as a Creator (if you have one) and try:
```
@promote testuser Sheriff
```

Should fail with: "Only Admin can promote players"

### Successful promotion (as Admin)

As Admin (cyberslayer):
```
@promote testuser Creator
```

Should succeed! Testuser now has Creator rank and can use kill/spawn.

### Attempt to promote peer

As Admin, try to promote another Admin:
```
@promote anotheradmin Sheriff
```

Should fail with: "Target is already at or above your rank"

### Verify promotion

```
who
```

Should show testuser's status (Admin rank not visible in who, but they can now use admin commands).

Testuser can now use:
```
@adminhelp
```

And see Admin commands available.

---

## Demo Scenario 5: Demotion

### Demote one step

As Admin:
```
@demote testuser
```

Since testuser is Creator, they'll be demoted to Player (one step down).

### Demote to specific rank

First promote back:
```
@promote testuser Sheriff
```

Then demote to specific rank:
```
@demote testuser Player
```

### Attempt invalid demotion by non-Admin

As Sheriff trying to demote someone:
```
@demote testuser
```

Should fail with: "Only Admin can demote players"

### Attempt to demote peer

As Admin trying to demote another Admin:
```
@demote anotheradmin
```

Should fail with: "You cannot demote someone at or above your rank"

---

## Demo Scenario 6: Rate Limiting

As cyberslayer, rapidly execute commands:

```
@adminhelp
@adminhelp
@adminhelp
@adminhelp
@adminhelp
@adminhelp
```

After 5 commands in 10 seconds:
```
Rate limit exceeded. Try again in X seconds.
```

Wait 10 seconds, then commands work again.

---

## Demo Scenario 7: Spawn Command (Creator only)

### Attempt as non-Creator

As Admin or Sheriff:
```
@spawn test_cookie
```

Should fail: "You do not have permission to use this command."

### Use as Creator

Need Creator rank. Using console:

```bash
# Promote to Creator via console
node scripts/consolePromote.js cyberslayer Creator
```

Or create a Creator directly in `data/admin/roles.json`.

Then as cyberslayer with Creator rank:
```
@spawn test_cookie 5
```

Check inventory:
```
inventory
```

Should see 5 test cookies.

---

## Demo Scenario 8: IP Bans

### Ban by IP

```
@ban 192.168.1.100 0 Banned IP address
```

Any player connecting from this IP will be rejected.

### Ban player with multiple IPs

1. Player connects from 192.168.1.100 → tracked
2. Player connects from 10.0.0.50 → tracked
3. Ban player by username → both IPs are in their record
4. Admin can trace alt accounts by checking role data

---

## Demo Scenario 9: Audit Log Review

### View recent actions

```bash
cat logs/admin.log
```

Should show all admin actions:
```
[2025-11-03T12:00:00.000Z] [cyberslayer:Admin] kick(testuser) -> success | Demonstration kick
[2025-11-03T12:01:00.000Z] [cyberslayer:Sheriff] ban(testuser, 24) -> success | Demonstration ban
[2025-11-03T12:02:00.000Z] [cyberslayer:Sheriff] promote(testuser, Admin) -> success | Granted Admin to testuser
[2025-11-03T12:03:00.000Z] [testuser:Player] kick(someone) -> denied | Insufficient permissions
```

### Search audit log

Using Node:
```javascript
const { searchAuditLog } = require('./src/admin/audit');

// Find all kicks by cyberslayer
const kicks = searchAuditLog({
  issuerID: 'cyberslayer',
  command: 'kick'
});

console.log(kicks);
```

---

## Demo Scenario 10: Console Interface

### Start interactive console

```javascript
// Add to server.js after admin bootstrap:
const { initConsoleInterface } = require('./admin/consoleBinding');

initConsoleInterface({
  adminService: adminSystem.adminService,
  rateLimiter: adminSystem.rateLimiter,
  allPlayers: players,
  world: world,
  playerDB: playerDB,
  combatEngine: combatEngine
});
```

### Use console commands

```bash
admin> help
admin> bans
admin> roles
admin> kick testuser Console kick
admin> ban badplayer 48h From console
admin> promote goodplayer Admin
admin> exit
```

Console commands have Creator privileges automatically.

---

## Demo Scenario 11: Ban Expiry

### Create temporary ban

```
@ban testuser 1m Short ban for demo
```

### Wait and verify expiry

After 1 minute:
1. Ban still shows in `data/admin/bans.json`
2. But `isBanned()` returns null (expired)
3. Player can connect again
4. `listBans()` filters out expired bans

---

## Demo Scenario 12: Persistence Across Restarts

### Set up roles and bans

1. Promote player to Admin
2. Ban another player
3. Check `data/admin/roles.json` and `data/admin/bans.json`

### Restart server

```bash
# Stop server (Ctrl+C)
node src/server.js
```

### Verify persistence

1. Promoted player still has Admin rank
2. Banned player still cannot connect
3. Audit log shows all previous actions
4. Check server logs for:
   ```
   Loaded 2 role assignments
   Loaded 1 bans
   ```

---

## Demo Scenario 13: Edge Cases

### Attempt to ban self

```
@ban cyberslayer 24h Self ban
```

Should succeed (allowed) - admin can ban themselves.

### Attempt to kick offline player

```
@kick offlineplayer
```

Should fail: "Player not found or not online"

### Spawn non-existent item

```
@spawn fake_item
```

Should fail: "Item 'fake_item' not found in world"

### Add negative levels

```
@addlevel testuser -5
```

Should succeed, reducing testuser's level (minimum 1).

---

## Demo Scenario 14: Multiple Admins Coordination

### Set up multiple admins

```
@promote alice Admin
@promote bob Admin
```

### Both execute commands simultaneously

Alice:
```
@kick griefer Griefing
```

Bob (at same time):
```
@ban griefer 24h Confirmed griefer
```

Both succeed, audit log shows both actions:
```
[timestamp] [alice:Admin] kick(griefer) -> success | Griefing
[timestamp] [bob:Admin] ban(griefer, 24) -> denied | Insufficient permissions
```

Bob's ban fails because ban requires Sheriff+.

---

## Verification Checklist

After demo, verify:

- [ ] All admin commands work for appropriate ranks
- [ ] Permission denials work correctly
- [ ] Ceiling rules prevent privilege escalation
- [ ] Bans prevent login
- [ ] Ban expiry works
- [ ] Audit log captures all actions
- [ ] Rate limiting prevents spam
- [ ] Persistence across restarts works
- [ ] Console commands work
- [ ] Migration preserved existing data
- [ ] All tests pass: `node tests/admin.spec.js`

---

## Troubleshooting Demo Issues

### Commands don't work

1. Check role: Make sure player has required rank
2. Check syntax: Verify command format matches documentation
3. Check audit log: See if command was denied and why
4. Check rate limit: Wait 10 seconds if rate limited

### Bans don't work

1. Verify ban exists: Check `data/admin/bans.json`
2. Check expiry: Make sure ban hasn't expired
3. Check IP matching: Verify IP address format
4. Check ban hook: Ensure `banEnforcementHook` is installed in server.js

### Promotions don't persist

1. Check `data/admin/roles.json` - roles should be saved
2. Verify file permissions - ensure writable
3. Check for errors in server logs
4. Verify storage adapter is FileStorageAdapter, not MemoryStorageAdapter

### Audit log empty

1. Check `logs/admin.log` exists
2. Verify log directory permissions
3. Check for write errors in server logs
4. Verify audit.js is correctly imported

---

## Advanced Demo: Security Testing

### Test self-promotion protection

```
@promote cyberslayer Sheriff
```

Should fail (unless you're Creator).

### Test Creator demotion protection

```
@demote creator_account
```

Should fail unless you're Creator.

### Test permission escalation via multiple accounts

1. Create account A, promote to Admin
2. Try to promote account B to Sheriff from account A
3. Should fail (Admin can't promote to Sheriff)

### Test ban evasion detection

1. Connect as player1 from IP 192.168.1.100
2. Ban player1
3. Create player2 from same IP
4. System tracks both accounts use same IP (in roles data)
5. Admin can investigate based on IP tracking

---

## Cleanup After Demo

```bash
# Clear all bans
node -e "
const fs = require('fs');
fs.writeFileSync('data/admin/bans.json', '[]');
console.log('Bans cleared');
"

# Reset roles to defaults (keep cyberslayer as Admin)
node scripts/migrateAddAdminRole.js

# Clear audit log
> logs/admin.log

# Restart server
node src/server.js
```

---

## Demo Success Criteria

A successful demo shows:

1. **Security**: Ceiling rules prevent unauthorized privilege escalation
2. **Accountability**: All actions logged with issuer and timestamp
3. **Usability**: Commands are intuitive with clear error messages
4. **Reliability**: Persistence works across restarts
5. **Performance**: Rate limiting prevents abuse
6. **Flexibility**: Both in-game and console interfaces work
7. **Completeness**: All commands function as documented
8. **Testing**: Comprehensive test suite passes

---

## Next Steps

After demo:

1. Train admins on proper command usage
2. Establish admin policies and guidelines
3. Set up regular audit log reviews
4. Configure feature flags as needed
5. Monitor for abuse or issues
6. Document any custom modifications

---

Enjoy your new admin system!
