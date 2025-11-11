#!/bin/bash
# Restore Sesame Street from Birthday Party Mode
# Run this script to revert all birthday party changes

echo "=================================================="
echo "  Restoring Sesame Street from Birthday Party"
echo "=================================================="
echo ""

# Restore the main plaza room
echo "1. Restoring main plaza room..."
cp /home/micah/wumpy/world/sesame_street/street_backup_pre_birthday.js /home/micah/wumpy/world/sesame_street/rooms/street.js
if [ $? -eq 0 ]; then
    echo "   ✓ Plaza restored from backup"
else
    echo "   ✗ Error: Could not restore backup. Check file exists."
    exit 1
fi
echo ""

# Instructions for manual edits
echo "2. MANUAL STEP REQUIRED - Edit ConnectionHandler.js:"
echo "   File: /home/micah/wumpy/src/server/ConnectionHandler.js"
echo ""
echo "   Change line 2 from:"
echo "     const { getBanner, getTexanBirthdayBanner } = require('../banner');"
echo "   To:"
echo "     const { getBanner } = require('../banner');"
echo ""
echo "   Change line 45 from:"
echo "     player.send('\\n' + getTexanBirthdayBanner() + '\\n');"
echo "   To:"
echo "     player.send('\\n' + getBanner() + '\\n');"
echo ""

# Offer to remove birthday files
echo "3. Would you like to remove the birthday party files? (y/N)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "   Removing birthday party files..."
    rm -f /home/micah/wumpy/world/sesame_street/objects/texan_birthday_cake.js
    rm -f /home/micah/wumpy/world/sesame_street/npcs/bert_fire_safety.js
    rm -f /home/micah/wumpy/world/sesame_street/npcs/ernie_relaxed.js
    rm -f /home/micah/wumpy/world/sesame_street/npcs/cookie_monster_helpful.js
    echo "   ✓ Birthday party files removed"
else
    echo "   ✓ Birthday party files kept (they won't load unless referenced)"
fi

echo ""
echo "=================================================="
echo "  Restoration Complete!"
echo "=================================================="
echo ""
echo "NEXT STEPS:"
echo "1. Complete the manual edits to ConnectionHandler.js (see above)"
echo "2. Restart your MUD server"
echo "3. Sesame Street will be back to normal!"
echo ""
echo "The birthday party was fun while it lasted."
echo "Bert can finally stop hyperventilating."
echo ""
