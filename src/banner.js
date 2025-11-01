/**
 * Banner - ASCII art and welcome screen for The Wumpy and Grift
 */

const colors = require('./colors');

/**
 * Generate the colorful ASCII art banner for the welcome screen
 * @returns {string} The formatted welcome banner
 */
function getBanner() {
  const lines = [];

  // Top border
  lines.push(colors.line(78, '=', colors.MUD_COLORS.BRIGHT_CYAN));
  lines.push('');

  // ASCII Art Title
  lines.push(colors.colorize('  _____ _            __        __                             ', colors.MUD_COLORS.BRIGHT_MAGENTA));
  lines.push(colors.colorize(' |_   _| |__   ___  \\ \\      / /   _ _ __ ___  _ __  _   _  ', colors.MUD_COLORS.BRIGHT_MAGENTA));
  lines.push(colors.colorize('   | | | \'_ \\ / _ \\  \\ \\ /\\ / / | | | \'_ ` _ \\| \'_ \\| | | | ', colors.MUD_COLORS.BRIGHT_MAGENTA));
  lines.push(colors.colorize('   | | | | | |  __/   \\ V  V /| |_| | | | | | | |_) | |_| | ', colors.MUD_COLORS.BRIGHT_MAGENTA));
  lines.push(colors.colorize('   |_| |_| |_|\\___|    \\_/\\_/  \\__,_|_| |_| |_| .__/ \\__, | ', colors.MUD_COLORS.BRIGHT_MAGENTA));
  lines.push(colors.colorize('                                               |_|    |___/  ', colors.MUD_COLORS.BRIGHT_MAGENTA));

  lines.push('');
  lines.push(colors.colorize('                      &   Grift                                ', colors.MUD_COLORS.BRIGHT_YELLOW));
  lines.push('');

  // Tagline
  lines.push(colors.colorize('           A satirical MUD of 90s nostalgia', colors.MUD_COLORS.BRIGHT_CYAN));
  lines.push('');

  // Version and info
  lines.push(colors.hint('                    Version 0.1.0 - Alpha'));
  lines.push('');

  // Bottom border
  lines.push(colors.line(78, '=', colors.MUD_COLORS.BRIGHT_CYAN));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a simple one-line welcome message (for reconnections, etc)
 * @returns {string} Short welcome message
 */
function getShortWelcome() {
  return colors.highlight('Welcome to The Wumpy and Grift!') + ' ' +
         colors.hint('(Type "help" for commands)');
}

module.exports = {
  getBanner,
  getShortWelcome
};
