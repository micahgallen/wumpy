# Phase 3 Fix: Complete Communication Command Migration

**Date:** 2025-11-10
**Task:** Complete remaining getDisplayName() migration for communication commands
**Status:** ✅ COMPLETE

## Objective

Fix remaining commands that broadcast player actions but weren't included in the initial Phase 3 migration. Ensure consistent use of `getDisplayName()` across all player-facing communication contexts.

## Files Modified

1. **src/commands/core/use.js** - Item usage broadcasts
2. **src/commands/core/get.js** - Item pickup/looting broadcasts (5 locations)
3. **src/commands/core/loot.js** - Container looting broadcasts
4. **src/commands/core/emote.js** - Freeform emote command
5. **src/commands/core/look.js** - Self/other player examination
6. **src/commands/core/wumpcom.js** - Global chat attribution (enhanced)

## Changes Implemented

### 1. use.js (Line 100)

**Change:** Item usage broadcasts now show display names

```javascript
// BEFORE
`${player.username} ${action} ${item.name}.`

// AFTER
`${player.getDisplayName()} ${action} ${item.name}.`
```

**Effect:** "bob eats cookie" → "Bob eats cookie"

### 2. get.js (5 Locations)

**Changes:** All item pickup and looting broadcasts updated

**Locations:**
- **Line 211:** Taking from container (currency auto-conversion)
- **Line 272:** Taking from container (normal items)
- **Line 423:** "get all from container" broadcast
- **Line 683:** Picking up from ground (currency auto-conversion)
- **Line 745:** Picking up from ground (normal items)

```javascript
// BEFORE
`${player.username} takes/picks up/loots...`

// AFTER
`${player.getDisplayName()} takes/picks up/loots...`
```

**Effect:** "bob takes sword" → "Bob takes sword"

### 3. loot.js (Line 222)

**Change:** Container looting broadcasts

```javascript
// BEFORE
`${player.username} loots the ${container.name}.`

// AFTER
`${player.getDisplayName()} loots the ${container.name}.`
```

**Effect:** "bob loots the corpse" → "Bob loots the corpse"

### 4. emote.js (Line 26)

**Change:** Freeform emote command

```javascript
// BEFORE
`${player.username} ${action}`

// AFTER
`${player.getDisplayName()} ${action}`
```

**Effect:** "bob waves" → "Bob waves"

### 5. look.js (Lines 27, 42)

**Change:** Self and other player examination displays

```javascript
// BEFORE
colors.playerName(player.username)
colors.playerName(p.username)

// AFTER
colors.playerName(player.getDisplayName())
colors.playerName(p.getDisplayName())
```

**Effect:** Looking at self or others shows capname instead of username

**Note:** Identity check (line 26) correctly remains `player.username.toLowerCase()`

### 6. wumpcom.js (Enhanced Attribution - Option C)

**Change:** Global chat now shows both display name and username

```javascript
// BEFORE
const formattedMessage = colors.wumpcom(`[WumpCom] ${player.username}: ${message}`);

// AFTER
const displayName = player.getDisplayName();
const attribution = displayName !== player.username
  ? `${displayName} (@${player.username})`
  : player.username;
const formattedMessage = colors.wumpcom(`[WumpCom] ${attribution}: ${message}`);
```

**Examples:**
- Player "bob" with capname "Bob": `[WumpCom] Bob (@bob): Hello everyone!`
- Player "alice" with no custom capname: `[WumpCom] alice: Hey there!`

**Benefits:**
- **Immersion:** Shows colorized display names for roleplay
- **Moderation:** Real username visible in parentheses for admins
- **Clarity:** No confusion about who's speaking

## WumpCom Design Decision

**Implemented:** Option C (Both display name and username)

**Rationale:**
- Global chat spans all rooms and contexts
- Players may not know each other's display names yet
- Admins need real usernames for moderation/logging
- Hybrid approach provides best of both worlds

**Alternatives considered:**
- Option A (Display name only): Lost moderation clarity
- Option B (Username only): Lost immersion/consistency

## Testing Performed

✅ All 6 files pass JavaScript syntax validation (`node -c`)
✅ Verified `getDisplayName()` at all targeted line numbers
✅ Confirmed exclude filtering still works (`player.username !== comparison`)
✅ Confirmed database operations still use `player.username` (correct)
✅ Confirmed logger calls still use `player.username` (correct)

### getDisplayName() Usage Counts

- **use.js:** 4 occurrences (broadcast + item display)
- **get.js:** 11 occurrences (5 broadcasts + item displays)
- **loot.js:** 5 occurrences (broadcast + item displays)
- **emote.js:** 1 occurrence (broadcast)
- **look.js:** 2 occurrences (self + other player display)
- **wumpcom.js:** 1 occurrence (attribution logic)

## Consistency Achieved

All player action broadcasts now consistently use `getDisplayName()`:

- ✅ Combat commands (say, yell, etc.) - Phase 3 initial
- ✅ Movement commands - Phase 3 initial
- ✅ Emote commands (predefined) - Phase 3 initial
- ✅ Item usage commands - **THIS FIX**
- ✅ Item pickup commands - **THIS FIX**
- ✅ Looting commands - **THIS FIX**
- ✅ Freeform emote - **THIS FIX**
- ✅ Player examination - **THIS FIX**
- ✅ Global chat - **THIS FIX** (enhanced)

## Remaining Correct Uses of player.username

The following uses are intentionally NOT changed:

### 1. Database Operations
```javascript
playerDB.updatePlayerInventory(player.username, ...)
playerDB.updatePlayer(player.username, ...)
playerDB.updatePlayerCurrency(player.username, ...)
```
**Reason:** Database key must be the actual username

### 2. Exclude Filtering
```javascript
p.username !== player.username
[player.username] in sendToRoom
```
**Reason:** Identity comparison needs actual username

### 3. Logger Calls
```javascript
logger.log(`Player ${player.username} ...`)
```
**Reason:** Logs should record actual usernames for debugging

### 4. Identity Checks
```javascript
targetName === player.username.toLowerCase()
```
**Reason:** Command targeting needs actual username matching

## Impact

Players will now see consistent capnames in ALL communication contexts:

- "Bob eats a cookie" instead of "bob eats a cookie"
- "Alice takes the sword" instead of "alice takes the sword"
- "Charlie loots the corpse" instead of "charlie loots the corpse"
- "[WumpCom] Bob (@bob): Hello!" for global chat attribution

This completes the Phase 3 migration and ensures a professional, immersive player experience across the entire MUD.

## Files Changed

- `/home/micah/wumpy/src/commands/core/use.js`
- `/home/micah/wumpy/src/commands/core/get.js`
- `/home/micah/wumpy/src/commands/core/loot.js`
- `/home/micah/wumpy/src/commands/core/emote.js`
- `/home/micah/wumpy/src/commands/core/look.js`
- `/home/micah/wumpy/src/commands/core/wumpcom.js`

## Completion Status

✅ **ALL TASKS COMPLETE**

All communication commands now consistently use `getDisplayName()` for player-facing broadcasts while correctly maintaining `player.username` for internal operations like database keys, logging, and identity checks.
