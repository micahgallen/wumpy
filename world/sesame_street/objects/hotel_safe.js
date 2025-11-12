{
  "id": "hotel_safe_room_01",
  "name": "a small hotel safe",
  "description": "A compact wall-mounted safe with a digital keypad. The manufacturer's label reads 'SecureStay 3000 - Because Your Peace of Mind Matters.' Someone has stuck a smiley face sticker next to the keypad. The combination has been changed so many times that there's a worn sticky note on the wall reading 'If locked out, see front desk.'",
  "keywords": [
    "safe",
    "hotel safe",
    "wall safe",
    "lockbox"
  ],

  "containerType": "room_container",
  "isRoomContainer": true,
  "isTakeable": false,
  "isExaminable": true,

  "isOpen": false,
  "isLocked": true,
  "lockDifficulty": 15,
  "keyItemId": "hotel_safe_key_01",
  "capacity": 10,

  "lootConfig": {
    "spawnOnInit": false,
    "respawnOnEmpty": false
  },

  "onUnlock": {
    "message": "The safe beeps twice and the locking mechanism clicks open with a satisfying thunk."
  },

  "onOpen": {
    "message": "The heavy safe door swings open smoothly on well-oiled hinges."
  }
}
