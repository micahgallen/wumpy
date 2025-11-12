/**
 * Script to deduplicate containers in containers.json
 * Keeps the NEWEST instance of each container per room (highest createdAt timestamp)
 */

const fs = require('fs');
const path = require('path');

const containersPath = path.join(__dirname, '../data/containers.json');

console.log('=== Container Deduplication Script ===\n');

// Read existing containers
if (!fs.existsSync(containersPath)) {
  console.log('No containers.json file found. Nothing to deduplicate.');
  process.exit(0);
}

const rawData = fs.readFileSync(containersPath, 'utf8');
const data = JSON.parse(rawData);

if (!data.containers || Object.keys(data.containers).length === 0) {
  console.log('No containers found in file. Nothing to deduplicate.');
  process.exit(0);
}

const containers = data.containers;
const totalBefore = Object.keys(containers).length;

console.log(`Total containers before: ${totalBefore}\n`);

// Group containers by room + definition
const containersByKey = new Map();

for (const containerId in containers) {
  const container = containers[containerId];
  const key = `${container.roomId}:${container.definitionId}`;

  if (!containersByKey.has(key)) {
    containersByKey.set(key, []);
  }

  containersByKey.get(key).push({
    id: containerId,
    container: container,
    createdAt: container.createdAt || 0
  });
}

// Find duplicates
let duplicatesFound = 0;
const toKeep = new Set();
const toRemove = [];

for (const [key, instances] of containersByKey) {
  if (instances.length > 1) {
    duplicatesFound += instances.length - 1;
    console.log(`\nDuplicates found for "${key}":`);

    // Sort by createdAt descending (newest first)
    instances.sort((a, b) => b.createdAt - a.createdAt);

    // Keep the newest
    const newest = instances[0];
    toKeep.add(newest.id);
    console.log(`  ✓ KEEPING: ${newest.id} (created ${new Date(newest.createdAt).toISOString()})`);

    // Mark others for removal
    for (let i = 1; i < instances.length; i++) {
      const old = instances[i];
      toRemove.push(old.id);
      console.log(`  ✗ REMOVING: ${old.id} (created ${new Date(old.createdAt).toISOString()})`);
    }
  } else {
    // No duplicates, keep the only instance
    toKeep.add(instances[0].id);
  }
}

console.log(`\n=== Summary ===`);
console.log(`Duplicates found: ${duplicatesFound}`);
console.log(`Containers to keep: ${toKeep.size}`);
console.log(`Containers to remove: ${toRemove.length}`);

if (toRemove.length === 0) {
  console.log('\nNo duplicates to remove. File is clean!');
  process.exit(0);
}

// Create cleaned data
const cleanedContainers = {};
for (const id of toKeep) {
  cleanedContainers[id] = containers[id];
}

const cleanedData = {
  ...data,
  containers: cleanedContainers,
  savedAt: Date.now()
};

// Backup original file
const backupPath = containersPath + '.backup.' + Date.now();
fs.writeFileSync(backupPath, rawData, 'utf8');
console.log(`\nBackup created: ${backupPath}`);

// Write cleaned file
fs.writeFileSync(containersPath, JSON.stringify(cleanedData, null, 2), 'utf8');
console.log(`Cleaned containers.json written`);

console.log(`\n✓ Deduplication complete!`);
console.log(`Total containers after: ${Object.keys(cleanedData.containers).length}`);
