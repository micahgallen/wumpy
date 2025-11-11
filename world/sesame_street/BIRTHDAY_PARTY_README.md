# Texan's 40th Birthday Party - Sesame Street Edition

This document explains the birthday party transformation of Sesame Street's main plaza and how to restore it back to normal.

## What Was Changed

### 1. Sesame Street Main Plaza Room
**File:** `/home/micah/wumpy/world/sesame_street/rooms/street.js`
**Backup:** `/home/micah/wumpy/world/sesame_street/rooms/street_backup_pre_birthday.js`

The main plaza has been transformed with:
- Birthday decorations everywhere (balloons, streamers, crooked banner)
- Party-themed room description
- Three new Muppet NPCs added to the plaza
- The infamous birthday cake with 40 candles

### 2. New Birthday Party Objects Created

**Birthday Cake:**
- File: `/home/micah/wumpy/world/sesame_street/objects/texan_birthday_cake.js`
- Features: Alarming 40-candle fire hazard, examinable, comedic descriptions
- Running gag: The thermal output is genuinely concerning

### 3. New Birthday Party NPCs Created

**Bert (Fire Safety Officer):**
- File: `/home/micah/wumpy/world/sesame_street/npcs/bert_fire_safety.js`
- Character: Panicking about fire code violations
- Dialogue: 7 lines of escalating fire safety anxiety

**Ernie (Dangerously Calm):**
- File: `/home/micah/wumpy/world/sesame_street/npcs/ernie_relaxed.js`
- Character: Completely unconcerned, roasting marshmallows
- Dialogue: 7 lines of gleeful chaos encouragement

**Cookie Monster (Volunteer Firefighter):**
- File: `/home/micah/wumpy/world/sesame_street/npcs/cookie_monster_helpful.js`
- Character: Wants to "help" by eating the cake immediately
- Dialogue: 8 lines of increasingly desperate cake-related justifications

### 4. Welcome Banner Modified
**File:** `/home/micah/wumpy/src/banner.js`
- Added: `getTexanBirthdayBanner()` function
- Exported the new birthday banner function

**File:** `/home/micah/wumpy/src/server/ConnectionHandler.js`
- Modified to use `getTexanBirthdayBanner()` instead of `getBanner()`
- Shows special birthday message on login

## How to Restore Everything

### Quick Restoration (Manual)

1. **Restore the Main Plaza:**
```bash
cp /home/micah/wumpy/world/sesame_street/rooms/street_backup_pre_birthday.js /home/micah/wumpy/world/sesame_street/rooms/street.js
```

2. **Restore the Welcome Banner:**

Edit `/home/micah/wumpy/src/server/ConnectionHandler.js`:

Change line 2 from:
```javascript
const { getBanner, getTexanBirthdayBanner } = require('../banner');
```
Back to:
```javascript
const { getBanner } = require('../banner');
```

Change line 45 from:
```javascript
player.send('\n' + getTexanBirthdayBanner() + '\n');
```
Back to:
```javascript
player.send('\n' + getBanner() + '\n');
```

3. **Optional: Remove Birthday Party Files**

If you want to completely remove the birthday party content:
```bash
rm /home/micah/wumpy/world/sesame_street/objects/texan_birthday_cake.js
rm /home/micah/wumpy/world/sesame_street/npcs/bert_fire_safety.js
rm /home/micah/wumpy/world/sesame_street/npcs/ernie_relaxed.js
rm /home/micah/wumpy/world/sesame_street/npcs/cookie_monster_helpful.js
```

You can also optionally remove the `getTexanBirthdayBanner()` function from `/home/micah/wumpy/src/banner.js` (lines 182-278), but leaving it doesn't hurt anything.

4. **Restart the Server**
```bash
# Restart your MUD server for changes to take effect
```

### Alternative: Keep the Party Files for Later

You can keep all the birthday party NPCs and objects for future use! Just:
1. Restore the room file (step 1 above)
2. Restore the welcome banner (step 2 above)
3. Leave the NPC and object files - they won't load unless referenced by a room

## Running Gags in the Birthday Party

- **Fire Safety Crisis:** Bert is having a complete meltdown about fire code violations
- **40 Candle Inferno:** The cake is described as creating its own weather system, heat waves, and thermal zones
- **Cookie Monster's "Help":** Cookie Monster volunteered as a "firefighter" but his solution is just eating the cake
- **Ernie's Chaos:** Ernie is gleefully making everything worse by roasting marshmallows and suggesting sparklers
- **Temperature Warnings:** Multiple references to the dangerous heat output of 40 candles
- **Big Bird's Wisdom:** Big Bird has wisely moved to "the edge of the blast radius"

## Credits

Created for Jon (Texan)'s 40th birthday celebration in true Sesame Street style - educational fire safety lessons mixed with pure comedic chaos.

May your birthday be as memorable as Bert's therapy bills will be extensive.
