/**
 * Quest Item Mixin
 *
 * Provides quest item-specific functionality.
 * Quest items are typically non-droppable and non-tradeable.
 */

const QuestItemMixin = {
  /**
   * Override drop behavior for quest items
   * @param {Object} player - Player attempting to drop
   * @param {Object} room - Room where item would be dropped
   * @returns {boolean} Always false for quest items
   */
  onDrop(player, room) {
    return false;  // Quest items cannot be dropped
  },

  /**
   * Check if this is a quest item
   * @returns {boolean} True
   */
  isQuest() {
    return true;
  },

  /**
   * Get quest item description with warning
   * @param {Object} player - Player viewing the item
   * @returns {string} Enhanced description
   */
  getQuestItemDescription(player) {
    let desc = this.getDescription(player);

    desc += '\n\nThis is a quest item. It cannot be dropped or traded.';

    if (this.consumableProperties && this.consumableProperties.questId) {
      desc += `\nRequired for quest: ${this.consumableProperties.questId}`;
    }

    return desc;
  },

  /**
   * Check if quest item can be used
   * @param {Object} player - Player using the item
   * @param {Object} context - Usage context
   * @returns {boolean} True if can be used
   */
  canBeUsed(player, context) {
    // Quest items might only be usable in specific contexts
    if (this.consumableProperties && this.consumableProperties.usableLocations) {
      const currentLocation = context.location || player.currentRoom;
      return this.consumableProperties.usableLocations.includes(currentLocation);
    }

    return true;
  },

  /**
   * Get quest information
   * @returns {Object|null} Quest info if available
   */
  getQuestInfo() {
    if (!this.consumableProperties) {
      return null;
    }

    return {
      questId: this.consumableProperties.questId || null,
      questStage: this.consumableProperties.questStage || null,
      questDescription: this.consumableProperties.questDescription || null
    };
  }
};

/**
 * Apply quest item mixin to an item instance
 * @param {Object} item - Item instance
 */
function applyQuestItemMixin(item) {
  // Force quest item flags
  item.isQuestItem = true;
  item.isDroppable = false;
  item.isTradeable = false;

  Object.assign(item, QuestItemMixin);
}

module.exports = {
  QuestItemMixin,
  applyQuestItemMixin
};
