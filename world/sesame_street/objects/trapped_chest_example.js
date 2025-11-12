{
  "id": "trapped_iron_chest",
  "name": "a menacing iron chest",
  "description": "A dark iron chest covered in strange runes and symbols. Something about it feels dangerous.",
  "keywords": ["chest", "iron chest", "iron", "menacing chest", "dark chest"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isLocked": false,
  "isOpen": false,
  "capacity": 20,

  "trap": {
    "type": "damage",
    "damage": 25,
    "message": "A poison dart shoots out from a hidden mechanism in the chest!",
    "isArmed": true,
    "difficulty": 18
  },

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": true,
    "respawnDelay": 900000,
    "respawnMode": "empty",
    "maxItems": 15,
    "guaranteedItems": [
      {
        "itemId": "health_potion",
        "quantity": 5,
        "chance": 100
      },
      {
        "itemId": "gold_coins",
        "quantity": 100,
        "chance": 100
      }
    ],
    "randomItems": {
      "count": 4,
      "lootTable": "rare_loot"
    }
  },

  "onOpen": {
    "message": "The iron chest opens with an ominous grinding sound."
  },
  "onClose": {
    "message": "The iron chest slams shut with a metallic clang."
  }
}
