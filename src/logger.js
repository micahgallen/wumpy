
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '..', 'logs', 'server.log');

// Ensure log directory exists
const logDir = path.dirname(logFilePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  console.log(`Logging message: ${message}`);
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFilePath, logMessage);
}

function error(message) {
  console.error(`ERROR: ${message}`);
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] [ERROR] ${message}\n`;
  fs.appendFileSync(logFilePath, errorMessage);
}

function warn(message) {
  console.warn(`WARN: ${message}`);
  const timestamp = new Date().toISOString();
  const warnMessage = `[${timestamp}] [WARN] ${message}\n`;
  fs.appendFileSync(logFilePath, warnMessage);
}

module.exports = { log, error, warn };
