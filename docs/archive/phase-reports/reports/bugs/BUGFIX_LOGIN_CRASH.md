# Bugfix: Login Crash with Null Username

## Issue

Server crashed during player login with the following error:

```
TypeError: Cannot read properties of null (reading 'toLowerCase')
    at AdminService._getPlayerID (/Users/au288926/Documents/mudmud/src/admin/service.js:34:21)
    at AdminService.enforceBanOnConnect (/Users/au288926/Documents/mudmud/src/admin/service.js:361:27)
```

## Root Cause

The ban enforcement hook `enforceBanOnConnect` was called during the login flow **before** the player's `username` property was set. At that point in the login sequence:

1. Player enters password → authentication happens
2. Ban check is called with `player` object
3. `player.username` is still `null` (not set yet)
4. `player.tempUsername` contains the actual username
5. After ban check passes, `player.username` is set to `player.tempUsername`

The `enforceBanOnConnect` function tried to access `player.username.toLowerCase()`, causing a null reference error.

## Solution

Modified `src/admin/service.js` in two places:

### 1. Enhanced `enforceBanOnConnect` to Handle Login State

```javascript
enforceBanOnConnect(player) {
  // During login, username might be in tempUsername instead of username
  const username = player.username || player.tempUsername;

  if (!username) {
    // No username yet, can't check ban
    return null;
  }

  const playerID = this._getPlayerID(username);
  const playerIP = player.socket?.remoteAddress || null;

  return this.isBanned(playerID, playerIP);
}
```

**Changes:**
- Check `player.tempUsername` if `player.username` is null
- Return `null` safely if neither is set
- Prevents crash during early connection stages

### 2. Added Defensive Check to `_getPlayerID`

```javascript
_getPlayerID(username) {
  if (!username) {
    throw new Error('Username cannot be null or undefined');
  }
  return username.toLowerCase();
}
```

**Changes:**
- Explicit null/undefined check
- Throw descriptive error if username is missing
- Helps catch similar bugs in development

## Testing

Created `tests/testLogin.js` to verify:

✅ Ban enforcement works with `tempUsername` (during login)
✅ Ban enforcement works with `username` (after login)
✅ Banned players are correctly detected
✅ Players with no username return `null` safely
✅ All existing 50 tests still pass

## Files Modified

- `src/admin/service.js` - Fixed `enforceBanOnConnect` and `_getPlayerID`
- `tests/testLogin.js` - New test to verify login flow

## Impact

- **No breaking changes** - existing functionality preserved
- **Backwards compatible** - works with both username fields
- **Safe fallback** - returns null if username not available
- **Better error messages** - explicit error if username is truly invalid

## Prevention

Future code should be aware that during the login sequence:
- `player.tempUsername` = username being authenticated
- `player.username` = set only after successful authentication

Any code that needs the username during login should check both fields or be called after authentication completes.
