# Admin System Quick Reference

## Commands

### Sheriff+ Commands
```
@kick <player> [reason]           Disconnect a player
@ban <player|ip> [hrs] [reason]   Ban player or IP
@unban <player|ip>                Remove ban
```

### Creator+ Commands
```
@addlevel <player> <delta>        Add levels to player
@removelevel <player> <levels>    Remove levels from player
@kill <player|npc>                Kill player or NPC
@spawn <itemId> [qty]             Spawn items
```

### Admin Only Commands
```
@promote <player> <role>          Promote to any role
@demote <player> [role]           Demote one step or to role
```

### All Ranks
```
@adminhelp                        Show available commands
```

## Roles (Authority Order: Lowest to Highest)

1. **Player** - Default, no admin access
2. **Creator** - Content creation (kill, spawn)
3. **Sheriff** - Rule enforcement (kick, ban, unban)
4. **Admin** - Full access, can promote/demote anyone

## Ceiling Rules

### Promotion
- Cannot promote above own rank
- Only Admin can promote anyone
- No self-promotion (except Admin)

### Demotion
- Cannot demote at/above own rank
- Only Admin can demote anyone
- No self-demotion (except Admin)
- Without role: steps down one level (Admin → Sheriff → Creator → Player)

## Ban System

### Ban Duration
```
24 or 24h    - 24 hours
7d           - 7 days
30m          - 30 minutes
0 or omit    - Permanent
```

### Ban Types
- Player ID: `@ban username`
- IP Address: `@ban 192.168.1.100`
- Both tracked for evasion detection

## File Locations

```
data/admin/roles.json    - Role assignments
data/admin/bans.json     - Active bans
logs/admin.log           - Audit log
players.json             - Player database
```

## Common Tasks

### Grant Sheriff to Player
```
@promote playername Sheriff
```
(Requires Admin rank)

### Ban Griefer for 24h
```
@ban griefer 24h Griefing
```

### Unban Player
```
@unban playername
```

### Give Player 5 Levels
```
@addlevel playername 5
```

### Remove 2 Levels from Player
```
@removelevel playername 2
```

### Kick Spammer
```
@kick spammer Spamming chat
```

## Troubleshooting

### Command Doesn't Work
1. Check rank: Are you high enough?
2. Check syntax: See examples above
3. Check audit log: `tail logs/admin.log`

### Permission Denied
- Command requires higher rank
- Check `@adminhelp` for your commands
- Ask higher-rank admin for promotion

### Rate Limited
- Wait 10 seconds
- Default: 5 commands per 10 seconds

## Console Commands

```javascript
// From terminal/console
admin> help
admin> bans               // List all bans
admin> roles              // List all roles
admin> kick player1
admin> addlevel player1 5
admin> removelevel player1 2
admin> promote player1 Admin
admin> exit
```

## Emergency

### Remove Compromised Admin
1. Stop server
2. Edit `data/admin/roles.json`
3. Remove their entry
4. Restart server

### Clear All Bans
1. Stop server
2. `echo "[]" > data/admin/bans.json`
3. Restart server

## Audit Log Format

```
[timestamp] [issuerID:issuerRank] command(args) -> result | reason
```

Example:
```
[2025-11-03T12:00:00.000Z] [admin1:Admin] kick(spammer) -> success | Spamming
```

## Testing

```bash
# Run test suite
node tests/admin.spec.js

# Test integration
node scripts/testAdminIntegration.js

# View audit log
tail -f logs/admin.log
```

## Documentation

- **Full Docs**: `docs/admin-system.md`
- **Demo Guide**: `docs/admin-demo.md`
- **API Reference**: `src/admin/README.md`
- **Summary**: `ADMIN_IMPLEMENTATION_SUMMARY.md`
- **Checklist**: `ADMIN_CHECKLIST.md`

## Support

- Check audit logs for issues
- Review error messages
- See full documentation
- Run test suite to verify system health

---

**Quick Start**: Login as cyberslayer → Run `@adminhelp` → Use commands!
