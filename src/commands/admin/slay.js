/**
 * Slay Command (Admin)
 *
 * Instantly kills an NPC, triggering normal death processing including corpse generation
 * Use this for testing the corpse and respawn system
 * Usage: slay <target>
 */

const colors = require('../../colors');

function execute(player, args, context) {
  const { world } = context;

  if (args.length === 0) {
    player.send('\n' + colors.error('Slay who?\n'));
    player.send(colors.info('Usage: slay <target>\n'));
    return;
  }

  // Find target NPC in current room
  const room = world.getRoom(player.currentRoom);
  if (!room) {
    player.send('\n' + colors.error('You seem to be nowhere. This is a problem.\n'));
    return;
  }

  const targetName = args.join(' ').toLowerCase();
  const npc = room.npcs?.find(n =>
    n.name.toLowerCase().includes(targetName) ||
    n.id.toLowerCase().includes(targetName)
  );

  if (!npc) {
    player.send('\n' + colors.error(`No NPC matching "${args.join(' ')}" found in this room.\n`));
    return;
  }

  // Prevent slaying NPCs already in combat or dead
  if (npc.isDead) {
    player.send('\n' + colors.error(`${npc.name} is already dead.\n`));
    return;
  }

  // Import combat system to trigger death properly
  const CombatEngine = require('../../systems/combat/CombatEngine');

  // Set HP to 0 to trigger death processing
  npc.currentHP = 0;

  // Process death (this will create corpse, trigger respawn, etc.)
  CombatEngine.processNPCDeath(npc, player, room, world);

  // Notify admin
  player.send('\n' + colors.success(`${npc.name} has been slain!\n`));
  player.send(colors.info(`Corpse created. NPC will respawn according to corpse system.\n`));
}

module.exports = {
  name: 'slay',
  aliases: ['adminkill', 'instakill'],
  description: 'Instantly kill an NPC with corpse generation (admin)',
  usage: 'slay <target>',
  examples: [
    'slay wumpy - Slay the wumpy',
    'slay big bird - Slay Big Bird',
    'adminkill grover - Slay Grover using alias'
  ],
  execute
};
