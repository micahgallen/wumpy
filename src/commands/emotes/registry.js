/**
 * Emote Registry
 * Aggregates all emote command descriptors and enforces uniqueness
 */

// Import all emote modules
const applaud = require('./applaud');
const bow = require('./bow');
const cackle = require('./cackle');
const cheer = require('./cheer');
const chuckle = require('./chuckle');
const cry = require('./cry');
const dance = require('./dance');
const fart = require('./fart');
const flex = require('./flex');
const giggle = require('./giggle');
const groan = require('./groan');
const growl = require('./growl');
const hiccup = require('./hiccup');
const grin = require('./grin');
const kiss = require('./kiss');
const pinch = require('./pinch');
const tip = require('./tip');
const taunt = require('./taunt');

// Collect all emote descriptors
const emoteDescriptors = [
  applaud,
  bow,
  cackle,
  cheer,
  chuckle,
  cry,
  dance,
  fart,
  flex,
  giggle,
  groan,
  growl,
  hiccup,
  grin,
  kiss,
  pinch,
  tip,
  taunt
];

// Check for name/alias conflicts
const nameMap = new Map();

for (const descriptor of emoteDescriptors) {
  // Check primary name
  if (nameMap.has(descriptor.name)) {
    throw new Error(`Duplicate emote name detected: '${descriptor.name}'`);
  }
  nameMap.set(descriptor.name, descriptor);

  // Check aliases
  if (descriptor.aliases) {
    for (const alias of descriptor.aliases) {
      if (nameMap.has(alias)) {
        throw new Error(`Duplicate emote alias detected: '${alias}' conflicts with '${descriptor.name}'`);
      }
      nameMap.set(alias, descriptor);
    }
  }
}

// Export the validated list of emote descriptors
module.exports = emoteDescriptors;
