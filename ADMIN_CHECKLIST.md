# Admin System Implementation Checklist

## Pre-Deployment Verification

### Core Files Created
- [x] `src/admin/permissions.js` - Role and permission definitions
- [x] `src/admin/storage.js` - Storage adapters
- [x] `src/admin/audit.js` - Audit logging
- [x] `src/admin/service.js` - Core admin operations
- [x] `src/admin/commands.js` - Command implementations
- [x] `src/admin/rateLimit.js` - Rate limiting
- [x] `src/admin/chatBinding.js` - Chat command routing
- [x] `src/admin/consoleBinding.js` - Console interface
- [x] `src/admin/bootstrap.js` - System initialization
- [x] `src/admin/README.md` - Quick reference

### Integration Complete
- [x] `src/server.js` - Admin bootstrap integrated
- [x] `src/server.js` - Ban enforcement on login
- [x] `src/server.js` - Player info updates
- [x] `src/commands.js` - @ command routing
- [x] `src/commands.js` - Admin context passing

### Testing & Documentation
- [x] `tests/admin.spec.js` - 46 tests, all passing
- [x] `docs/admin-system.md` - Complete documentation
- [x] `docs/admin-demo.md` - Demo guide with 14 scenarios
- [x] `scripts/migrateAddAdminRole.js` - Migration script
- [x] `scripts/testAdminIntegration.js` - Integration test
- [x] `ADMIN_IMPLEMENTATION_SUMMARY.md` - Summary document

### Directories Created
- [x] `src/admin/` - Core system files
- [x] `data/admin/` - Persistent storage location
- [x] `backups/` - Migration backups
- [x] `logs/` - Audit logs (existing, no change needed)

### Migration Complete
- [x] Backup created: `backups/players-backup-2025-11-03T07-50-15.json`
- [x] All 20 players migrated
- [x] Cyberslayer granted Admin role
- [x] All players have default Player role

### Testing Complete
- [x] Unit tests: 46/46 passing
- [x] Integration test: Passed
- [x] Permission matrix: Verified
- [x] Ceiling rules: Verified
- [x] Ban system: Verified
- [x] Storage persistence: Verified
- [x] Rate limiting: Verified

## Post-Deployment Testing

### Manual Testing Checklist

#### 1. Basic Login Test
- [ ] Start server: `node src/server.js`
- [ ] Connect as cyberslayer
- [ ] Verify login succeeds
- [ ] Check server logs for "Admin system ready"

#### 2. Admin Command Test
- [ ] Run `@adminhelp`
- [ ] Verify commands list shows
- [ ] Verify correct commands for Admin rank

#### 3. Permission Test
- [ ] Try `@kick testuser` (should work - Sheriff+, Admin has all perms)
- [ ] Try `@spawn sword 5` (should work - Creator+, Admin has all perms)
- [ ] Check audit log for both attempts

#### 4. Kick Command Test
- [ ] Connect second client as testuser
- [ ] From cyberslayer: `@kick testuser Test kick`
- [ ] Verify testuser disconnects
- [ ] Check audit log entry created

#### 5. Promote Test
- [ ] Promote testuser: `@promote testuser Sheriff`
- [ ] Should succeed (cyberslayer is Admin)
- [ ] Verify testuser now has Sheriff role

#### 6. Ceiling Rule Test
- [ ] Try promoting another admin: `@promote anotheradmin Sheriff`
- [ ] Should fail (cannot promote someone at your rank unless self)
- [ ] Check audit log shows denial

#### 7. Rate Limit Test
- [ ] Execute 6 commands rapidly
- [ ] Verify rate limit message after 5th command
- [ ] Wait 10 seconds, verify commands work again

#### 8. Persistence Test
- [ ] Set up a promotion or ban
- [ ] Stop server
- [ ] Start server again
- [ ] Verify promotion/ban still active
- [ ] Check `data/admin/roles.json` and `data/admin/bans.json`

#### 9. Audit Log Test
- [ ] Execute various commands
- [ ] View `logs/admin.log`
- [ ] Verify all actions logged
- [ ] Verify format matches spec

#### 10. AddLevel Command Test
- [ ] Run `@addlevel testuser 5`
- [ ] Login as testuser
- [ ] Run `score`
- [ ] Verify level increased by 5

## Production Deployment Steps

### 1. Backup Current State
```bash
# Backup player database
cp players.json backups/players-pre-admin-$(date +%Y%m%d).json

# Backup server files
tar -czf backups/server-pre-admin-$(date +%Y%m%d).tar.gz src/

# Verify backups
ls -lh backups/
```

### 2. Run Migration
```bash
# Run migration script
node scripts/migrateAddAdminRole.js

# Verify migration output
# Should see: "Total players migrated: X"
# Should see: "Cyberslayer found: Yes (granted Admin role)"
```

### 3. Verify Migration
```bash
# Check roles were assigned
grep -i '"role"' players.json | head -5

# Verify cyberslayer is Admin
grep -A 5 '"cyberslayer"' players.json | grep role
```

### 4. Test Integration
```bash
# Run integration test
node scripts/testAdminIntegration.js

# Should see: "All integration tests passed!"
```

### 5. Run Test Suite
```bash
# Run full test suite
node tests/admin.spec.js

# Should see: "pass 46" and "fail 0"
```

### 6. Start Server
```bash
# Start server in foreground (for initial testing)
node src/server.js

# Look for these log lines:
# - "Bootstrapping admin system..."
# - "Admin system initialized successfully."
# - "Admin role granted to cyberslayer." (first run only)
# - "Admin system ready."
```

### 7. Initial Login Test
```bash
# In another terminal, connect via telnet
telnet localhost 4000

# Login as cyberslayer
# Run: @adminhelp
# Verify commands show up
```

### 8. Grant Sheriff Role
```bash
# From cyberslayer in-game:
@promote cyberslayer Sheriff

# Should fail with self-promotion error

# Use console to grant Sheriff (if needed):
# Create a console script or use data/admin/roles.json directly
```

### 9. Monitor Initial Usage
```bash
# Watch audit log in real-time
tail -f logs/admin.log

# Execute test commands and verify logging
```

### 10. Production Deployment
```bash
# Once testing passes, run in background
nohup node src/server.js > server.log 2>&1 &

# Monitor logs
tail -f server.log
tail -f logs/admin.log
```

## Rollback Plan

If issues occur, rollback steps:

### Quick Rollback
```bash
# 1. Stop server
killall node

# 2. Restore player database
cp backups/players-pre-admin-YYYYMMDD.json players.json

# 3. Restore server files
tar -xzf backups/server-pre-admin-YYYYMMDD.tar.gz

# 4. Restart server
node src/server.js
```

### Partial Rollback (Keep Admin System)
If admin system has issues but you want to keep players:

```bash
# Edit src/commands.js - comment out admin command routing
# Edit src/server.js - comment out admin bootstrap

# Restart server
node src/server.js
```

## Monitoring and Maintenance

### Daily Checks
- [ ] Review audit log: `tail -100 logs/admin.log`
- [ ] Check for anomalies or abuse
- [ ] Verify no errors in server logs

### Weekly Checks
- [ ] Review active bans: Check `data/admin/bans.json`
- [ ] Review role assignments: Check `data/admin/roles.json`
- [ ] Backup admin data: `cp -r data/admin/ backups/admin-$(date +%Y%m%d)/`
- [ ] Verify disk space for logs

### Monthly Checks
- [ ] Run test suite: `node tests/admin.spec.js`
- [ ] Review audit log for patterns
- [ ] Archive old audit logs
- [ ] Update documentation if needed

### Audit Log Rotation
```bash
# When logs exceed 10MB, they auto-rotate
# Manual rotation if needed:
mv logs/admin.log logs/admin-$(date +%Y%m%d-%H%M%S).log
touch logs/admin.log
```

## Troubleshooting

### Common Issues

#### Issue: Commands not working
**Check:**
1. Is player logged in? `who`
2. Does player have role? Check `data/admin/roles.json`
3. Is syntax correct? See `docs/admin-system.md`
4. Check audit log for denial reason

**Fix:**
```bash
# Grant role via editing roles.json
# Or use console interface
```

#### Issue: Bans not enforcing
**Check:**
1. Does ban exist in `data/admin/bans.json`?
2. Has ban expired? Check `expiresAt` field
3. Is IP correct? Check socket.remoteAddress format

**Fix:**
```bash
# Re-ban with correct details
# Or edit bans.json directly
```

#### Issue: Permissions not persisting
**Check:**
1. File permissions on `data/admin/`
2. Disk space: `df -h`
3. Server logs for write errors

**Fix:**
```bash
chmod 755 data/admin/
chmod 644 data/admin/*.json
```

#### Issue: Rate limit too strict
**Fix:**
```javascript
// Edit src/admin/bootstrap.js
const rateLimiter = new RateLimiter(10, 10); // Increase to 10 commands
```

### Emergency Procedures

#### Compromised Admin Account
```bash
# 1. Stop server immediately
killall node

# 2. Remove compromised admin role
# Edit data/admin/roles.json, remove entry

# 3. Review audit log for damage
grep compromised_username logs/admin.log

# 4. Unban any wrongly banned users
# Edit data/admin/bans.json

# 5. Change admin passwords
# Edit players.json or reset via PlayerDB

# 6. Restart server
node src/server.js

# 7. Notify other admins
```

#### Audit Log Corruption
```bash
# 1. Stop server
killall node

# 2. Backup corrupted log
cp logs/admin.log logs/admin-corrupted-$(date +%Y%m%d).log

# 3. Start fresh log
> logs/admin.log

# 4. Restart server
node src/server.js
```

## Documentation Quick Links

- **Full Documentation**: `docs/admin-system.md`
- **Demo Guide**: `docs/admin-demo.md`
- **API Reference**: `src/admin/README.md`
- **Implementation Summary**: `ADMIN_IMPLEMENTATION_SUMMARY.md`
- **Test Suite**: `tests/admin.spec.js`

## Support Contacts

- **Developer**: Claude (Anthropic)
- **Documentation**: See `docs/` directory
- **Issues**: Review audit logs and test suite
- **Updates**: Check git history for changes

## Sign-Off

### Implementation Complete
- Date: November 3, 2025
- Version: 1.0.0
- Status: Production Ready
- Tests: 46/46 Passing
- Migration: Complete

### Verified By
- [ ] Developer: _______________ Date: ___________
- [ ] Tester: _______________ Date: ___________
- [ ] Admin: _______________ Date: ___________

### Deployment Approved
- [ ] Technical Lead: _______________ Date: ___________
- [ ] System Admin: _______________ Date: ___________

---

**Notes:**
- This checklist should be completed in order
- Document any deviations or issues
- Keep a copy of this checklist with deployment records
- Update checklist based on deployment experience

**System is ready for production deployment.**
