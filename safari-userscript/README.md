# iPhone Userscript version

This folder contains a userscript version of the Caverns of the Mad Mage mobile controller. It is designed for iPhone Safari with a userscript manager such as Userscripts.

## File

`caverns-mobile-controller.user.js`

## How it works

The script runs in two places:

1. On the original itch.io game page, it creates the touch controller above the game iframe.
2. Inside the official itch.io game runtime, it receives controller commands through `postMessage` and dispatches keyboard/mouse events in the game document.

This means you should open the original game page on itch.io. Do **not** load the HTML5 runtime directly or use the old iframe/proxy website.

## iPhone setup

1. Install a Safari userscript manager that supports iOS and web-page injection, for example Userscripts.
2. Give the userscript extension Safari website access when prompted. For the game, allow access to both `bluesquirrel.itch.io` and `html-classic.itch.zone`.
3. Import `caverns-mobile-controller.user.js` into the userscript manager.
4. Enable the script.
5. Open the original Caverns of the Mad Mage page on itch.io in Safari.
6. Start the game. The virtual W/A/S/D, Q/E, Enter/Esc, mouse pad, LMB and RMB controls should appear over the game.

## Important limitation

JavaScript-created KeyboardEvent and MouseEvent objects are synthetic (`isTrusted === false`). Most browser games that listen to ordinary DOM keyboard/mouse events can work with this approach, but a game that requires browser-trusted hardware input may reject them. This userscript therefore avoids pretending to be a browser-level physical mouse or keyboard.

## Current game runtime

The script targets the official runtime used by this game:

`https://html-classic.itch.zone/html/17576366/`

If itch.io changes the game's runtime URL in the future, update the `@match` entry and `GAME_PATH` in the userscript.
