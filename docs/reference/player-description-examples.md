# Player Description Examples

Quick reference for example outputs from the Player Description System.

## Level Tier Descriptions

| Level | Title | Primary Description |
|-------|-------|---------------------|
| 1-3 | Fresh-faced novice | They have that unmistakable look of someone who still believes in treasure maps and destiny. How adorable. |
| 4-7 | Promising adventurer | The initial shine of naivety has been dulled by a few harsh lessons, but the spark of ambition remains. |
| 8-12 | Seasoned traveler | There's a confidence in their stance that comes from surviving things that would make lesser mortals whimper. |
| 13-17 | Veteran campaigner | The scars might be hidden, but you can see them in the way they assess every room for exits and threats. |
| 18-22 | Renowned champion | Power radiates from them like heat from a forge. Even the air seems to take them seriously. |
| 23-27 | Legendary hero | They've reached the level where common sense starts looking up at them from far below. |
| 28+ | Living myth | Reality itself seems slightly uncertain around them, as if checking whether it needs their permission to continue existing. |

## Example Outputs

### New Player (Level 1)

```
Adventurer [Level 1]

You see a fresh-faced novice. They have that unmistakable look of someone who
still believes in treasure maps and destiny. How adorable.

A normal-looking person.

They appear to be traveling light. Very light. Perhaps dangerously light.
```

### Mid-Level Player (Level 10)

```
Shadowblade [Level 10]

You see a seasoned traveler. There's a confidence in their stance that comes
from surviving things that would make lesser mortals whimper.

A weathered warrior with keen eyes that miss nothing.

They are wielding Iron Longsword in their right hand.
They are wearing Leather Armor and Helm of Protection.
```

### Guild Member with Tattoo (Level 15)

```
Ironclad [Level 15]

You see a veteran campaigner. The scars might be hidden, but you can see them
in the way they assess every room for exits and threats.

A battle-hardened fighter whose stance speaks of countless victories.

The crimson tabard of the Warriors Guild marks them as a trained combatant.
The stains suggest it's not just for show.

A magnificent dragon tattoo coils up their arm, its scales shimmering with an
almost lifelike iridescence.

They are dual-wielding Flaming Sword in their right hand and Dagger of Shadows
in their left hand. They are wearing Plate Mail of the Dragon and Dragon Helm.
```

### High-Level Mage (Level 25)

```
Archmage Mystraleth [Level 25]

You see a legendary hero. They've reached the level where common sense starts
looking up at them from far below.

Power crackles at their fingertips, barely contained.

The silver star of the Mages Guild adorns their robes, and arcane energy
crackles faintly around their fingertips.

A shimmering aura of arcane energy surrounds them, casting dancing lights
across nearby surfaces.

They are wielding Staff of the Archmage in their right hand.
They are wearing Robes of the Eternal Flame and Circlet of Wisdom.
```

### Epic Hero with Achievement (Level 28)

```
Dragonslayer [Level 28]

You see a living myth. Reality itself seems slightly uncertain around them, as
if checking whether it needs their permission to continue existing.

A figure of such tremendous power that lesser beings instinctively step aside
when they pass.

A faint golden nimbus surrounds them, the mark of one who has performed truly
heroic deeds. Bards will sing of this one.

The crimson tabard of the Warriors Guild marks them as a trained combatant.

They are wielding Legendary Blade of Dragon Flame in their right hand.
They are wearing Dragonscale Plate and Crown of Kings.
```

### Ghost Character (Level 8)

```
FallenHero (ghost) [Level 8]

You see a seasoned traveler. There's a confidence in their stance that comes
from surviving things that would make lesser mortals whimper.

Once a mighty champion, now reduced to this spectral form.

Their form is translucent and ethereal, barely visible in this world. Death has
not been kind.
```

## Modifier Examples by Priority

### 90-100: Legendary Achievements

| Modifier | Priority | Example Text |
|----------|----------|--------------|
| Quest completion | 95 | A faint golden nimbus surrounds them, the mark of one who has performed truly heroic deeds. |
| Divine blessing | 98 | Divine light emanates from their very being, marking them as chosen. |
| World-saver | 100 | The fabric of reality bends slightly around them, acknowledging their role in saving existence itself. |

### 70-89: Guild Membership

| Guild | Priority | Example Text |
|-------|----------|--------------|
| Warriors | 80 | The crimson tabard of the Warriors Guild marks them as a trained combatant. The stains suggest it's not just for show. |
| Mages | 80 | The silver star of the Mages Guild adorns their robes, and arcane energy crackles faintly around their fingertips. |
| Thieves | 75 | A skilled eye might notice the subtle hand signals they unconsciously make - the cant of the Thieves Guild. |
| Necromancers | 80 | The black robes of the Necromancers Guild seem to absorb light. The faint smell of formaldehyde follows them. |

### 50-69: Permanent Modifications

| Type | Priority | Example Text |
|------|----------|--------------|
| Dragon tattoo | 60 | A magnificent dragon tattoo coils up their arm, its scales shimmering with an almost lifelike iridescence. |
| Mystic runes | 65 | Ancient runes crawl across their forearms, pulsing with eldritch power. |
| Battle scars | 55 | Jagged scars crisscross their arms, each one a story of survival against impossible odds. |

### 30-49: Temporary Effects

| Effect | Priority | Example Text |
|--------|----------|--------------|
| Arcane aura | 40 | A shimmering aura of arcane energy surrounds them, casting dancing lights across nearby surfaces. |
| Fire enchantment | 45 | Flames dance along their weapons and armor, somehow never consuming the material. |
| Shadow cloak | 35 | Shadows cling to them unnaturally, even in bright light. |

### 10-29: Minor Cosmetics

| Type | Priority | Example Text |
|------|----------|--------------|
| Perfume | 15 | A subtle fragrance of jasmine and sandalwood follows them. |
| Jewelry | 20 | Delicate silver chains catch the light as they move. |

## Color Coding Reference

| Element | ANSI Color | Visual Effect |
|---------|------------|---------------|
| Player name | Bright cyan | Highly visible |
| Level number | Dim gray | Subdued |
| Level tier | Dim gray | Subdued |
| Base description | Default white | Normal |
| Modifiers | Cyan | Highlighted |
| Ghost status | Dim cyan | Ethereal hint |
| Equipment labels | Dim gray | Subdued |
| Item names | Bright magenta | Highly visible |

## Equipment Display Examples

### Dual-Wielding

```
They are dual-wielding Flaming Sword in their right hand and Dagger of Shadows
in their left hand.
```

### Two-Handed Weapon

```
They are wielding Greataxe of Doom in both hands.
```

### Weapon and Shield

```
They are wielding Longsword in their right hand and Steel Shield in their left
hand.
```

### Full Armor Set

```
They are wearing Plate Mail of the Dragon, Dragon Helm, and Amulet of Protection.
```

### Light Equipment

```
They are wielding Hunting Bow in their right hand.
They are wearing Ranger's Cloak.
```

## Default Base Descriptions

Random selection when player has no custom description:

1. "A normal-looking person."
2. "An adventurer like any other, though perhaps with slightly better hygiene than most."
3. "They have the look of someone who's seen things. Probably too many things."
4. "A figure of indeterminate description. They blend in well. Perhaps too well."
5. "An individual whose appearance suggests they've made some interesting life choices."

## Writing Style Examples

### Good Modifiers

✓ "The crimson tabard of the Warriors Guild marks them as a trained combatant. The stains suggest it's not just for show."

✓ "Ancient runes crawl across their forearms, pulsing with eldritch power."

✓ "They probably know seventeen ways to kill you with a pine cone."

✓ "A faint golden nimbus surrounds them, the mark of one who has performed truly heroic deeds."

### Poor Modifiers (Avoid)

✗ "They are a member of the Warriors Guild." (Too plain)

✗ "This person is very powerful." (Telling, not showing)

✗ "They have magical tattoos that glow brightly and shimmer with power while also pulsing rhythmically." (Too long)

✗ "He is wearing armor." (Gendered pronoun, too generic)
