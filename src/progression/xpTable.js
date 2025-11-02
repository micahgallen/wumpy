const XP_TABLE = {
  1: 0,
  2: 1000,
  3: 3000,
  4: 6000,
  5: 10000,
  // ... up to 50
};

function getXPForLevel(level) {
  return XP_TABLE[level] || XP_TABLE[50] * 2;
}

module.exports = { XP_TABLE, getXPForLevel };
