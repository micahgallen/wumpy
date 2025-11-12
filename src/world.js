const fs = require('fs');
const path = require('path');
const colors = require('./colors');

/**
 * World - Manages world data (rooms, NPCs, objects)
 * Loads all world content from the world/ directory structure
 */
class World {
  constructor(worldDir = './world') {
    this.worldDir = worldDir;
    this.rooms = {};
    this.npcs = {};
    this.objects = {};
    this.containers = {}; // Room container definitions
    this.load();
  }

  /**
   * Load all world data from the world directory
   */
  load() {
    try {
      this.loadRealm('sesame_street');
      console.log(`Loaded ${Object.keys(this.rooms).length} rooms, ${Object.keys(this.npcs).length} NPCs, ${Object.keys(this.objects).length} objects, ${Object.keys(this.containers).length} room containers.`);

      // Initialize items in all rooms
      this.initializeRoomItems();

      // Set home room for each NPC (for respawning)
      this.initializeNPCHomeRooms();

      // Initialize room containers
      this.initializeRoomContainers();

      // Store a deep copy of the initial room states for respawning
      this.initialRoomsState = JSON.parse(JSON.stringify(this.rooms));

    } catch (err) {
      console.error('Error loading world data:', err);
    }
  }

  /**
   * Load a specific realm's data
   * @param {string} realmName - Name of the realm directory
   */
  loadRealm(realmName) {
    const realmPath = path.join(this.worldDir, realmName);

    if (!fs.existsSync(realmPath)) {
      console.warn(`Realm directory not found: ${realmPath}`);
      return;
    }

    // Load rooms
    this.loadDirectory(path.join(realmPath, 'rooms'), this.rooms, realmName);

    // Load NPCs
    this.loadDirectory(path.join(realmPath, 'npcs'), this.npcs);

    // Load objects (including room container definitions)
    this.loadDirectory(path.join(realmPath, 'objects'), this.objects);

    // Filter and register room container definitions
    this.loadContainerDefinitions();
  }

  /**
   * Load all JSON files from a directory
   * @param {string} dirPath - Directory path
   * @param {Object} storage - Object to store loaded data
   * @param {string} realmName - Name of the realm being loaded
   */
  loadDirectory(dirPath, storage, realmName = null) {
    if (!fs.existsSync(dirPath)) {
      console.warn(`Directory not found: ${dirPath}`);
      return;
    }

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.js')) {
        const filePath = path.join(dirPath, file);
        try {
          const data = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(data);
          if (parsed.id) {
            if (realmName && storage === this.rooms) {
              parsed.realm = realmName;
              // Store the relative path for later reference
              parsed.path = path.relative(this.worldDir, filePath).replace(/\\/g, '/');
            }
            storage[parsed.id] = parsed;
          } else {
            console.warn(`No ID found in ${filePath}`);
          }
        } catch (err) {
          console.error(`Error loading ${filePath}:`, err);
        }
      }
    }
  }

  /**
   * Initialize items in all rooms
   * Converts item ID strings to item instance objects
   */
  initializeRoomItems() {
    const ItemRegistry = require('./items/ItemRegistry');
    const ItemFactory = require('./items/ItemFactory');

    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];

      // Skip if no items defined or already initialized
      if (!room.items || room.items.length === 0) {
        continue;
      }

      // Check if items are already initialized (have definitionId)
      if (room.items[0] && typeof room.items[0] === 'object' && room.items[0].definitionId) {
        continue; // Already initialized
      }

      // Convert string IDs to item instances
      const initializedItems = [];
      for (const itemId of room.items) {
        if (typeof itemId === 'string') {
          const itemDef = ItemRegistry.getItem(itemId);
          if (itemDef) {
            // Create item instance
            const itemInstance = ItemFactory.createItem(itemDef, {
              location: { type: 'room', roomId: roomId }
            });
            // Store as serialized data
            initializedItems.push({
              definitionId: itemInstance.definitionId,
              instanceId: itemInstance.instanceId,
              quantity: itemInstance.quantity || 1,
              durability: itemInstance.durability,
              maxDurability: itemInstance.maxDurability
            });
          } else {
            console.warn(`Item definition not found for ID: ${itemId} in room ${roomId}`);
          }
        }
      }

      room.items = initializedItems;
    }
  }

  /**
   * Set home room for each NPC based on their initial room assignment
   * This allows NPCs to respawn in their original room even if they die elsewhere
   */
  initializeNPCHomeRooms() {
    // Iterate through all rooms to find which NPCs belong where
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];

      if (room.npcs && Array.isArray(room.npcs)) {
        for (const npcId of room.npcs) {
          const npc = this.npcs[npcId];
          if (npc && !npc.homeRoom) {
            // Set the NPC's home room to this room
            npc.homeRoom = roomId;
            console.log(`Set home room for ${npc.name || npcId}: ${roomId}`);
          }
        }
      }
    }
  }

  /**
   * Load container definitions from objects
   * Filters objects that are marked as room containers and registers them
   */
  loadContainerDefinitions() {
    const RoomContainerManager = require('./systems/containers/RoomContainerManager');

    for (const objId in this.objects) {
      const obj = this.objects[objId];

      // Check if this object is a room container
      if (obj.isRoomContainer || obj.containerType === 'room_container') {
        this.containers[objId] = obj;
        RoomContainerManager.registerDefinition(obj);
      }
    }
  }

  /**
   * Initialize room containers
   * Creates container instances for all rooms that have containers
   */
  initializeRoomContainers() {
    const RoomContainerManager = require('./systems/containers/RoomContainerManager');
    RoomContainerManager.initialize(this);

    let totalContainers = 0;

    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];

      // Skip if no containers defined
      if (!room.containers || room.containers.length === 0) {
        continue;
      }

      // Create container instances for this room
      for (const containerId of room.containers) {
        // Check if a container of this type already exists in this room
        // This prevents duplicates when restoring from saved state
        const existingContainers = RoomContainerManager.getContainersByRoom(roomId);
        const alreadyExists = existingContainers.some(c => c.definitionId === containerId);

        if (!alreadyExists) {
          const container = RoomContainerManager.createContainerInstance(containerId, roomId);
          if (container) {
            totalContainers++;
          }
        }
      }
    }

    if (totalContainers > 0) {
      console.log(`Initialized ${totalContainers} room container instances`);
    }
  }

  /**
   * Get a room by ID
   * @param {string} roomId - Room ID
   * @returns {Object} Room data or null
   */
  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }

  /**
   * Get an NPC by ID
   * @param {string} npcId - NPC ID
   * @returns {Object} NPC data or null
   */
  getNPC(npcId) {
    const npc = this.npcs[npcId];
    if (!npc) return null;

    // Ensure NPCs have combat stats initialized
    if (!npc.maxHp) {
      npc.maxHp = npc.hp || 10;
    }
    if (npc.hp === undefined) {
      npc.hp = npc.maxHp;
    }
    if (!npc.strength) npc.strength = 10;
    if (!npc.dexterity) npc.dexterity = 10;
    if (!npc.constitution) npc.constitution = 10;
    if (!npc.resistances) npc.resistances = {};

    // Add combat methods if not already present
    if (!npc.takeDamage) {
      npc.takeDamage = function(damage) {
        this.hp = Math.max(0, this.hp - damage);
      };
    }
    if (!npc.isDead) {
      npc.isDead = function() {
        return this.hp <= 0;
      };
    }

    return npc;
  }

  /**
   * Get an object by ID
   * @param {string} objectId - Object ID
   * @returns {Object} Object data or null
   */
  getObject(objectId) {
    return this.objects[objectId] || null;
  }

  /**
   * Format a room for display to a player
   * @param {string} roomId - Room ID
   * @returns {string} Formatted room description
   */
  formatRoom(roomId, allPlayers, currentPlayer) {
    const room = this.getRoom(roomId);
    if (!room) {
      return colors.error('You are in a void. This room does not exist.');
    }

    let output = [];

    // Room name and description (with color and wrapping)
    output.push(colors.roomName(room.name));
    output.push(colors.line(colors.visibleLength(room.name), '=', colors.MUD_COLORS.ROOM_NAME));

    // Wrap the room description at 80 characters
    const wrappedDescription = colors.wrap(room.description, 80);
    output.push(wrappedDescription);

    // Exits (with color)
    if (room.exits && room.exits.length > 0) {
      const exitList = room.exits.map(exit => colors.exits(exit.direction)).join(', ');
      output.push('\n' + colors.exitsLabel('Exits: ') + exitList);
    } else {
      output.push('\n' + colors.exitsLabel('Exits: ') + colors.hint('none'));
    }

    // NPCs (brief presence indication only)
    if (room.npcs && room.npcs.length > 0) {
      output.push('');
      for (const npcId of room.npcs) {
        const npc = this.getNPC(npcId);
        if (npc) {
          // Show only the NPC name, not the full description
          output.push(colors.npc(npc.name) + ' is here.');
        }
      }
    }

    // Objects (with color)
    if (room.objects && room.objects.length > 0) {
      output.push('');
      for (const objId of room.objects) {
        const obj = this.getObject(objId);
        if (obj) {
          output.push('You see ' + colors.objectName(obj.name) + ' here.');
        }
      }
    }

    // Items (new item system)
    if (room.items && room.items.length > 0) {
      const ItemRegistry = require('./items/ItemRegistry');
      output.push('');
      for (const itemData of room.items) {
        // Check if item is in registry (normal items) or is a dynamic item like corpses
        const itemDef = ItemRegistry.getItem(itemData.definitionId);

        if (itemDef) {
          // Item found in registry - use registry definition
          let itemDisplay = 'You see ' + colors.objectName(itemDef.name);
          if (itemData.quantity && itemData.quantity > 1) {
            itemDisplay += colors.dim(` x${itemData.quantity}`);
          }
          itemDisplay += ' here.';
          output.push(itemDisplay);
        } else if (itemData.name) {
          // Dynamic item (like corpse) with name property - use directly
          let itemDisplay = 'You see ' + colors.objectName(itemData.name);
          if (itemData.quantity && itemData.quantity > 1) {
            itemDisplay += colors.dim(` x${itemData.quantity}`);
          }
          itemDisplay += ' here.';
          output.push(itemDisplay);
        }
      }
    }

    // Room containers (fixed containers)
    const RoomContainerManager = require('./systems/containers/RoomContainerManager');
    const containers = RoomContainerManager.getContainersByRoom(roomId);

    if (containers && containers.length > 0) {
      output.push('');
      for (const container of containers) {
        const definition = RoomContainerManager.getDefinition(container.definitionId);
        if (!definition) continue;

        let display = 'You see ' + colors.objectName(definition.name);

        // Show state indicators (unless hideContainerStatus is set)
        if (!definition.hideContainerStatus) {
          if (container.isLocked) {
            display += colors.dim(' (locked)');
          } else if (container.isOpen) {
            display += colors.dim(' (open)');
          }
        }

        display += ' here.';
        output.push(display);
      }
    }

    // Players in room
    if (allPlayers) {
      const playersInRoom = [];
      for (const p of allPlayers) {
        if (p.currentRoom === roomId && p.username !== currentPlayer.username) {
          // Add ghost indicator if player is a ghost
          if (p.isGhost) {
            playersInRoom.push(colors.playerName(p.getDisplayName()) + colors.hint(' (ghost)'));
          } else {
            playersInRoom.push(colors.playerName(p.getDisplayName()));
          }
        }
      }
      if (playersInRoom.length > 0) {
        output.push('\n' + colors.info('Also here: ') + playersInRoom.join(', '));
      }
    }

    return output.join('\n');
  }

  /**
   * Find an exit from a room in a given direction
   * @param {string} roomId - Current room ID
   * @param {string} direction - Direction to search
   * @returns {string} Destination room ID or null
   */
  findExit(roomId, direction) {
    const room = this.getRoom(roomId);
    if (!room || !room.exits) {
      return null;
    }

    const exit = room.exits.find(e => e.direction.toLowerCase() === direction.toLowerCase());
    return exit ? exit.room : null;
  }

  /**
   * Send a message to all players in a room
   * @param {string} roomId - Room ID to send message to
   * @param {string} message - Message to send
   * @param {Array<string>} excludeUsernames - Array of usernames to exclude (optional)
   * @param {Set} allPlayers - Set of all connected players
   */
  sendToRoom(roomId, message, excludeUsernames = [], allPlayers) {
    if (!allPlayers || !roomId) {
      return;
    }

    for (const player of allPlayers) {
      if (player.currentRoom === roomId && !excludeUsernames.includes(player.username)) {
        player.send(message);
        if (player.sendPrompt) {
          player.sendPrompt();
        }
      }
    }
  }
}

module.exports = World;
