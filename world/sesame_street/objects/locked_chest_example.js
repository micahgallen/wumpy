{
  "id": "locked_oak_chest",
  "name": "a sturdy oak chest",
  "description": "A heavy oak chest with iron bindings and a brass lock. The lock looks complex and well-maintained.",
  "keywords": ["chest", "oak chest", "oak", "sturdy chest"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isLocked": true,
  "lockDifficulty": 15,
  "keyItemId": "brass_key",
  "requiresKey": true,

  "isOpen": false,
  "capacity": 15,

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": true,
    "respawnDelay": 600000,
    "respawnMode": "empty",
    "maxItems": 10,
    "guaranteedItems": [
      {
        "itemId": "health_potion",
        "quantity": 3,
        "chance": 100
      },
      {
        "itemId": "gold_coins",
        "quantity": 50,
        "chance": 80
      }
    ],
    "randomItems": {
      "count": 2,
      "lootTable": "common_loot"
    }
  },

  "onOpen": {
    "message": "The oak chest creaks open, revealing its valuable contents."
  },
  "onClose": {
    "message": "The oak chest closes with a solid thunk."
  },
  "onUnlock": {
    "message": "You turn the brass key in the lock with a satisfying click."
  },
  "onLock": {
    "message": "You lock the oak chest securely with the brass key."
  }
}
