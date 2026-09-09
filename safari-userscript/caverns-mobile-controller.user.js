// ==UserScript==
// @name         Caverns of the Mad Mage - Mobile Controller
// @namespace    https://github.com/RustySupernova/Virtual-mouse
// @version      2.0.0
// @description  iPhone touch controls for Caverns of the Mad Mage. Opens the HTML5 game directly so keyboard/mouse events can be dispatched in the game's own document.
// @match        https://bluesquirrel.itch.io/caverns-of-the-mad-mage*
// @match        https://html-classic.itch.zone/html/17576366/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const OUTER_ORIGIN = 'https://bluesquirrel.itch.io';
  const GAME_URL = 'https://html-classic.itch.zone/html/17576366/index.html';
  const GAME_ORIGIN = 'https://html-classic.itch.zone';
  const UI_ID = 'cmc-mobile-controller';
  const STYLE_ID = 'cmc-mobile-controller-style';

  // The original itch.io page embeds the game in a cross-origin iframe.
  // A controller on the parent page cannot directly dispatch keyboard/mouse
  // events into that iframe. Instead, move the top-level page to the game's
  // own URL. The same userscript then runs in the game document and can send
  // events directly to it.
  if (location.origin === OUTER_ORIGIN && location.pathname.startsWith('/caverns-of-the-mad-mage')) {
    location.replace(GAME_URL);
    return;
  }

  if (location.origin !== GAME_ORIGIN || !location.pathname.startsWith('/html/17576366/')) return;

  // Avoid installing twice if Safari reloads/injects the script more than once.
  if (window.top !== window.self) return;
  if (document.getElementById(UI_ID)) return;

  const KEY_INFO = {
    w: { key: 'w', code: 'KeyW', keyCode: 87 },
    a: { key: 'a', code: 'KeyA', keyCode: 65 },
    s: { key: 's', code: 'KeyS', keyCode: 83 },
    d: { key: 'd', code: 'KeyD', keyCode: 68 },
    q: { key: 'q', code: 'KeyQ', keyCode: 81 },
    e: { key: 'e', code: 'KeyE', keyCode: 69 },
    z: { key: 'z', code: 'KeyZ', keyCode: 90 },
    c: { key: 'c', code: 'KeyC', keyCode: 67 },
    Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
    Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
    ' ': { key: ' ', code: 'Space', keyCode: 32 },
    Space: { key: ' ', code: 'Space', keyCode: 32 },
    ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 }
  };

  function fireKeyboard(type, name) {
    const info = KEY_INFO[name] || { key: name, code: name, keyCode: 0 };
    const event = new KeyboardEvent(type, {
      key: info.key,
      code: info.code,
      location: 0,
      bubbles: true,
      cancelable: true,
      composed: true,
      repeat: false,
      isComposing: false
    });

    // Some older game code reads event.which/event.keyCode.
    for (const prop of ['keyCode', 'which', 'charCode']) {
      try { Object.defineProperty(event, prop, { get: () => info.keyCode }); } catch (_) {}
    }

    // Dispatch on the document/window and body. The game can therefore use
    // window.addEventListener, document.addEventListener, or body listeners.
    for (const target of [window, document, document.body, document.documentElement]) {
      if (!target) continue;
      try { target.dispatchEvent(event); } catch (_) {}
    }
  }

  function gameSurface() {
    return document.querySelector('canvas') || document.body || document.documentElement;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let mouseButtons = 0;

  function clampMouse() {
    mouseX = Math.max(0, Math.min(window.innerWidth - 1, mouseX));
    mouseY = Math.max(0, Math.min(window.innerHeight - 1, mouseY));
  }

  function makeMouseEvent(type, button = 0) {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      detail: type === 'click' ? 1 : 0,
      screenX: mouseX,
      screenY: mouseY,
      clientX: mouseX,
      clientY: mouseY,
      button,
      buttons: mouseButtons
    });
  }

  function dispatchMouse(type, button = 0) {
    clampMouse();
    const target = document.elementFromPoint(mouseX, mouseY) || gameSurface();
    if (!target) return;
    try { target.dispatchEvent(makeMouseEvent(type, button)); } catch (_) {}
  }

  function moveVirtualMouse(dx, dy) {
    mouseX += dx * 1.8;
    mouseY += dy * 1.8;
    clampMouse();

    // Send mousemove to the element currently under the virtual cursor.
    dispatchMouse('mousemove', 0);
  }

  function pressMouse(button) {
    const bit = button === 2 ? 2 : 1;
    mouseButtons |= bit;
    dispatchMouse('mousedown', button);
  }

  function releaseMouse(button) {
    const bit = button === 2 ? 2 : 1;
    mouseButtons &= ~bit;
    dispatchMouse('mouseup', button);
    if (button === 0) dispatchMouse('click', button);
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${UI_ID}{position:fixed;left:7px;right:7px;bottom:7px;z-index:2147483647;display:flex;justify-content:space-between;align-items:flex-end;gap:7px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;user-select:none;-webkit-user-select:none}
      #${UI_ID} *{box-sizing:border-box;touch-action:none}
      #${UI_ID} .cmc-panel{pointer-events:auto;display:flex;gap:7px;align-items:center}
      #${UI_ID} .cmc-dpad{width:132px;height:132px;position:relative;flex:none}
      #${UI_ID} button,#${UI_ID} .cmc-mouse{border:1px solid rgba(255,255,255,.30);background:rgba(20,20,25,.76);color:#fff;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);box-shadow:0 3px 14px rgba(0,0,0,.34);font-weight:700}
      #${UI_ID} button{border-radius:13px;min-width:45px;height:43px;font-size:14px}
      #${UI_ID} .cmc-key{position:absolute;width:44px;height:44px;padding:0}
      #${UI_ID} .cmc-w{left:44px;top:0}.cmc-a{left:0;top:44px}.cmc-s{left:44px;top:44px}.cmc-d{left:88px;top:44px}
      #${UI_ID} .cmc-actions{display:flex;flex-direction:column;gap:5px;flex:none}
      #${UI_ID} .cmc-actions button{width:58px;min-width:58px;height:39px;font-size:11px}
      #${UI_ID} .cmc-mouse{width:145px;height:132px;border-radius:17px;position:relative;overflow:hidden;pointer-events:auto}
      #${UI_ID} .cmc-mouse-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.40);font-size:11px;pointer-events:none}
      #${UI_ID} .cmc-buttons{position:absolute;left:0;right:0;bottom:0;display:flex;gap:5px;padding:6px}
      #${UI_ID} .cmc-buttons button{flex:1;height:36px;min-width:0;font-size:11px}
      #${UI_ID} .cmc-toggle{width:42px;min-width:42px;height:36px;pointer-events:auto}
      #${UI_ID}.collapsed .cmc-main{display:none}
      #${UI_ID}.collapsed{left:auto;right:7px}
      @media (orientation:landscape){#${UI_ID}{left:10px;right:10px;bottom:7px}#${UI_ID} .cmc-dpad{width:142px;height:142px}#${UI_ID} .cmc-mouse{width:180px;height:142px}}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function installUI() {
    if (document.getElementById(UI_ID)) return;
    addStyles();

    const root = document.createElement('div');
    root.id = UI_ID;
    root.innerHTML = `
      <div class="cmc-panel cmc-main">
        <div class="cmc-dpad">
          <button class="cmc-key cmc-w" data-key="w">W</button>
          <button class="cmc-key cmc-a" data-key="a">A</button>
          <button class="cmc-key cmc-s" data-key="s">S</button>
          <button class="cmc-key cmc-d" data-key="d">D</button>
        </div>
        <div class="cmc-actions">
          <button data-key="q">Q</button>
          <button data-key="e">E</button>
          <button data-key="Enter">ENTER</button>
          <button data-key="Escape">ESC</button>
        </div>
        <div class="cmc-mouse" id="cmc-mouse-pad">
          <div class="cmc-mouse-label">TOUCH MOUSE</div>
          <div class="cmc-buttons">
            <button data-mouse="left">LMB</button>
            <button data-mouse="right">RMB</button>
          </div>
        </div>
      </div>
      <button class="cmc-toggle" id="cmc-toggle" aria-label="Collapse controller">⌄</button>
    `;

    document.body.appendChild(root);

    root.querySelectorAll('[data-key]').forEach(button => {
      const key = button.dataset.key;
      let active = false;
      let pointerId = null;

      const down = event => {
        event.preventDefault();
        if (active) return;
        active = true;
        pointerId = event.pointerId;
        try { button.setPointerCapture(event.pointerId); } catch (_) {}
        fireKeyboard('keydown', key);
      };

      const up = event => {
        event.preventDefault();
        if (!active) return;
        if (pointerId !== null && event.pointerId !== pointerId && event.type !== 'lostpointercapture') return;
        active = false;
        pointerId = null;
        fireKeyboard('keyup', key);
      };

      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('lostpointercapture', up);
    });

    const mousePad = root.querySelector('#cmc-mouse-pad');
    let padPointer = null;
    let lastX = 0;
    let lastY = 0;

    mousePad.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      event.preventDefault();
      padPointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      try { mousePad.setPointerCapture(event.pointerId); } catch (_) {}
    });

    mousePad.addEventListener('pointermove', event => {
      if (event.pointerId !== padPointer) return;
      event.preventDefault();
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      if (dx || dy) moveVirtualMouse(dx, dy);
    });

    const endPad = event => {
      if (event.pointerId === padPointer) padPointer = null;
    };
    mousePad.addEventListener('pointerup', endPad);
    mousePad.addEventListener('pointercancel', endPad);
    mousePad.addEventListener('lostpointercapture', endPad);

    root.querySelectorAll('[data-mouse]').forEach(button => {
      const which = button.dataset.mouse === 'right' ? 2 : 0;
      let active = false;

      const down = event => {
        event.preventDefault();
        if (active) return;
        active = true;
        try { button.setPointerCapture(event.pointerId); } catch (_) {}
        pressMouse(which);
      };

      const up = event => {
        event.preventDefault();
        if (!active) return;
        active = false;
        releaseMouse(which);
      };

      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('lostpointercapture', up);
    });

    root.querySelector('#cmc-toggle').addEventListener('click', () => {
      root.classList.toggle('collapsed');
      root.querySelector('#cmc-toggle').textContent = root.classList.contains('collapsed') ? '⌃' : '⌄';
    });

    // Keep the virtual pointer inside the current viewport after rotation.
    window.addEventListener('resize', clampMouse);
  }

  // document-start may run before <body> exists, so wait for DOMContentLoaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installUI, { once: true });
  } else {
    installUI();
  }
})();
