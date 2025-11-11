# Candle Blowing Feature - Quick Start Guide

## For Players

### How to Use
1. Go to Sesame Street main plaza (room ID: `sesame_street_01`)
2. Type one of these commands:
   - `blow`
   - `blow candles`
   - `blowout`

### What Happens
- You see a huge colorful ASCII art celebration with "HAPPY BIRTHDAY TEXAN!"
- Bert stops panicking about fire codes
- Cookie Monster lunges toward the cake
- Ernie gets disappointed
- Big Bird comes back from the "blast radius"
- Everyone else in the room sees you blow out all 40 candles heroically
- The cake description updates to reflect the now-extinguished candles

### Can I Do It Again?
Nope! Once blown, the candles stay out. It's a one-time special moment. Bert wouldn't allow re-lighting anyway.

## For Developers

### Files Created
```
/home/micah/wumpy/src/commands/interactions/blowCandles.js
/home/micah/wumpy/tests/commands/blowCandlesTest.js
/home/micah/wumpy/tests/integration/blowCandlesIntegrationTest.js
/home/micah/wumpy/world/sesame_street/CANDLE_BLOWING_FEATURE.md
/home/micah/wumpy/world/sesame_street/ASCII_PREVIEW.txt
/home/micah/wumpy/world/sesame_street/QUICK_START_CANDLE_BLOWING.md
```

### Files Modified
```
/home/micah/wumpy/src/commands.js (registered the command)
```

### Command Structure
```javascript
{
  name: 'blow',
  aliases: ['blowout'],
  execute: function(player, args, context),
  help: {
    description: 'Blow out candles on a birthday cake',
    usage: 'blow candles',
    examples: [...]
  }
}
```

### State Management
The cake object (`texan_birthday_cake`) gets a new property:
```javascript
cake.candlesBlownOut = true  // Set when candles are blown out
```

And its descriptions are updated dynamically.

### Testing
```bash
# Unit test
node tests/commands/blowCandlesTest.js

# Integration test
node tests/integration/blowCandlesIntegrationTest.js

# In-game test
# 1. Start server
# 2. Login and go to sesame_street_01
# 3. Type: blow candles
```

### Key Features
- ✅ Object-based detection (works if cake moves)
- ✅ State tracking (one-time use)
- ✅ Dynamic description updates
- ✅ NPC-aware reactions
- ✅ Room broadcasting
- ✅ Colorful ASCII art
- ✅ Help documentation
- ✅ Command aliases

### Design Pattern
This is a great template for other interactive object features:
1. Create command in `/src/commands/interactions/`
2. Check for object presence in room
3. Validate state (can the action be performed?)
4. Execute action with player feedback
5. Broadcast to room
6. Update object state
7. Modify descriptions as needed

### Future Ideas
- Add admin `relight` command
- Track who blew out the candles
- Create more cake variants
- Add wish-making mechanic
- Implement cake-cutting after blowing

## Humor Highlights

The feature includes these comedic gems:
- "47% less likely to spontaneously ignite" (overly specific)
- "Sauna-like" temperature (still too hot)
- Fire insurance premiums decreasing
- Cookie Monster circling "like a fuzzy blue shark"
- "Defeated candle soldiers" metaphor
- Thermal output measured in "Cookie Monster appetites"
- Bert's visible tears of relief
- Mr. Snuffleupagus hiding from the "blast radius"

## Support

For issues or questions:
- Check `/home/micah/wumpy/world/sesame_street/CANDLE_BLOWING_FEATURE.md` for full docs
- View ASCII preview at `/home/micah/wumpy/world/sesame_street/ASCII_PREVIEW.txt`
- Run tests to verify setup

Happy birthday candle blowing! 🎂🔥✨
