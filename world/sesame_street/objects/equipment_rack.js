{
  "id": "equipment_rack",
  "name": "a battered equipment rack",
  "description": "This rack has the energy of a participation trophy that's given up participating. It holds an assortment of training equipment in various states of denial about their functionality: a wooden practice sword that's more splinter than sword, some padding that's achieved the consistency of cardboard, and what might have once been a helmet but is now more of a 'decorative bowl with a tragic backstory.' A hand-written sign dangles from a nail: 'TAKE WHAT YOU NEED. LEAVE WHAT YOU VALUE. MANAGEMENT STOPPED CARING IN '03.'",
  "keywords": ["rack", "equipment", "equipment rack", "training gear"],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isOpen": true,
  "isCloseable": false,
  "capacity": 20,
  "hideContainerStatus": true,

  "lootConfig": {
    "spawnOnInit": true,
    "respawnOnEmpty": false,

    "guaranteedItems": [
      {
        "itemId": "rusty_dagger",
        "quantity": 1,
        "chance": 100
      },
      {
        "itemId": "wooden_practice_sword",
        "quantity": 1,
        "chance": 100
      }
    ]
  }
}
