# Caverns Mobile Controller — Safari Web Extension

This extension injects a touch D-pad, virtual mouse pad, LMB/RMB, Enter and Esc directly into the game's HTML5 runtime. It does not iframe, proxy, mirror, or hotlink the game from a separate website.

## Requirements

- macOS with Xcode installed
- An iPhone running a current version of iOS
- Safari on the iPhone
- A free or paid Apple Developer account for device signing/deployment through Xcode

## Build the Safari extension on a Mac

From Terminal, clone this repository and run:

```bash
git clone https://github.com/RustySupernova/Virtual-mouse.git
cd Virtual-mouse
xcrun safari-web-extension-converter safari-extension --project-location ./SafariExtensionApp
```

Xcode will generate a native container app containing the Safari Web Extension. Open the generated `.xcodeproj` in Xcode.

In Xcode:

1. Select the generated app target.
2. Choose your Apple Developer Team under Signing & Capabilities.
3. Select your connected iPhone as the run destination.
4. Press Run.
5. Allow the app to install on the iPhone.

## Enable the extension on iPhone

On the iPhone open:

Settings → Apps → Safari → Extensions → Caverns Mobile Controller

Enable the extension and allow it to access websites when Safari asks.

Then open:

https://bluesquirrel.itch.io/caverns-of-the-mad-mage

The game remains hosted by itch.io. The extension injects the controller into the game's own HTML5 runtime, so there is no custom iframe or proxy page.

## Controls

- D-pad: W/A/S/D
- ENTER: Enter
- ESC: Escape
- Mouse pad: relative mouse movement
- LMB: left mouse button
- RMB: right mouse button
- Small arrow button: temporarily fade the controller

The game's itch.io page documents WASD/arrow movement, Enter for stairs/doors, and mouse click/drag for inventory interaction.
