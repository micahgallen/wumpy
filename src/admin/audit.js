/**
 * Admin Audit Logger
 * Logs all admin actions for accountability and security
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = '/Users/au288926/Documents/mudmud/logs/admin.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Rotate log file if it exceeds max size
 */
function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size >= MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const rotatedFile = LOG_FILE.replace('.log', `-${timestamp}.log`);
        fs.renameSync(LOG_FILE, rotatedFile);
      }
    }
  } catch (err) {
    console.error('Error rotating log file:', err);
  }
}

/**
 * Format audit log entry
 * Format: [timestamp] [issuerID:issuerRank] command(args) -> result | reason
 *
 * @param {Object} entry - Log entry object
 * @param {string} entry.issuerID - ID of user who executed command
 * @param {string} entry.issuerRank - Rank of issuer
 * @param {string} entry.command - Command executed
 * @param {Array|string} entry.args - Command arguments
 * @param {string} entry.result - Result (success/failure)
 * @param {string} entry.reason - Optional reason or details
 * @returns {string} Formatted log line
 */
function formatLogEntry(entry) {
  const timestamp = new Date().toISOString();
  const args = Array.isArray(entry.args) ? entry.args.join(' ') : entry.args || '';
  const reason = entry.reason ? ` | ${entry.reason}` : '';

  return `[${timestamp}] [${entry.issuerID}:${entry.issuerRank}] ${entry.command}(${args}) -> ${entry.result}${reason}`;
}

/**
 * Write audit log entry
 * @param {Object} entry - Log entry object (see formatLogEntry for structure)
 */
function writeAuditLog(entry) {
  try {
    ensureLogDir();
    rotateLogIfNeeded();

    const logLine = formatLogEntry(entry) + '\n';
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}

/**
 * Read recent audit log entries
 * @param {number} lines - Number of lines to read (default 100)
 * @returns {Array<string>} Array of log lines
 */
function readAuditLog(lines = 100) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const allLines = content.split('\n').filter(line => line.trim());
    return allLines.slice(-lines);
  } catch (err) {
    console.error('Error reading audit log:', err);
    return [];
  }
}

/**
 * Search audit log for entries matching criteria
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.issuerID - Filter by issuer ID
 * @param {string} criteria.command - Filter by command
 * @param {string} criteria.target - Filter by target (in args)
 * @param {number} criteria.limit - Max results (default 100)
 * @returns {Array<string>} Matching log lines
 */
function searchAuditLog(criteria = {}) {
  try {
    const allLines = readAuditLog(10000); // Read more for searching
    let results = allLines;

    if (criteria.issuerID) {
      results = results.filter(line => line.includes(`[${criteria.issuerID}:`));
    }

    if (criteria.command) {
      results = results.filter(line => line.includes(` ${criteria.command}(`));
    }

    if (criteria.target) {
      results = results.filter(line => line.includes(criteria.target));
    }

    const limit = criteria.limit || 100;
    return results.slice(-limit);
  } catch (err) {
    console.error('Error searching audit log:', err);
    return [];
  }
}

module.exports = {
  writeAuditLog,
  readAuditLog,
  searchAuditLog,
  formatLogEntry
};
