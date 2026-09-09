# Caverns of the Mad Mage — iPhone controller

This project provides a touch controller for playing Caverns of the Mad Mage on iPhone.

## Important browser limitation

The game is hosted on `html-classic.itch.zone` while GitHub Pages is hosted on `github.io`. Browser same-origin security prevents a page on GitHub Pages from creating real keyboard or mouse events inside the cross-origin game iframe. `postMessage()` does not solve this unless the game itself implements a message listener.

Therefore the controller has two modes:

1. Direct mode: loads the official itch.io runtime, but the virtual controls cannot inject keyboard/mouse events because it is cross-origin.
2. Same-origin mode: use `worker.js` with Cloudflare Workers so the controller and game are served from the same Worker origin. The controller can then dispatch keyboard and mouse events into the game iframe.

## Cloudflare Worker setup

Create a Cloudflare Worker and paste the contents of `worker.js` into it. Deploy it. Open the Worker URL, for example `https://your-worker.workers.dev/`.

In the controller, open Settings and set **Game proxy URL** to:

`https://your-worker.workers.dev/game/`

Then return to the main screen and tap **Load Game**.

The Worker serves the controller from the GitHub Pages site and proxies the game's HTML5 runtime and relative assets under `/game/`. The iframe therefore uses the same origin as the controller.

## Controls

- D-pad: W / A / S / D movement
- ENTER: stairs / doors
- ESC: Escape
- Mouse pad: move the virtual mouse
- LMB: left mouse button
- RMB: right mouse button
- Drag the mouse pad while holding LMB to drag items

The controller is designed for iPhone portrait and landscape orientations.

## Source game

Caverns of the Mad Mage: https://bluesquirrel.itch.io/caverns-of-the-mad-mage

The game itself remains hosted by its original creator. This repository contains the mobile controller and optional proxy code; do not redistribute the game's assets without the creator's permission.
