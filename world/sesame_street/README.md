# Sesame Street - Starting Area

> "Can you tell me how to get... how to get to Sesame Street?"
> *Yes, but the directions involve existential dread and possibly kicking small creatures.*

## Overview

Sesame Street serves as the starting area for **The Wumpy and Grift** MUD. It's a loving yet satirical homage to both the classic children's show and the legendary LooneyMUD Sesame Street area, filtered through a lens of 90s nostalgia and Terry Pratchett-esque wit.

This is where new players begin their journey - a place that's aggressively wholesome on the surface but with just enough weirdness around the edges to remind you that nothing is quite what it seems.

## World Statistics

- **Total Rooms**: 10
- **NPCs**: 8 (5 kickable Wumpies, 3 merchants/characters)
- **Interactive Objects**: 24
- **Atmosphere**: Friendly with undertones of surreal

## Layout

### Main Street (North-South Axis)

The central thoroughfare runs north to south, connecting the teleport hub to the entrance of Reality Street:

1. **Teleport Booth** (north) - Portal to other realms
2. **Sesame Street - Northern End** - Quiet residential area
3. **Sesame Street - Mid-North** - Wholesome perfection achieved
4. **Sesame Street - Central Plaza** - The hub (Big Bird, Oscar's trashcan)
5. **Sesame Street - Mid-South** - Hopscotch and lampposts
6. **Sesame Street - Southern End** - Entrance from Reality Street

### Buildings (East-West Branches)

Three key establishments branch off the main street:

- **Hooper's General Store** (east from Central Plaza) - Supplies and suspicious cookies
- **The Furry Arms Tavern** (west from Central Plaza) - Drinks and questionable decisions
- **The Snuggly Sleeper Hotel** (west from Mid-North) - Adequate rest in geometric comfort

## Notable Features

### The Wumpies

Five distinct wumpies roam the street, each with their own personality disorder:

- **Red Wumpy** - Aggressive confidence, never considers consequences
- **Blue Wumpy** - Melancholic philosopher, questions existence
- **Yellow Wumpy** - Manic enthusiasm, physics-defying joy
- **Green Wumpy** - Calculating accountant energy, takes notes
- **Purple Wumpy** - Regal aristocrat, maintains dignity while airborne

All wumpies are Level 1, have 20 HP, and are **kickable** for player entertainment. They're designed to roam between rooms.

### Key NPCs

- **Big Bird** (Level 5, 100 HP) - Friendly with vacant expression, looking for Snuffleupagus
- **Mr. Hooper** (Level 5, 100 HP) - Shopkeeper, merchant, seen some things
- **Grover the Bartender** (Level 5, 120 HP) - Blue, furry, judgmental, good listener
- **Oscar the Grouch** - Hidden inside the trashcan in Central Plaza

### Interactive Elements

The world includes multiple object types with various interaction flags:

- **Containers**: shelves, cookie_jar, trashcan, nightstand
- **Sittable**: street_bench, bar_stools
- **Usable**: telephone, dartboard, jukebox, television
- **Readable**: guest_book
- **Sleepable**: hotel_bed

## Writing Style

### Tone

The descriptions balance several elements:

- **Pratchett's Wit**: Observational humor, footnote-worthy details
- **King's Atmosphere**: Subtle tension, things slightly wrong
- **90s Nostalgia**: References to a simpler time (that never existed)
- **Self-Aware**: The world knows it's performing cheerfulness

### Example Techniques

- **Personification**: Objects have opinions (bells with enthusiasm, plants with determination)
- **Unexpected Details**: The concerning stain, the nervous exclamation point
- **Subverted Expectations**: Wholesomeness with an edge of wrongness
- **Sensory Richness**: Specific smells, sounds, visual details

## Technical Details

### File Structure

```
world/sesame_street/
├── rooms/          (10 files)
├── npcs/           (8 files)
├── objects/        (24 files)
├── MAP.txt         (Visual reference)
└── README.md       (This file)
```

### Room Properties

All rooms include:
- `id`: Unique identifier
- `name`: Display name
- `description`: 2-4 sentence atmospheric description
- `exits`: Array of directional connections
- `npcs`: Array of NPC IDs present
- `objects`: Array of object IDs present

### NPC Properties

Standard NPCs include:
- `id`, `name`, `description`, `keywords`
- `level`, `hp`
- `dialogue`: Array of random sayings

Wumpies additionally include:
- `is_kickable`: true
- `roaming`: true (for wandering behavior)
- `kick_responses`: Array of kick reaction messages

### Object Properties

Objects vary but can include:
- `id`, `name`, `description`, `keywords`
- `is_takeable`: Can be picked up
- `can_be_examined`: Has detailed description
- `is_container`: Can hold items
- `can_be_opened`: Requires opening
- `is_usable`: Can be activated/used
- `can_sit_on`: Furniture
- `can_sleep_in`: Rest location
- `is_readable`: Contains text

## Connections to Other Realms

### North - Teleport Booth

The telephone booth contains a magical phone that can transport players to:
- Florida
- Texas
- Springfield (The Simpsons)
- Disney World
- Other realms (to be implemented)

### South - Reality Street

The darker mirror of Sesame Street - "drug-filled, black mirror" version mentioned in design doc. Players can venture south into more dangerous territory.

## Design Philosophy

### Player Experience Goals

1. **Welcoming**: New players feel safe exploring
2. **Humorous**: Constant small jokes reward reading descriptions
3. **Memorable**: Unique details make rooms distinctive
4. **Explorable**: Clear connections invite movement
5. **Interactive**: Objects suggest experimentation

### Worldbuilding Principles

1. **Consistency**: Maintains satirical-nostalgic tone throughout
2. **Depth**: Every object has personality beyond function
3. **Subtlety**: Humor through observation, not forced jokes
4. **Atmosphere**: Details build cumulative mood
5. **Surprise**: Unexpected elements keep players engaged

## Future Expansion Ideas

### Potential Additions

- **More Hotel Rooms**: Additional guest accommodations
- **Store Stockroom**: Back room with inventory, maybe a secret
- **Bar Basement**: Mysterious lower level, storage, or speakeasy
- **Alleyways**: Narrow passages between buildings
- **Rooftop Access**: View from above, secret meetings
- **Oscar's Interior**: Inside the trashcan (pocket dimension?)
- **Additional Wumpies**: More colors, more personalities
- **Seasonal Events**: Street changes for holidays
- **Mini-Quests**: Fetch quests for merchants
- **Hidden Rooms**: Secret areas requiring discovery

### Systems to Implement

- **Wumpy Wandering**: Actual roaming AI for wumpies
- **Merchant Inventory**: Buyable items in general store
- **Bartender Drinks**: Menu system for tavern
- **Hotel Rental**: Room booking and rest mechanics
- **Teleport System**: Working phone booth mechanics
- **Container Contents**: Actual items in containers
- **Kick Mechanics**: Physics and rewards for kicking wumpies

## Architect's Wishlist

*Features needed from core system to fully implement intended content:*

### Missing Core Features

1. **Object Examination System**
   - Need: Players must be able to "examine" objects to read detailed descriptions
   - Impact: Currently have `can_be_examined` flag but no implementation
   - Workaround: Descriptions visible on room entry

2. **Container Interaction**
   - Need: Open/close containers, view/take contents
   - Impact: Trashcan, cookie jar, shelves, nightstand all non-functional
   - Workaround: Contents referenced in descriptions only

3. **Furniture Interaction**
   - Need: "sit on bench", "sleep in bed" commands
   - Impact: Immersion features non-functional
   - Workaround: Descriptive flavor only

4. **Use/Activate System**
   - Need: Use telephone, play jukebox, throw darts, turn on TV
   - Impact: Interactive objects are decorative only
   - Workaround: Objects suggest interaction but can't deliver

5. **Reading System**
   - Need: "read book/sign/cards" to view text content
   - Impact: Guest book, destination cards, signs can't be read
   - Workaround: Information included in descriptions

6. **NPC Roaming AI**
   - Need: NPCs move between rooms based on `roaming` flag
   - Impact: Wumpies static instead of wandering
   - Workaround: Manually placed in different rooms, marked as roaming

7. **Kick Command**
   - Need: Special command to kick kickable NPCs
   - Impact: Core Wumpy mechanic unimplemented
   - Workaround: Can attack them (not the same experience)

8. **Merchant System**
   - Need: Buy/sell commands, inventory management
   - Impact: General store can't sell anything
   - Workaround: Shopkeeper has `is_merchant` flag for future use

## Testing Checklist

When implementing this world, verify:

- [ ] All room connections work bidirectionally
- [ ] NPCs load and appear in correct rooms
- [ ] Objects display in room descriptions
- [ ] Room IDs match exit destinations
- [ ] No broken references to non-existent rooms/NPCs/objects
- [ ] Descriptions display properly without formatting issues
- [ ] Keywords work for object/NPC targeting
- [ ] Map matches actual room layout

## Credits

**Builder**: Claude Code (The Builder)
**Design Inspiration**: Terry Pratchett, Stephen King, LooneyMUD, Classic Sesame Street
**MUD**: The Wumpy and Grift
**Built**: November 2025

---

*"It's a beautiful day to be on Sesame Street! Though the street's definition of 'beautiful' and yours may differ significantly."*
— Big Bird (probably)
