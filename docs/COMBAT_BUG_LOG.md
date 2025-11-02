# Combat System Bug Log - Missing Output and Score Command Error

**Date:** November 2, 2025

## Issue Description

After implementing Phase 5 (XP and Levelling) and making changes related to player stat persistence and loading, two critical bugs have emerged:

1.  **Missing Combat Output:** When combat is initiated and rounds execute, no messages (attack, damage, death, etc.) are displayed to the players. The `Combat has begun!` message is shown, but subsequent combat events are silent.
2.  **`score` Command Error:** The `score` command, intended to display detailed player stats (level, XP, HP, core attributes), is consistently throwing an error, resulting in the message "An error occurred while processing that command." being displayed to the client.

## Investigation Steps and Findings

### Initial Hypothesis

*   **Missing Combat Output:** Suspected issues with the `broadcast` function in `src/combat/CombatEncounter.js` or how `this.participants` was being handled, leading to messages not being sent to the correct `Player` instances.
*   **`score` Command Error:** Suspected that the `player` object was not being correctly populated with combat stats (`player.level`, `player.xp`, `player.hp`, `player.stats.strength`, etc.) during login or new player creation.

### Debugging Attempts (and Challenges)

1.  **`score` Command Debugging (Initial):**
    *   Updated `src/commands.js` to include `try...catch` blocks in the `score` command to capture specific error messages.
    *   Corrected `player.currentHp` to `player.hp` for consistency.
    *   **Result:** The client still received a generic "An error occurred..." message, indicating the error message from the `catch` block was not being fully displayed to the client.

2.  **Server Output Redirection (Persistent Issue):**
    *   Attempted to capture server-side `console.log` output by redirecting `stdout` and `stderr` to `server_output.log` when running `node src/server.js &`.
    *   Added `console.log(player)` in `src/server.js` (`handleCreatePassword`) to inspect the `player` object's state.
    *   Added `console.log("Server started.")` at the very beginning of `src/server.js` to confirm redirection.
    *   **Result:** `server_output.log` consistently remained empty across multiple attempts. This prevents effective server-side debugging using `console.log`. The cause of this redirection failure is currently unknown.

3.  **`CombatEncounter` Participant Handling:**
    *   Identified a potential issue where `this.participants` in `CombatEncounter.js` might not be holding references to the *live* `Player` objects from the `allPlayers` set, leading to `broadcast` messages not reaching the correct clients.
    *   Modified the `CombatEncounter` constructor to map incoming `participants` to their live `Player` instances from `allPlayers` before passing them to `determineTurnOrder`.
    *   **Result:** Combat messages are still not appearing.

4.  **Player Stat Population (`src/server.js`):**
    *   Reviewed `handleLoginPassword` and `handleCreatePassword` functions in `src/server.js`.
    *   Updated these functions to use nullish coalescing (`??`) for assigning default values to player combat stats and defensively accessing `playerData.stats` properties.
    *   **Result:** `score` command still errors out, and combat messages are still missing.

## Current Status

*   The core problem appears to be a fundamental issue with how `Player` objects are being managed or updated, leading to `undefined` or `null` properties when accessed by commands like `score`.
*   The inability to capture server-side `console.log` output is severely hindering debugging efforts.
*   The missing combat output suggests a deeper problem in the combat loop or message broadcasting mechanism, possibly related to the `Player` object state.

## Next Steps

1.  **Prioritize Server Output Debugging:** Before proceeding with any further code changes, a reliable method for capturing server-side `console.log` output must be established. Without this, debugging remains extremely difficult.
2.  **Re-evaluate `Player` Object Lifecycle:** Thoroughly re-examine how `Player` objects are instantiated, updated, and referenced throughout the server, especially during login/creation and combat.
3.  **Isolate Combat Output Bug:** Once server output is available, use targeted `console.log` statements within `CombatEncounter.js` and `combatMessages.js` to trace the flow of combat messages and identify where they are being dropped.
4.  **Isolate `score` Command Bug:** Use targeted `console.log` statements within the `score` command to identify which specific property access is causing the error.

## Conclusion

The current state indicates a regression in core functionality (combat output and player stats display). The immediate priority is to establish effective debugging tools (server logging) and then systematically isolate and fix these issues, starting with the `score` command error as it's more directly observable.
