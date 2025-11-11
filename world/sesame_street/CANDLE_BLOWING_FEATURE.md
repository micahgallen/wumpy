# Birthday Cake Candle Blowing Feature

## Overview
An interactive feature that lets players blow out the candles on Texan's 40th birthday cake with hilarious ASCII art celebration and character-specific reactions from the Sesame Street Muppets.

## What Was Added

### 1. New Command: `blow`
**File:** `/home/micah/wumpy/src/commands/interactions/blowCandles.js`

A new command that allows players to blow out the birthday cake candles.

**Usage:**
- `blow` - Blows out candles if you're in a room with the birthday cake
- `blow candles` - Same effect
- `blowout` - Alternative alias

### 2. Features

#### ASCII Art Celebration
When a player blows out the candles, they see a massive colorful ASCII art celebration message featuring:
- "HAPPY BIRTHDAY TEXAN!" in fancy box-drawing characters
- Colorful confetti (🎊) and sparkles (✨)
- Humorous status updates about fire safety improvements
- Temperature reduction notices
- Insurance premium updates

#### State Management
- Candles can only be blown out once
- The cake object's state is tracked with `cake.candlesBlownOut = true`
- Subsequent attempts inform the player the candles are already out
- The cake's description and examine text dynamically update after candles are blown out

#### Character-Specific Reactions
When candles are blown out, NPCs in the room react appropriately:

**Bert (Fire Safety Officer):**
- Stops pacing immediately
- Clutches clipboard to chest
- Whispers gratitude to the Department of Municipal Fire Safety
- Visible tears of relief

**Cookie Monster:**
- Declares cake now safe to eat
- Volunteers for "cake disposal"
- Lunges toward cake with alarming speed

**Ernie:**
- Expresses disappointment
- Mentions he was about to suggest sparklers
- Sadly eats his marshmallow

**Big Bird:**
- Cautiously approaches from the "blast radius perimeter"
- Wants to tell Mr. Snuffleupagus it's safe

#### Room Broadcast
Everyone else in the room sees:
- An emote describing the player's heroic exhale
- Wind effects (streamers flutter)
- Fire status (40 flames surrender simultaneously)
- Temperature changes
- Insurance implications
- All the NPC reactions

#### Updated Cake Descriptions
After blowing out the candles, the cake object updates:
- Main description mentions "slightly less alarming" status
- Notes Cookie Monster circling like a shark
- References the "brief but intense thermal event"
- Examine text updates with defeated candle soldiers
- Thermal output now rated as "room temperature cake"

## Technical Implementation

### Command Registration
The command is registered in `/home/micah/wumpy/src/commands.js`:
```javascript
const blowCandlesCommand = require('./commands/interactions/blowCandles');
registry.registerCommand(blowCandlesCommand);
```

### How It Works

1. **Validation:**
   - Checks if player is in a valid room
   - Verifies the birthday cake is present in the room
   - Checks if candles are already blown out

2. **Execution:**
   - Sends ASCII art celebration to the player who blew candles
   - Displays character-specific NPC reactions to the player
   - Broadcasts event to all other players in room
   - Updates cake object state (`candlesBlownOut = true`)
   - Modifies cake descriptions dynamically

3. **State Tracking:**
   - Uses `cake.candlesBlownOut` boolean flag
   - Prevents repeated blowing (single-use feature)
   - Updates object descriptions in real-time

### Design Decisions

**Why Single-Use?**
- Makes the moment special and meaningful
- Fits the narrative (you can't re-light 40 candles easily)
- Creates a permanent state change in the world
- Bert wouldn't allow re-lighting anyway

**Why Object-Based Detection?**
- More flexible than hardcoded room checks
- Can be used with any birthday cake in the future
- Allows the feature to work if cake is moved to different rooms

**Why Dynamic Description Updates?**
- Reflects the world state accurately
- Players who arrive after the event see the aftermath
- Creates continuity in the narrative

## Testing Recommendations

1. **Basic Flow:**
   - Type `blow` or `blow candles` in room with cake
   - Verify ASCII art displays correctly
   - Confirm all NPC reactions appear
   - Check room broadcast to other players

2. **Edge Cases:**
   - Try `blow` in a room without the cake
   - Try `blow` after candles are already out
   - Verify cake description changes persist
   - Test with different numbers of players in room

3. **NPCs:**
   - Test with all NPCs present
   - Test with some NPCs missing
   - Verify reactions only show for present NPCs

## Humor Elements

- **"47% less likely to spontaneously ignite"** - Overly specific probability
- **Fire insurance premiums decrease** - Real-world consequences
- **"Sauna-like" temperature** - Still uncomfortably warm
- **Cookie Monster as shark** - Predatory cake circling
- **"Defeated candle soldiers"** - Military metaphor for wax
- **Bert's therapy bills** - Long-term psychological impact
- **"Achievement badge"** - Gaming reference for surviving 40 candles
- **"One Cookie Monster appetite"** - New unit of thermal measurement

## Future Enhancement Ideas

(Not implemented, just ideas for later)

- Add a `relight` command for admins to reset the cake
- Create different cake variants with different candle counts
- Add a wish-making mechanic before blowing
- Track who blew out the candles (achievement system)
- Add a cake-cutting command that comes after blowing candles
- Create different ASCII art for different birthday milestones

## Credits

Created for Texan's 40th birthday celebration with the perfect blend of:
- Terry Pratchett-style descriptive humor
- Sesame Street character personalities
- Fire safety comedy
- ASCII art celebration
- MUD interaction design

May all your birthday candles be blown out with such style!
