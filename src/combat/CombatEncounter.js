const { determineTurnOrder } = require('./initiative');
const { rollAttack, rollDamage, applyDamage } = require('./combatResolver');
const { getAttackMessage, getDamageMessage, getDeathMessage } = require('./combatMessages');
const colors = require('../colors');

class CombatEncounter {
    constructor(participants, world, allPlayers) {
        this.participants = determineTurnOrder(participants);
        this.world = world;
        this.allPlayers = allPlayers;
        this.turn = 0;
        this.isActive = true;
    }

    initiateCombat() {
        const room = this.world.getRoom(this.participants[0].currentRoom);
        if (room) {
            for (const p of this.allPlayers) {
                if (p.currentRoom === room.id) {
                    p.send('\n' + colors.combat('Combat has begun!\n'));
                }
            }
        }
    }

    executeCombatRound() {
        if (!this.isActive) return;

        this.turn++;
        console.log(`Combat round ${this.turn}`);

        for (const attacker of this.participants) {
            if (attacker.isDead()) continue;

            const target = this.participants.find(p => p !== attacker && !p.isDead());
            if (!target) {
                this.endCombat();
                return;
            }

            const attackResult = rollAttack(attacker, target);
            const attackMessage = getAttackMessage(attacker, target, attackResult.hit, attackResult.critical);
            this.broadcast(attackMessage);

            if (attackResult.hit) {
                const damage = rollDamage(attacker, '1d6', attackResult.critical);
                const damageResult = applyDamage(target, damage, 'physical');
                const damageMessage = getDamageMessage(damageResult.finalDamage, 'physical');
                this.broadcast(damageMessage);

                if (damageResult.dead) {
                    const deathMessage = getDeathMessage(target);
                    this.broadcast(deathMessage);
                    this.endCombat();
                    return;
                }
            }
        }
    }

    endCombat() {
        this.isActive = false;
        const room = this.world.getRoom(this.participants[0].currentRoom);
        if (room) {
            for (const p of this.allPlayers) {
                if (p.currentRoom === room.id) {
                    p.send('\n' + colors.combat('Combat has ended!\n'));
                }
            }
        }
    }

    broadcast(message) {
        for (const participant of this.participants) {
            if (participant.socket) { // Check if it's a player
                participant.send('\n' + message + '\n');
            }
        }
    }
}

module.exports = CombatEncounter;
