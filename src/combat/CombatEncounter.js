const { determineTurnOrder } = require('./initiative');
const { rollAttack, rollDamage, applyDamage, getDamageDice } = require('./combatResolver');
const { getAttackMessage, getDamageMessage, getDeathMessage } = require('./combatMessages');
const { determineNPCAction } = require('./combatAI');
const { awardXP, calculateCombatXP } = require('../progression/xpSystem');
const colors = require('../colors');
const logger = require('../logger');
const EquipmentManager = require('../systems/equipment/EquipmentManager');

class CombatEncounter {
    constructor(participants, world, allPlayers, playerDB) {


        // Ensure participants are live Player objects from allPlayers set or actual NPC objects
        const actualCombatants = participants.map(p => {
            if (p.socket) { // If it's a player
                // Find the live player object from the allPlayers set
                return Array.from(allPlayers).find(ap => ap.username === p.username) || p;
            }
            // For NPCs, 'p' should already be the live NPC object from the world
            return p;
        });

        this.participants = determineTurnOrder(actualCombatants);        this.world = world;
        this.allPlayers = allPlayers;
        this.playerDB = playerDB;
        this.turn = 0;
        this.isActive = true;

        // Store the room ID for this combat - find it from any player participant
        // NPCs don't have currentRoom, so we need to find a player
        const player = this.participants.find(p => p.socket && p.currentRoom);
        this.roomId = player ? player.currentRoom : null;
    }

    initiateCombat() {
        this.broadcast(colors.combat('Combat has begun!'));
    }

    executeCombatRound() {
        if (!this.isActive) return;

        this.turn++;
        logger.log(`Combat round ${this.turn}`);

        for (const attacker of this.participants) {
            if (attacker.isDead()) continue;

            const target = this.participants.find(p => p !== attacker && !p.isDead());
            if (!target) {
                this.endCombat();
                return;
            }

            // If attacker is an NPC, determine their action
            if (!attacker.socket) { // NPCs don't have sockets
                const action = determineNPCAction(attacker, this);

                if (action === 'flee') {
                    // NPC attempts to flee - player gets attack of opportunity
                    const player = target; // The other participant must be the player

                    this.broadcast(colors.combat(`${attacker.name} attempts to flee!`));

                    // Attack of opportunity
                    const opportunityAttack = rollAttack(player, attacker);
                    const opportunityMessage = getAttackMessage(player, attacker, opportunityAttack.hit, opportunityAttack.critical);
                    this.broadcast(colors.hit(`[Attack of Opportunity] `) + opportunityMessage);

                    if (opportunityAttack.hit) {
                        const damageInfo = getDamageDice(player);
                        const damage = rollDamage(player, damageInfo, opportunityAttack.critical);
                        const damageResult = applyDamage(attacker, damage, 'physical');
                        const damageMessage = getDamageMessage(damageResult.finalDamage, 'physical', attacker);
                        this.broadcast(damageMessage);

                        if (damageResult.dead) {
                            const deathMessage = getDeathMessage(attacker);
                            this.broadcast(deathMessage);
                            this.broadcast(colors.combat(`${attacker.name} dies while trying to flee!`));

                            // Award XP and remove dead NPC
                            if (player.socket && player.username) {
                                const xp = calculateCombatXP(attacker, player.level);
                                awardXP(player, xp, 'combat', this.playerDB);
                            }
                            this.removeNPCFromRoom(attacker);
                            this.endCombat(true); // Skip XP award in endCombat (already awarded)
                            return;
                        }
                    }

                    // NPC survives and flees to adjacent room
                    const fleeSuccess = this.moveNPCToAdjacentRoom(attacker);

                    if (fleeSuccess) {
                        this.broadcast(colors.combat(`${attacker.name} flees from combat!`));
                    } else {
                        this.broadcast(colors.combat(`${attacker.name} tries to flee but there's nowhere to go!`));
                    }

                    this.endCombat();
                    return;
                }
            }

            const attackResult = rollAttack(attacker, target);
            const attackMessage = getAttackMessage(attacker, target, attackResult.hit, attackResult.critical);
            this.broadcast(attackMessage);

            if (attackResult.hit) {
                const damageInfo = getDamageDice(attacker);
                const damage = rollDamage(attacker, damageInfo, attackResult.critical);
                const damageResult = applyDamage(target, damage, 'physical');
                const damageMessage = getDamageMessage(damageResult.finalDamage, 'physical', target);
                this.broadcast(damageMessage);

                if (damageResult.dead) {
                    const deathMessage = getDeathMessage(target);
                    this.broadcast(deathMessage);

                    if (target.socket && target.username) {
                        target.isGhost = true;
                        this.playerDB.updatePlayerGhostStatus(target.username, true);
                        target.send('\n' + colors.error('======================================'));
                        target.send('\n' + colors.error('        YOU HAVE DIED!'));
                        target.send('\n' + colors.error('======================================'));
                        target.send('\n' + colors.info('You are now a GHOST.'));
                        target.send('\n' + colors.hint('As a ghost, you cannot attack or be attacked.'));
                        target.send('\n' + colors.hint('Your form is translucent and ethereal.'));
                        target.send('\n' + colors.hint('(Respawn mechanics coming soon...)'));
                        target.send('\n');
                    }

                    this.endCombat();
                    return;
                }
            }

            // Check for dual wield off-hand attack (if attacker is player with equipment system)
            if (attacker.inventory && EquipmentManager.isDualWielding(attacker)) {
                const offHandAttack = rollAttack(attacker, target, 'physical', 'off_hand');
                const offHandMessage = getAttackMessage(attacker, target, offHandAttack.hit, offHandAttack.critical, 'off_hand');
                this.broadcast(colors.combat('[Off-Hand] ') + offHandMessage);

                if (offHandAttack.hit) {
                    const offHandDamageInfo = getDamageDice(attacker, 'off_hand');
                    const offHandDamage = rollDamage(attacker, offHandDamageInfo, offHandAttack.critical, 'off_hand');
                    const offHandDamageResult = applyDamage(target, offHandDamage, 'physical');
                    const offHandDamageMessage = getDamageMessage(offHandDamageResult.finalDamage, 'physical', target);
                    this.broadcast(offHandDamageMessage);

                    if (offHandDamageResult.dead) {
                        const deathMessage = getDeathMessage(target);
                        this.broadcast(deathMessage);

                        if (target.socket && target.username) {
                            target.isGhost = true;
                            this.playerDB.updatePlayerGhostStatus(target.username, true);
                            target.send('\n' + colors.error('======================================'));
                            target.send('\n' + colors.error('        YOU HAVE DIED!'));
                            target.send('\n' + colors.error('======================================'));
                            target.send('\n' + colors.info('You are now a GHOST.'));
                            target.send('\n' + colors.hint('As a ghost, you cannot attack or be attacked.'));
                            target.send('\n' + colors.hint('Your form is translucent and ethereal.'));
                            target.send('\n' + colors.hint('(Respawn mechanics coming soon...)'));
                            target.send('\n');
                        }

                        this.endCombat();
                        return;
                    }
                }
            }
        }
    }

    endCombat(skipXpAward = false) {
        this.isActive = false;

        const winner = this.participants.find(p => !p.isDead());
        const loser = this.participants.find(p => p.isDead());

        // Award XP if player won against NPC (unless already awarded, e.g., during flee)
        if (winner && loser && winner.socket && !loser.socket && !skipXpAward) {
            const xp = calculateCombatXP(loser, winner.level);
            awardXP(winner, xp, 'combat', this.playerDB);

            // Remove dead NPC from room so it can respawn properly
            this.removeNPCFromRoom(loser);
        } else if (loser && !loser.socket && skipXpAward) {
            // XP was already awarded (e.g., during flee), just remove the NPC
            this.removeNPCFromRoom(loser);
        }

        this.broadcast(colors.combat('Combat has ended!'));
    }

    /**
     * Remove an NPC from its current room
     * @param {Object} npc - The NPC to remove
     */
    removeNPCFromRoom(npc) {
        if (!npc || npc.socket) return; // Only remove NPCs, not players

        const room = this.world.getRoom(this.roomId);
        if (room && room.npcs) {
            // Find the NPC ID in the room
            const npcId = Object.keys(this.world.npcs).find(id => this.world.npcs[id] === npc);

            if (npcId) {
                const index = room.npcs.indexOf(npcId);
                if (index > -1) {
                    room.npcs.splice(index, 1);
                    logger.log(`Removed NPC ${npc.name} (${npcId}) from room ${room.id}`);
                }
            }
        }
    }

    /**
     * Move an NPC to a random adjacent room
     * @param {Object} npc - The NPC to move
     * @returns {boolean} True if moved successfully, false if no exits
     */
    moveNPCToAdjacentRoom(npc) {
        if (!npc || npc.socket) return false; // Only move NPCs, not players

        const currentRoom = this.world.getRoom(this.roomId);
        if (!currentRoom || !currentRoom.exits || currentRoom.exits.length === 0) {
            return false; // No exits available
        }

        // Find the NPC ID
        const npcId = Object.keys(this.world.npcs).find(id => this.world.npcs[id] === npc);
        if (!npcId) {
            return false;
        }

        // Choose random exit
        const randomExit = currentRoom.exits[Math.floor(Math.random() * currentRoom.exits.length)];
        const destinationRoom = this.world.getRoom(randomExit.room);

        if (!destinationRoom) {
            return false; // Destination doesn't exist
        }

        // Remove NPC from current room
        const index = currentRoom.npcs.indexOf(npcId);
        if (index > -1) {
            currentRoom.npcs.splice(index, 1);
        }

        // Add NPC to destination room
        if (!destinationRoom.npcs) {
            destinationRoom.npcs = [];
        }
        destinationRoom.npcs.push(npcId);

        logger.log(`NPC ${npc.name} (${npcId}) fled from ${currentRoom.id} to ${destinationRoom.id} via ${randomExit.direction}`);

        // Notify players in destination room
        for (const p of this.allPlayers) {
            if (p.currentRoom === destinationRoom.id) {
                p.send(`\n${colors.action(`${npc.name} arrives, fleeing from combat!`)}\n`);
            }
        }

        return true;
    }

    broadcast(message) {
        // Send combat messages to all players in the same room, not just participants
        if (!this.roomId) {
            logger.log('Warning: Combat has no room ID, cannot broadcast');
            return;
        }

        const room = this.world.getRoom(this.roomId);
        if (room) {
            for (const p of this.allPlayers) {
                if (p.currentRoom === room.id) {
                    p.send('\n' + message + '\n');
                }
            }
        }
    }
}

module.exports = CombatEncounter;
