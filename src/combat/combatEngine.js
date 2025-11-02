const CombatEncounter = require('./CombatEncounter');

class CombatEngine {
    constructor(world, allPlayers) {
        this.world = world;
        this.allPlayers = allPlayers;
        this.activeCombats = [];
        setInterval(() => {
            try {
                this.processCombatRounds();
            } catch (err) {
                console.error('Error in combat loop:', err);
            }
        }, 3000);
    }

    initiateCombat(participants) {
        const encounter = new CombatEncounter(participants, this.world, this.allPlayers);
        this.activeCombats.push(encounter);
        encounter.initiateCombat();
    }

    processCombatRounds() {
        for (const encounter of this.activeCombats) {
            if (encounter.isActive) {
                encounter.executeCombatRound();
            }
        }

        this.activeCombats = this.activeCombats.filter(encounter => encounter.isActive);
    }
}

module.exports = CombatEngine;
