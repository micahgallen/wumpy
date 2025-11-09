
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'logs', 'server.log');

// Ensure log directory exists
const logDir = path.dirname(logFilePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log levels (from highest priority to lowest)
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Get log level from environment variable (default to INFO)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Check if a message at the given level should be logged
 */
function shouldLog(level) {
  return LOG_LEVELS[level] <= currentLogLevel;
}

/**
 * General purpose log function with level support
 */
function log(message) {
  if (!shouldLog('INFO')) return;

  console.log(`Logging message: ${message}`);
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage);
}

/**
 * Debug level logging - only shown when LOG_LEVEL=DEBUG
 * Use this for verbose startup messages
 */
function debug(message) {
  if (!shouldLog('DEBUG')) return;

  console.log(`DEBUG: ${message}`);
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [DEBUG] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage);
}

function error(message) {
  if (!shouldLog('ERROR')) return;

  console.error(`ERROR: ${message}`);
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] [ERROR] ${message}\n`;
  fs.appendFileSync(logFilePath, errorMessage);
}

function warn(message) {
  if (!shouldLog('WARN')) return;

  console.warn(`WARN: ${message}`);
  const timestamp = new Date().toISOString();
  const warnMessage = `[${timestamp}] [WARN] ${message}\n`;
  fs.appendFileSync(logFilePath, warnMessage);
}

module.exports = { log, debug, error, warn };
