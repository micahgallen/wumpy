# Combat NPC Examples
**The Wumpy and Grift MUD**

This document provides concrete examples of how to configure NPCs for the combat system, using the existing Sesame Street NPCs as templates.

---

## NPC Difficulty Tiers

### Tier 1: Trivial (Level 1, CR 0.25)
**Purpose:** Tutorial encounters, very easy for level 1 players
**Examples:** Friendly wumpies, small critters
**Stats:** Low HP (10-15), low AC (10-11), weak damage (1d4)

### Tier 2: Easy (Level 1-2, CR 0.5)
**Purpose:** Standard early encounters, balanced for level 1-2 players
**Examples:** Most wumpies, basic NPCs
**Stats:** Moderate HP (15-25), moderate AC (11-13), moderate damage (1d6)

### Tier 3: Moderate (Level 3-4, CR 1)
**Purpose:** Challenging encounters for low-level players
**Examples:** Aggressive NPCs, mini-bosses
**Stats:** Good HP (30-40), good AC (13-15), good damage (1d8)

### Tier 4: Hard (Level 5+, CR 2+)
**Purpose:** Boss encounters, require preparation
**Examples:** Reality Street NPCs, area bosses
**Stats:** High HP (50+), high AC (15+), high damage (2d6+)

---

## Example 1: Blue Wumpy (Easy)

**Current File:** `/Users/au288926/Documents/mudmud/world/sesame_street/npcs/blue_wumpy.js`

### Enhanced Version with Combat Stats

```javascript
{
  "id": "blue_wumpy",
  "name": "Blue Wumpy",
  "description": "A melancholic blue creature sits here, contemplating the existential weight of being a kickable entity in an uncaring universe. It occasionally sighs with the resignation of someone who has read too much philosophy.",
  "keywords": ["wumpy", "blue", "blue wumpy", "creature"],

  // Combat Stats
  "level": 1,
  "hp": 18,  // Becomes maxHp (slightly below average for level 1)

  "combatStats": {
    "strength": 8,   // Weak (philosophical, not aggressive)
    "dexterity": 12,  // Decent (can dodge a bit)
    "constitution": 12, // Average
    "intelligence": 14, // High (too smart for its own good)
    "wisdom": 10,     // Average
    "charisma": 6      // Low (depressing to be around)
  },

  "armorClass": 11,  // 10 + 1 (DEX modifier)
  "attackBonus": 0,  // -1 (STR) + 1 (proficiency) = 0
  "damageType": "physical",
  "damageDice": "1d4",  // Weak attack (philosophical tackle)
  "xpReward": 50,    // Base XP for level 1 NPC

  "resistances": {
    "physical": 0,
    "fire": 0,
    "ice": 0,
    "lightning": 0,
    "poison": 0,
    "necrotic": 0,
    "radiant": -10,  // Vulnerable to radiant (hates positivity)
    "psychic": 25     // Resistant to psychic (already overthinking)
  },

  "attackMessages": [
    "The Blue Wumpy half-heartedly bumps into {target}.",
    "The Blue Wumpy sighs dramatically while swatting at {target}.",
    "The Blue Wumpy existentially tackles {target} with minimal enthusiasm.",
    "The Blue Wumpy questions the point of attacking as it strikes {target}."
  ],

  "deathMessages": [
    "The Blue Wumpy collapses with a final, world-weary sigh.",
    "The Blue Wumpy mutters 'I expected this...' as it falls.",
    "The Blue Wumpy embraces the sweet release of defeat."
  ],

  // Behavior
  "aggressive": false,     // Does not attack on sight
  "fleeThreshold": 0.3,    // Flees when HP below 30% (philosophical coward)
  "callsForHelp": false,

  // Existing fields
  "is_kickable": true,
  "roaming": true,
  "dialogue": [
    "Wump... *sigh*",
    "The Blue Wumpy stares into the middle distance, questioning its life choices.",
    "Is this all there is? Just... wumping?",
    "The Blue Wumpy seems to be writing poetry in its head. Terrible poetry."
  ],
  "kick_responses": [
    "The Blue Wumpy accepts its fate with philosophical resignation as it flies through the air.",
    "Your kick sends the Blue Wumpy tumbling. 'I expected this,' it seems to say with its eyes.",
    "The Blue Wumpy rolls away, muttering something about the inevitability of violence."
  ]
}
```

**Combat Analysis:**
- **Difficulty:** Easy for level 1 players
- **Strategy:** Weak attacker, flees easily, good for beginners
- **Unique:** Psychic resistance and radiant vulnerability fit theme

---

## Example 2: Red Wumpy (Moderate)

**Current File:** `/Users/au288926/Documents/mudmud/world/sesame_street/npcs/red_wumpy.js`

### Enhanced Version with Combat Stats

```javascript
{
  "id": "red_wumpy",
  "name": "Red Wumpy",
  "description": "An angry red wumpy vibrates with barely contained rage. Its eyes burn with the fury of a thousand kicked wumpies. Steam practically rises from its crimson hide.",
  "keywords": ["wumpy", "red", "red wumpy", "angry"],

  // Combat Stats
  "level": 2,
  "hp": 28,  // Above average for level 2

  "combatStats": {
    "strength": 14,  // High (very angry)
    "dexterity": 10,  // Average
    "constitution": 14, // High (angry endurance)
    "intelligence": 6,  // Low (too angry to think)
    "wisdom": 8,      // Low (reckless)
    "charisma": 8      // Low (intimidating but not likeable)
  },

  "armorClass": 12,  // 10 + 0 (DEX) + 2 (thick angry hide)
  "attackBonus": 3,  // +2 (STR) + 1 (proficiency)
  "damageType": "fire",  // Burning with rage (literal)
  "damageDice": "1d6+2",  // Strong attack + STR bonus
  "xpReward": 100,    // Level 2 NPC

  "resistances": {
    "physical": 10,   // Thick hide from constant anger
    "fire": 50,       // Very resistant (literally on fire inside)
    "ice": -25,       // Vulnerable (ice douses rage)
    "lightning": 0,
    "poison": 0,
    "necrotic": 0,
    "radiant": 0,
    "psychic": -10    // Vulnerable (can't control emotions)
  },

  "attackMessages": [
    "The Red Wumpy CHARGES at {target} with unbridled fury!",
    "The Red Wumpy's burning fists slam into {target}!",
    "The Red Wumpy roars and strikes {target} with volcanic rage!",
    "The Red Wumpy unleashes years of wumpy grievances on {target}!"
  ],

  "deathMessages": [
    "The Red Wumpy's rage finally burns out as it collapses.",
    "The Red Wumpy gives one final angry grunt before falling.",
    "The Red Wumpy's fury fades as it crumples to the ground."
  ],

  // Behavior
  "aggressive": true,      // Attacks players on sight!
  "fleeThreshold": 0.1,    // Almost never flees (too angry)
  "callsForHelp": false,

  "is_kickable": true,
  "roaming": true,
  "dialogue": [
    "WUMP! WUMP! WUMP!",
    "The Red Wumpy glares at you with intense hatred.",
    "GRAAAAH!",
    "The Red Wumpy looks like it's about to explode with anger."
  ],
  "kick_responses": [
    "The Red Wumpy EXPLODES with rage as your kick connects! This was a mistake!",
    "Your kick sends the Red Wumpy flying, but it only gets ANGRIER!",
    "The Red Wumpy's rage intensifies as it sails through the air!"
  ]
}
```

**Combat Analysis:**
- **Difficulty:** Moderate challenge for level 1-2 players
- **Strategy:** Aggressive, high damage, fire-based
- **WARNING:** Attacks on sight! Dangerous for new players
- **Unique:** Fire damage type, fire resist, ice vulnerability

---

## Example 3: Big Bird (Boss)

**Current File:** `/Users/au288926/Documents/mudmud/world/sesame_street/npcs/big_bird.js`

### Enhanced Version with Combat Stats

```javascript
{
  "id": "big_bird",
  "name": "Big Bird",
  "description": "A towering yellow bird stands here, its cheerful demeanor masking surprising strength. Its massive talons and powerful wings suggest this is no ordinary bird.",
  "keywords": ["big", "bird", "big bird", "yellow"],

  // Combat Stats
  "level": 4,
  "hp": 55,  // Boss-tier HP

  "combatStats": {
    "strength": 16,  // Very high (big and strong)
    "dexterity": 14,  // Good (bird agility)
    "constitution": 15, // High
    "intelligence": 12, // Above average
    "wisdom": 14,     // High (wise elder)
    "charisma": 16    // Very high (beloved character)
  },

  "armorClass": 14,  // 10 + 2 (DEX) + 2 (natural feathers)
  "attackBonus": 5,  // +3 (STR) + 2 (proficiency)
  "damageType": "physical",
  "damageDice": "1d8+3",  // Strong talons
  "xpReward": 300,    // Boss-level reward

  "resistances": {
    "physical": 15,   // Thick feathers
    "fire": -10,      // Vulnerable (feathers burn)
    "ice": 10,        // Some resistance (winter bird)
    "lightning": 0,
    "poison": 20,     // Resistant (bird constitution)
    "necrotic": 0,
    "radiant": 25,    // Resistant (literally radiates positivity)
    "psychic": 15     // Strong-willed
  },

  "attackMessages": [
    "Big Bird swoops down and rakes {target} with massive talons!",
    "Big Bird's powerful wing buffets {target}!",
    "Big Bird pecks {target} with surprising force!",
    "Big Bird's cheerful demeanor vanishes as it strikes {target}!"
  ],

  "deathMessages": [
    "Big Bird stumbles and falls with a sad chirp.",
    "Big Bird's wings droop as it collapses, defeated.",
    "Big Bird lets out a final, mournful tweet before falling."
  ],

  // Behavior
  "aggressive": false,     // Friendly unless provoked
  "fleeThreshold": 0.15,   // Brave, rarely flees
  "callsForHelp": true,    // Future: summons other Sesame Street NPCs

  "is_kickable": false,    // Don't kick Big Bird!
  "roaming": false,        // Stays in his area
  "dialogue": [
    "Have you seen my friend, Mr. Snuffleupagus?",
    "Big Bird cheerfully waves a massive wing at you.",
    "It's such a beautiful day on Sesame Street!",
    "Big Bird looks at you with innocent curiosity."
  ]
}
```

**Combat Analysis:**
- **Difficulty:** Boss-tier for level 1-3 players, balanced for level 4
- **Strategy:** High HP, strong attacks, radiant resistance
- **Special:** Should only be attacked if player is looking for challenge
- **Future:** Could have special "nest defense" ability

---

## Example 4: Grover the Bartender (Non-Combatant)

**Current File:** `/Users/au288926/Documents/mudmud/world/sesame_street/npcs/bartender.js`

### Enhanced Version with Combat Stats

```javascript
{
  "id": "grover_bartender",
  "name": "Grover",
  "description": "A fuzzy blue monster wipes down the bar with a rag, humming to himself. He wears a small bartender's apron and has the look of someone who has seen it all.",
  "keywords": ["grover", "bartender", "monster", "blue"],

  // Combat Stats (weak, not meant for combat)
  "level": 1,
  "hp": 15,

  "combatStats": {
    "strength": 9,
    "dexterity": 11,
    "constitution": 10,
    "intelligence": 12,
    "wisdom": 14,  // Wise bartender
    "charisma": 15  // Friendly and personable
  },

  "armorClass": 10,  // 10 + 0 (DEX)
  "attackBonus": 0,
  "damageType": "physical",
  "damageDice": "1d4",  // Throws bar rag
  "xpReward": 25,     // Very low (not meant to be killed)

  "resistances": {
    "physical": 0,
    "fire": 0,
    "ice": 0,
    "lightning": 0,
    "poison": 30,  // High tolerance (bartender)
    "necrotic": 0,
    "radiant": 0,
    "psychic": 10  // Has heard all the sob stories
  },

  "attackMessages": [
    "Grover throws a dirty bar rag at {target}!",
    "Grover swings a bottle at {target} in self-defense!",
    "Grover reluctantly swats at {target} with a broom!",
    "Grover yells 'I do not want to fight!' as he flails at {target}!"
  ],

  "deathMessages": [
    "Grover collapses behind the bar, defeated.",
    "Grover falls, muttering 'I am just a bartender...'",
    "Grover's apron falls over his face as he crumples."
  ],

  // Behavior
  "aggressive": false,
  "fleeThreshold": 0.5,  // Flees quickly (not a fighter)
  "callsForHelp": true,  // Yells for help

  "is_kickable": false,
  "roaming": false,
  "is_merchant": true,   // Future: sells drinks

  "dialogue": [
    "What can I get you to drink?",
    "Grover polishes a glass while listening to your woes.",
    "I have seen many things in this bar, friend.",
    "Grover leans in conspiratorially. 'Have you heard the rumor about Reality Street?'"
  ]
}
```

**Combat Analysis:**
- **Difficulty:** Trivial (not meant to be fought)
- **Strategy:** Should flee immediately
- **Purpose:** Merchant NPC, quest giver
- **Warning:** Attacking should have consequences (banned from bar?)

---

## Example 5: Oscar in Trashcan (Special)

**Current File:** `/Users/au288926/Documents/mudmud/world/sesame_street/objects/trashcan.js`
(Currently an object, could become NPC or stay as container)

### If Converted to NPC

```javascript
{
  "id": "oscar_grouch",
  "name": "Oscar the Grouch",
  "description": "A grumpy green creature glares at you from inside his trashcan. His eyes narrow with suspicion and disdain.",
  "keywords": ["oscar", "grouch", "green", "creature"],

  // Combat Stats
  "level": 3,
  "hp": 35,

  "combatStats": {
    "strength": 11,
    "dexterity": 8,   // Slow (lives in trash)
    "constitution": 16, // Very high (survives in garbage)
    "intelligence": 13,
    "wisdom": 12,
    "charisma": 6      // Grouchy
  },

  "armorClass": 13,  // 10 - 1 (DEX) + 4 (trashcan armor)
  "attackBonus": 2,
  "damageType": "poison",  // Throws garbage
  "damageDice": "1d6+1",
  "xpReward": 150,

  "resistances": {
    "physical": 20,  // Trashcan protection
    "fire": -15,     // Garbage burns
    "ice": 5,
    "lightning": 0,
    "poison": 75,    // VERY resistant (lives in trash)
    "necrotic": 50,  // Used to decay
    "radiant": -20,  // Hates positivity
    "psychic": 10
  },

  "attackMessages": [
    "Oscar hurls a rotten banana peel at {target}!",
    "Oscar throws a tin can from his trashcan at {target}!",
    "Oscar swings his trashcan lid at {target}!",
    "Oscar shouts 'SCRAM!' and throws garbage at {target}!"
  ],

  "deathMessages": [
    "Oscar retreats deep into his trashcan, defeated.",
    "Oscar slams his trashcan lid closed with a grumpy huff.",
    "Oscar mutters 'Good riddance!' as he disappears into his can."
  ],

  // Behavior
  "aggressive": false,
  "fleeThreshold": 0.4,
  "callsForHelp": false,  // Too grumpy for friends

  "is_kickable": false,
  "roaming": false,  // Stays in trashcan
  "container": true,  // Special: can store items in his trash

  "dialogue": [
    "SCRAM! This is my trash!",
    "Oscar glares at you. 'What do YOU want?'",
    "I don't like visitors. Go away!",
    "Oscar mutters about how much he hates sunshine and happiness."
  ]
}
```

**Combat Analysis:**
- **Difficulty:** Moderate
- **Unique:** Poison damage type, very high poison resistance
- **Special Mechanic:** Takes reduced damage from range (trashcan cover)?
- **Design Choice:** Maybe should stay as interactable object rather than NPC

---

## Balancing Guidelines

### XP Rewards by Level

```
Level 1: 50-75 XP
Level 2: 100-150 XP
Level 3: 150-225 XP
Level 4: 250-350 XP
Level 5: 400-500 XP

Formula: level × 50 to level × 75
Boss NPCs: level × 100
```

### HP by Level

```
Level 1: 15-25 HP
Level 2: 20-30 HP
Level 3: 25-40 HP
Level 4: 40-60 HP
Level 5: 50-75 HP

Formula: 10 + (level × 5) + CON_modifier × level
Boss NPCs: +25% HP
```

### AC by Level

```
Level 1-2: AC 10-12
Level 3-4: AC 12-14
Level 5-6: AC 14-16
Boss NPCs: +1-2 AC

Formula: 10 + DEX_modifier + natural_armor
```

### Damage Dice by Level

```
Level 1: 1d4 to 1d6
Level 2-3: 1d6 to 1d8
Level 4-5: 1d8 to 1d10
Boss NPCs: +1 die size or +damage

Examples:
- Weak: 1d4
- Normal: 1d6
- Strong: 1d8
- Very Strong: 1d10 or 2d6
- Boss: 1d12 or 2d8
```

---

## Damage Type Themes

Use damage types to create thematic variety:

### Physical NPCs
- Guards, warriors, animals
- Standard weapon attacks
- Most common type

### Fire NPCs
- Red wumpy (anger), dragons, fire elementals
- High burst damage
- Vulnerable to ice

### Ice NPCs
- Frost creatures, ice elementals
- Slow effects (future)
- Vulnerable to fire

### Lightning NPCs
- Storm creatures, tech enemies
- Chain damage (future)
- Rare in Sesame Street

### Poison NPCs
- Oscar (garbage), toxic creatures, snakes
- DoT effects (future)
- Bypasses armor (future)

### Necrotic NPCs
- Undead, dark magic users
- Reality Street enemies
- Anti-healing (future)

### Radiant NPCs
- Big Bird, holy creatures, angels
- Bonus vs undead (future)
- Rare as damage source

### Psychic NPCs
- Mind flayers, eldritch horrors
- Blue wumpy (overthinking)?
- Bypasses physical armor

---

## NPC Archetypes

### The Trash Mob
- Level 1, low HP, weak damage
- Designed to die easily
- Teaches combat basics
- Example: Friendly wumpies

### The Standard Enemy
- Level appropriate, balanced stats
- Core gameplay loop
- Example: Most wumpies

### The Elite
- +1 level above area
- Higher stats, more XP
- Occasional challenge
- Example: Red wumpy

### The Boss
- +2-3 levels above area
- High HP, strong attacks, special abilities
- Major challenge, big rewards
- Example: Big Bird

### The Merchant
- Not meant for combat
- Flees immediately
- Killing has consequences
- Example: Grover, Shopkeeper

### The Questgiver
- Non-combatant
- Essential for progression
- Unkillable or heavily penalized
- Example: Big Bird (dual role)

---

## Status Effects (Future)

When status effects are implemented, NPCs can have these:

### On Attack (Proc Chance)
```javascript
"onAttackEffects": [
  {
    "effect": "burn",
    "chance": 0.25,  // 25% chance
    "duration": 3,   // 3 rounds
    "damage": "1d4"  // 1d4 per round
  }
]
```

### Immunities
```javascript
"statusImmunities": ["poison", "charm", "fear"]
```

### Vulnerabilities
```javascript
"statusVulnerabilities": ["slow", "blind"]
```

---

## Special Abilities (Future)

Advanced NPCs can have abilities beyond basic attacks:

```javascript
"specialAbilities": [
  {
    "name": "Wing Buffet",
    "type": "aoe",  // Area of effect
    "damage": "2d6",
    "damageType": "physical",
    "range": "melee",
    "cooldown": 3,  // Every 3 rounds
    "description": "Big Bird beats his wings, hitting all nearby enemies."
  },
  {
    "name": "Inspiring Song",
    "type": "buff",
    "target": "self",
    "effect": "regen",
    "amount": "1d6",
    "duration": 5,
    "cooldown": 5
  }
]
```

---

## Room-Based Encounters

Some NPCs could have environmental advantages:

```javascript
"environmentalBonus": {
  "room": "sesame_street_bar",  // Only in specific room
  "acBonus": 2,                 // +2 AC (home turf)
  "damageBonus": "1d4",         // +1d4 damage
  "description": "Grover fights better in his own bar!"
}
```

---

## Loot Tables (Future)

When equipment is implemented:

```javascript
"lootTable": {
  "guaranteed": [
    { "id": "wumpy_fur", "chance": 1.0 }  // Always drops
  ],
  "rare": [
    { "id": "blue_wumpy_philosophy_book", "chance": 0.1 }  // 10% chance
  ],
  "currency": {
    "min": 5,
    "max": 15
  }
}
```

---

## Summary: Sesame Street NPCs by Difficulty

| NPC | Level | Type | Difficulty | Notes |
|-----|-------|------|------------|-------|
| Grover | 1 | Merchant | Trivial | Don't fight! |
| Blue Wumpy | 1 | Standard | Easy | Beginner friendly |
| Green Wumpy | 1 | Standard | Easy | Similar to blue |
| Purple Wumpy | 1 | Standard | Easy | Similar to blue |
| Yellow Wumpy | 1 | Standard | Easy | Similar to blue |
| Red Wumpy | 2 | Elite | Moderate | AGGRESSIVE! |
| Oscar | 3 | Special | Moderate | Poison type |
| Big Bird | 4 | Boss | Hard | Boss fight |

**Recommended Progression:**
1. Level 1: Fight blue/green/purple/yellow wumpies
2. Level 2: Challenge red wumpy (or flee!)
3. Level 3: Explore other areas, fight Oscar if brave
4. Level 4+: Challenge Big Bird

---

*Use these examples as templates when creating NPCs for other realms*
