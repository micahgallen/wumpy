{
  "id": "general_store_barrel_discounted",
  "name": "a bargain barrel",
  "description": "A large wooden barrel with a hand-painted sign reading 'BARGAIN BIN - Everything Must Go!' The barrel is filled with slightly dented cans, outdated snacks, and various odds and ends that Hooper couldn't quite sell at full price. One person's trash is another person's treasure, especially if that person is Oscar.",
  "keywords": [
    "barrel",
    "bargain barrel",
    "bin",
    "bargain bin",
    "discount barrel"
  ],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isOpen": true,
  "isLocked": false,
  "capacity": 20,

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": true,
    "respawnDelay": 900000,

    "guaranteedItems": [
      {
        "itemId": "sardine_can",
        "quantity": 2,
        "chance": 80
      },
      {
        "itemId": "oatmeal_cookie",
        "quantity": 1,
        "chance": 60
      }
    ],

    "randomItems": {
      "count": 4,
      "lootTable": "trash_loot"
    }
  }
}
