// ==UserScript==
// @name         Caverns of the Mad Mage - Mobile Controller
// @namespace    https://github.com/RustySupernova/Virtual-mouse
// @version      2.0.0
// @description  Large touch controls for Caverns of the Mad Mage on iPhone/iPad Safari
// @match        https://bluesquirrel.itch.io/caverns-of-the-mad-mage*
// @match        https://html-classic.itch.zone/html/17576366/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  // Safari can inject a userscript into both the itch.io wrapper and the
  // actual HTML5 game iframe. We only need the controller in the game frame.
  // If this script runs in the wrapper, wait for the game iframe to appear;
  // the second @match makes sure the controller is also installed directly
  // inside the game document.
  if (window.top !== window.self) {
    startController();
    return;
  }

  const isGamePage = location.hostname === 'html-classic.itch.zone';
  if (isGamePage) {
    startController();
    return;
  }

  // On the itch.io page we cannot cross the iframe's origin, so do not try to
  // dispatch keyboard events into it. The actual game-frame injection handles
  // input directly inside the game document.
  function addStatusHint() {
    if (document.getElementById('cmm-wrapper-hint')) return;
    const hint = document.createElement('div');
    hint.id = 'cmm-wrapper-hint';
    hint.textContent = 'Mobile controller enabled';
    Object.assign(hint.style, {
      position: 'fixed', left: '10px', bottom: '10px', zIndex: '2147483647',
      padding: '6px 9px', borderRadius: '8px', background: 'rgba(0,0,0,.7)',
      color: '#fff', font: '11px -apple-system,BlinkMacSystemFont,sans-serif',
      pointerEvents: 'none', opacity: '.65'
    });
    document.documentElement.appendChild(hint);
    setTimeout(() => hint.remove(), 2500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addStatusHint, {once: true});
  } else addStatusHint();

  function startController() {
    if (document.getElementById('cmm-controller')) return;

    const STYLE = `
      #cmm-controller {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      #cmm-controller * { box-sizing: border-box; }
      #cmm-pad {
        position: absolute;
        left: max(18px, env(safe-area-inset-left));
        bottom: max(18px, env(safe-area-inset-bottom));
        width: clamp(190px, 30vw, 270px);
        height: clamp(190px, 30vw, 270px);
        pointer-events: none;
      }
      .cmm-key {
        position: absolute;
        width: 31%; height: 31%;
        border-radius: 20%;
        border: 2px solid rgba(255,255,255,.48);
        background: rgba(20,20,20,.70);
        color: white;
        display: flex; align-items: center; justify-content: center;
        font-size: clamp(25px, 5vw, 44px);
        font-weight: 700;
        line-height: 1;
        padding: 0;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        box-shadow: 0 3px 12px rgba(0,0,0,.45);
        transition: transform .06s, background .06s;
      }
      .cmm-key.pressed {
        transform: scale(.88);
        background: rgba(255,255,255,.40);
      }
      #cmm-up { left: 34.5%; top: 0; }
      #cmm-left { left: 0; top: 34.5%; }
      #cmm-down { left: 34.5%; bottom: 0; }
      #cmm-right { right: 0; top: 34.5%; }
      #cmm-q { left: 0; top: 0; }
      #cmm-e { right: 0; top: 0; }
      #cmm-z { left: 0; bottom: 0; }
      #cmm-c { right: 0; bottom: 0; }
      #cmm-diag-toggle {
        position: absolute;
        left: 34.5%; top: 34.5%;
        width: 31%; height: 31%;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(0,0,0,.28);
        color: rgba(255,255,255,.45);
        font-size: 10px;
        pointer-events: auto;
        touch-action: manipulation;
      }
      #cmm-actions {
        position: absolute;
        right: max(18px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
        pointer-events: none;
      }
      .cmm-action {
        pointer-events: auto;
        touch-action: manipulation;
        width: clamp(88px, 16vw, 135px);
        height: clamp(58px, 10vw, 78px);
        border-radius: 18px;
        border: 2px solid rgba(255,255,255,.45);
        background: rgba(20,20,20,.72);
        color: #fff;
        font-size: clamp(14px, 2.5vw, 20px);
        font-weight: 800;
        box-shadow: 0 3px 12px rgba(0,0,0,.45);
        -webkit-tap-highlight-color: transparent;
      }
      .cmm-action.pressed { transform: scale(.90); background: rgba(255,255,255,.4); }
      #cmm-status {
        position: absolute;
        top: max(8px, env(safe-area-inset-top));
        left: 50%; transform: translateX(-50%);
        padding: 5px 9px;
        border-radius: 8px;
        background: rgba(0,0,0,.55);
        color: rgba(255,255,255,.72);
        font-size: 10px;
        pointer-events: none;
        opacity: 0;
        transition: opacity .2s;
      }
      #cmm-status.show { opacity: 1; }
      @media (orientation: portrait) {
        #cmm-pad { width: 190px; height: 190px; }
      }
      @media (max-width: 500px) {
        #cmm-pad { width: 178px; height: 178px; }
        #cmm-actions { gap: 9px; }
        .cmm-action { width: 92px; height: 58px; border-radius: 16px; }
      }
      @media (orientation: landscape) and (max-height: 500px) {
        #cmm-pad { width: 160px; height: 160px; }
        .cmm-action { width: 100px; height: 50px; }
      }
    `;

    const style = document.createElement('style');
    style.id = 'cmm-style';
    style.textContent = STYLE;
    document.documentElement.appendChild(style);

    const root = document.createElement('div');
    root.id = 'cmm-controller';
    root.innerHTML = `
      <div id="cmm-status">Mobile controls active</div>
      <div id="cmm-pad">
        <button class="cmm-key" id="cmm-q" data-key="q" aria-label="Q">↖</button>
        <button class="cmm-key" id="cmm-up" data-key="w" aria-label="Up">▲</button>
        <button class="cmm-key" id="cmm-e" data-key="e" aria-label="E">↗</button>
        <button class="cmm-key" id="cmm-left" data-key="a" aria-label="Left">◀</button>
        <button id="cmm-diag-toggle" aria-label="Center">•</button>
        <button class="cmm-key" id="cmm-right" data-key="d" aria-label="Right">▶</button>
        <button class="cmm-key" id="cmm-z" data-key="z" aria-label="Z">↙</button>
        <button class="cmm-key" id="cmm-down" data-key="s" aria-label="Down">▼</button>
        <button class="cmm-key" id="cmm-c" data-key="c" aria-label="C">↘</button>
      </div>
      <div id="cmm-actions">
        <button class="cmm-action" id="cmm-enter">ENTER</button>
        <button class="cmm-action" id="cmm-esc">ESC</button>
      </div>
    `;
    document.documentElement.appendChild(root);

    const status = root.querySelector('#cmm-status');
    let statusTimer;
    function showStatus(text) {
      status.textContent = text;
      status.classList.add('show');
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => status.classList.remove('show'), 1200);
    }

    function dispatchKey(type, key) {
      const code = /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key;
      const event = new KeyboardEvent(type, {
        key,
        code,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window
      });
      // Send it to the document and window. This game listens for keyboard
      // events globally; doing both makes the controller tolerant of focus.
      window.dispatchEvent(event);
      document.dispatchEvent(event);
    }

    // IMPORTANT: a mobile tap is one game turn, not a held keyboard key.
    // We deliberately generate exactly one keydown followed by one keyup.
    function tapKey(key, button) {
      if (button.dataset.busy === '1') return;
      button.dataset.busy = '1';
      button.classList.add('pressed');
      dispatchKey('keydown', key);
      // A short delay gives the game's keydown handler time to process the turn
      // before releasing the virtual key.
      setTimeout(() => {
        dispatchKey('keyup', key);
        button.classList.remove('pressed');
        button.dataset.busy = '0';
      }, 55);
    }

    function bindTap(button, key) {
      let touchId = null;
      button.addEventListener('pointerdown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (touchId !== null) return;
        touchId = e.pointerId;
        try { button.setPointerCapture(e.pointerId); } catch (_) {}
        tapKey(key, button);
      }, {passive:false});
      const release = e => {
        e.preventDefault();
        e.stopPropagation();
        if (touchId === e.pointerId || e.type === 'pointercancel') touchId = null;
      };
      button.addEventListener('pointerup', release, {passive:false});
      button.addEventListener('pointercancel', release, {passive:false});
    }

    root.querySelectorAll('.cmm-key').forEach(button => bindTap(button, button.dataset.key));
    bindTap(root.querySelector('#cmm-enter'), 'Enter');
    bindTap(root.querySelector('#cmm-esc'), 'Escape');

    // Optional diagonal mode: hide the four diagonal keys for a cleaner
    // four-direction layout. Tap the center circle to toggle.
    let diagonals = true;
    const diagonalButtons = ['cmm-q','cmm-e','cmm-z','cmm-c'].map(id => root.querySelector('#'+id));
    root.querySelector('#cmm-diag-toggle').addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      diagonals = !diagonals;
      diagonalButtons.forEach(b => b.style.display = diagonals ? 'flex' : 'none');
      showStatus(diagonals ? '8-direction mode' : '4-direction mode');
    }, {passive:false});

    // Prevent Safari's page gestures/scrolling from stealing touches from the
    // controls. We do not block touches elsewhere in the game.
    root.addEventListener('touchstart', e => e.preventDefault(), {passive:false});
    root.addEventListener('touchmove', e => e.preventDefault(), {passive:false});
    root.addEventListener('contextmenu', e => e.preventDefault(), {passive:false});

    showStatus('Mobile controls active');
  }
})();
