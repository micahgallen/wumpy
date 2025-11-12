{
  "id": "treasure_chest_sesame_plaza",
  "name": "a colorful treasure chest",
  "description": "A cheerful wooden chest painted in bright primary colors - red, blue, and yellow. It has friendly googly eyes glued to the lid and a hand-painted sign that reads 'SHARING IS CARING!' in wobbly letters. Despite its playful appearance, it's surprisingly sturdy and has a working brass lock. Cookie Monster has definitely attempted to open this before, judging by the cookie crumbs nearby.",
  "keywords": [
    "chest",
    "treasure chest",
    "treasure",
    "colorful chest",
    "box"
  ],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isOpen": false,
  "isLocked": false,
  "capacity": 15,

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": true,
    "respawnDelay": 600000,
    "respawnMode": "empty",
    "maxItems": 10,

    "guaranteedItems": [
      {
        "itemId": "chocolate_chip_cookie",
        "quantity": 3,
        "chance": 100
      },
      {
        "itemId": "sesame_health_potion",
        "quantity": 1,
        "chance": 75
      }
    ],

    "randomItems": {
      "count": 3,
      "lootTable": "common_loot",
      "level": 1,
      "allowDuplicates": false,
      "includeCurrency": true
    }
  },

  "onOpen": {
    "message": "The chest lid creaks open with a cheerful squeak, as if it's happy to share its contents with you."
  },

  "onClose": {
    "message": "The chest closes with a gentle thump and a satisfied sigh."
  }
}
