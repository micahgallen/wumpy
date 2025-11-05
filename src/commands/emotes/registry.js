/**
 * Emote Registry
 * Aggregates all emote command descriptors and enforces uniqueness
 */

// Import all emote modules
const applaud = require('./applaud');
const bounce = require('./bounce');
const bow = require('./bow');
const cackle = require('./cackle');
const cheer = require('./cheer');
const chuckle = require('./chuckle');
const cry = require('./cry');
const dance = require('./dance');
const facepalm = require('./facepalm');
const fart = require('./fart');
const flex = require('./flex');
const funkychicken = require('./funkychicken');
const giggle = require('./giggle');
const grin = require('./grin');
const grinwide = require('./grinwide');
const groan = require('./groan');
const growl = require('./growl');
const hiccup = require('./hiccup');
const hug = require('./hug');
const kiss = require('./kiss');
const nod = require('./nod');
const pat = require('./pat');
const pinch = require('./pinch');
const poke = require('./poke');
const salute = require('./salute');
const shake = require('./shake');
const shrug = require('./shrug');
const spin = require('./spin');
const strut = require('./strut');
const taunt = require('./taunt');
const tibble = require('./tibble');
const tickle = require('./tickle');
const tip = require('./tip');
const wave = require('./wave');
const wink = require('./wink');
const wobble = require('./wobble');
const woo = require('./woo');
const yawn = require('./yawn');

// Collect all emote descriptors
const emoteDescriptors = [
  applaud,
  bounce,
  bow,
  cackle,
  cheer,
  chuckle,
  cry,
  dance,
  facepalm,
  fart,
  flex,
  funkychicken,
  giggle,
  grin,
  grinwide,
  groan,
  growl,
  hiccup,
  hug,
  kiss,
  nod,
  pat,
  pinch,
  poke,
  salute,
  shake,
  shrug,
  spin,
  strut,
  taunt,
  tibble,
  tickle,
  tip,
  wave,
  wink,
  wobble,
  woo,
  yawn
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
