# MUD Design Document

## I. Core Concept

> "You can't just go building a better world for people. Only people can build a better world for people. Otherwise it's just a cage." - Terry Pratchett, *Witches Abroad*

This document outlines the design for a new Multi-User Dungeon (MUD). This MUD will be a text-based, multiplayer online role-playing game, in the tradition of the classic LPC MUDs like Discworld and LooneyMUD.

This MUD, tentatively titled "The Wumpy and Grift," will be a satirical reflection of our own world, viewed through a lens of 90s nostalgia. It is a passion project, a digital hangout for the creator and their best friend, Jon, inspired by their shared experiences on LooneyMUD.

The world will be rich with tongue-in-cheek references to their childhood, featuring absurdities like kicking "wumpies" and "grifting down reality street." It will be a place where the Transformers can have a guild with a hottub.

The core gameplay will feature a rich guild system, with spells, levels, and other classic RPG elements. The presentation will be enhanced with colored text and ASCII art to create a visually engaging experience.

## II. Technical Foundation

The MUD will be built with modern technology, but will retain the classic text-based interface. Key technical features will include:

*   **Colored Text & ASCII Art:** The client and server will support a protocol for colored text and ASCII art to enhance the visual experience.
*   **Websocket Communication:** We'll use websockets for real-time, low-latency communication between the client and server.
*   **Node.js Backend:** The server will be built on Node.js, which is well-suited for handling the asynchronous nature of a MUD.

## III. World Design

The world will be divided into several distinct "realms," each with its own unique theme, inhabitants, and laws of physics. These realms are connected by a series of strange and often unreliable pathways. The initial realms will be:

*   **The Simpsons:** A cartoonish realm based on the iconic animated series.
*   **Florida:** A surreal and satirical representation of the Sunshine State.
*   **Texas:** A larger-than-life version of the Lone Star State.
*   **Disney World:** A twisted and commercialized version of the famous theme park.
*   **Sesame Street:** This realm will serve as the starting area for new players, a loving and satirical homage to the Sesame Street from LooneyMUD. The main area is a single street featuring: 
    *   A general store for basic supplies.
    *   A bar for socializing.
    *   Wandering wumpies.
    *   Appearances by twisted versions of well-known characters.
    *   At one end of the street, a teleport booth for accessing other realms.
    *   At the other end, the entrance to Reality Street.

    **Reality Street:** A warped, drug-filled, "black mirror" of Sesame Street. This will be a more dangerous and surreal area for players who are looking for a challenge.
*   **Saturday Morning Cartoons:** A chaotic realm where various cartoon universes collide.
*   **Wumpy University:** The esteemed institution of higher learning for wumpies and other creatures of the MUD.
