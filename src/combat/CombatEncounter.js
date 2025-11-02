const { determineTurnOrder } = require('./initiative');
const { rollAttack, rollDamage, applyDamage } = require('./combatResolver');
const { getAttackMessage, getDamageMessage, getDeathMessage } = require('./combatMessages');
const { determineNPCAction } = require('./combatAI');
const { awardXP, calculateCombatXP } = require('../progression/xpSystem');
const colors = require('../colors');
const logger = require('../logger');

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
    }

    initiateCombat() {
        const room = this.world.getRoom(this.participants[0].currentRoom);
        if (room) {
            this.broadcast(colors.combat('Combat has begun!'));
        }
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
                    this.broadcast(`${attacker.name} flees from combat!`);
                    this.endCombat();
                    return;
                }
            }

            const attackResult = rollAttack(attacker, target);
            const attackMessage = getAttackMessage(attacker, target, attackResult.hit, attackResult.critical);
            this.broadcast(attackMessage);

            if (attackResult.hit) {
                const damage = rollDamage(attacker, '1d6', attackResult.critical);
                const damageResult = applyDamage(target, damage, 'physical');
                const damageMessage = getDamageMessage(damageResult.finalDamage, 'physical', target);
                this.broadcast(damageMessage);

                if (damageResult.dead) {
                    const deathMessage = getDeathMessage(target);
                    this.broadcast(deathMessage);

                    if (target.socket && target.username) {
                        target.isGhost = true;
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

    endCombat() {
        this.isActive = false;

        const winner = this.participants.find(p => !p.isDead());
        const loser = this.participants.find(p => p.isDead());

        if (winner && loser && winner.socket && !loser.socket) {
            const xp = calculateCombatXP(loser, winner.level);
            awardXP(winner, xp, 'combat', this.playerDB);
        }

        this.broadcast(colors.combat('Combat has ended!'));
    }

    broadcast(message) {
        // Send combat messages to all players in the same room, not just participants
        const room = this.world.getRoom(this.participants[0].currentRoom);
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
