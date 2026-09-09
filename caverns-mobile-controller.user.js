// ==UserScript==
// @name         Caverns of the Mad Mage - Mobile Controller
// @namespace    https://github.com/RustySupernova/Virtual-mouse
// @version      2.1.0
// @description  Large touch controls and mobile layout fix for Caverns of the Mad Mage on iPhone/iPad Safari
// @match        https://bluesquirrel.itch.io/caverns-of-the-mad-mage*
// @match        https://html-classic.itch.zone/html/17576366/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.top !== window.self) {
    startController();
    return;
  }

  if (location.hostname === 'html-classic.itch.zone') {
    startController();
    return;
  }

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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addStatusHint, {once:true});
  else addStatusHint();

  function startController() {
    if (document.getElementById('cmm-controller')) return;

    /*
     * The game was made as a desktop-first HTML page. On a narrow Safari
     * viewport some of its absolutely positioned UI can remain laid out at
     * desktop coordinates: the map can appear on the right while messages
     * remain at the old left/bottom coordinates. This pass makes the game's
     * existing layout fit the real viewport without changing its internals.
     *
     * We intentionally use a conservative adaptive zoom rather than guessing
     * a fixed 1280x720 game resolution. It measures the current layout, scales
     * only when the page is wider/taller than the viewport, and re-runs after
     * resize/orientation changes.
     */
    installMobileLayoutFix();

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
        left: max(16px, env(safe-area-inset-left));
        bottom: max(16px, env(safe-area-inset-bottom));
        width: clamp(220px, 34vw, 310px);
        height: clamp(220px, 34vw, 310px);
        pointer-events: none;
      }
      .cmm-key {
        position: absolute;
        width: 31%; height: 31%;
        border-radius: 20%;
        border: 2px solid rgba(255,255,255,.50);
        background: rgba(18,18,18,.72);
        color: white;
        display: flex; align-items: center; justify-content: center;
        font-size: clamp(29px, 6vw, 50px);
        font-weight: 800;
        line-height: 1;
        padding: 0;
        pointer-events: auto;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
        box-shadow: 0 4px 14px rgba(0,0,0,.48);
        transition: transform .06s, background .06s;
      }
      .cmm-key.pressed { transform: scale(.87); background: rgba(255,255,255,.42); }
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
        font-size: 11px;
        pointer-events: auto;
        touch-action: manipulation;
      }
      #cmm-actions {
        position: absolute;
        right: max(16px, env(safe-area-inset-right));
        bottom: max(16px, env(safe-area-inset-bottom));
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
        pointer-events: none;
      }
      .cmm-action {
        pointer-events: auto;
        touch-action: manipulation;
        width: clamp(105px, 18vw, 145px);
        height: clamp(68px, 11vw, 88px);
        border-radius: 20px;
        border: 2px solid rgba(255,255,255,.48);
        background: rgba(18,18,18,.74);
        color: #fff;
        font-size: clamp(15px, 2.8vw, 21px);
        font-weight: 800;
        box-shadow: 0 4px 14px rgba(0,0,0,.48);
        -webkit-tap-highlight-color: transparent;
      }
      .cmm-action.pressed { transform: scale(.90); background: rgba(255,255,255,.42); }
      #cmm-status {
        position: absolute;
        top: max(8px, env(safe-area-inset-top));
        left: 50%; transform: translateX(-50%);
        padding: 5px 9px; border-radius: 8px;
        background: rgba(0,0,0,.55); color: rgba(255,255,255,.72);
        font-size: 10px; pointer-events: none; opacity: 0; transition: opacity .2s;
      }
      #cmm-status.show { opacity: 1; }
      @media (max-width: 500px) {
        #cmm-pad { width: 220px; height: 220px; }
        #cmm-actions { gap: 9px; }
        .cmm-action { width: 105px; height: 66px; border-radius: 18px; }
      }
      @media (orientation: landscape) and (max-height: 500px) {
        #cmm-pad { width: 205px; height: 205px; }
        .cmm-action { width: 112px; height: 58px; }
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
        <button id="cmm-diag-toggle" aria-label="Toggle diagonal controls">•</button>
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
        key, code, bubbles:true, cancelable:true, composed:true, view:window
      });
      window.dispatchEvent(event);
      document.dispatchEvent(event);
    }

    function tapKey(key, button) {
      if (button.dataset.busy === '1') return;
      button.dataset.busy = '1';
      button.classList.add('pressed');
      dispatchKey('keydown', key);
      setTimeout(() => {
        dispatchKey('keyup', key);
        button.classList.remove('pressed');
        button.dataset.busy = '0';
      }, 55);
    }

    function bindTap(button, key) {
      let pointerId = null;
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        if (pointerId !== null) return;
        pointerId = e.pointerId;
        try { button.setPointerCapture(e.pointerId); } catch (_) {}
        tapKey(key, button);
      }, {passive:false});
      const release = e => {
        e.preventDefault(); e.stopPropagation();
        if (pointerId === e.pointerId || e.type === 'pointercancel') pointerId = null;
      };
      button.addEventListener('pointerup', release, {passive:false});
      button.addEventListener('pointercancel', release, {passive:false});
    }

    root.querySelectorAll('.cmm-key').forEach(button => bindTap(button, button.dataset.key));
    bindTap(root.querySelector('#cmm-enter'), 'Enter');
    bindTap(root.querySelector('#cmm-esc'), 'Escape');

    let diagonals = true;
    const diagonalButtons = ['cmm-q','cmm-e','cmm-z','cmm-c'].map(id => root.querySelector('#'+id));
    root.querySelector('#cmm-diag-toggle').addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      diagonals = !diagonals;
      diagonalButtons.forEach(b => b.style.display = diagonals ? 'flex' : 'none');
      showStatus(diagonals ? '8-direction mode' : '4-direction mode');
    }, {passive:false});

    root.addEventListener('touchstart', e => e.preventDefault(), {passive:false});
    root.addEventListener('touchmove', e => e.preventDefault(), {passive:false});
    root.addEventListener('contextmenu', e => e.preventDefault(), {passive:false});

    showStatus('Mobile controls active');
  }

  function installMobileLayoutFix() {
    const html = document.documentElement;
    const body = document.body;
    if (!body) {
      setTimeout(installMobileLayoutFix, 100);
      return;
    }

    const style = document.createElement('style');
    style.id = 'cmm-layout-fix';
    style.textContent = `
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 0 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        overscroll-behavior: none !important;
        -webkit-text-size-adjust: 100% !important;
      }
      body.cmm-fitting {
        transform-origin: 0 0 !important;
      }
    `;
    document.documentElement.appendChild(style);

    // Force a mobile-friendly viewport if the game did not declare one.
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

    let timer = null;
    let fitting = false;

    function measureAndFit() {
      if (fitting) return;
      fitting = true;
      body.classList.add('cmm-fitting');

      // Reset first so we always measure the original desktop layout.
      body.style.transform = 'none';
      body.style.width = '100%';
      body.style.height = '100%';

      // Give the game's own layout a moment after orientation/resize.
      requestAnimationFrame(() => {
        const vw = Math.max(1, window.innerWidth);
        const vh = Math.max(1, window.innerHeight);

        // Find the actual occupied area. scrollWidth/scrollHeight catches
        // absolutely positioned UI that extends beyond the mobile viewport.
        let contentW = Math.max(document.documentElement.scrollWidth, body.scrollWidth, vw);
        let contentH = Math.max(document.documentElement.scrollHeight, body.scrollHeight, vh);

        // Ignore tiny browser rounding differences.
        let scale = Math.min(1, vw / contentW, vh / contentH);

        // On phones, avoid making the playable area excessively tiny merely
        // because a single off-screen label is a few pixels outside the box.
        if (scale < 0.55) {
          contentW = Math.min(contentW, vw / 0.55);
          contentH = Math.min(contentH, vh / 0.55);
          scale = Math.min(1, vw / contentW, vh / contentH);
        }

        if (scale < 0.985) {
          body.style.width = `${100 / scale}%`;
          body.style.height = `${100 / scale}%`;
          body.style.transform = `scale(${scale})`;
          body.dataset.cmmScale = String(scale);
        } else {
          body.style.width = '100%';
          body.style.height = '100%';
          body.style.transform = 'none';
          body.dataset.cmmScale = '1';
        }

        fitting = false;
      });
    }

    const scheduleFit = () => {
      clearTimeout(timer);
      timer = setTimeout(measureAndFit, 120);
    };

    // The game may construct its UI after document-idle, so measure several
    // times during startup and whenever Safari rotates/resizes the viewport.
    [0, 300, 900, 1800].forEach(delay => setTimeout(measureAndFit, delay));
    window.addEventListener('resize', scheduleFit, {passive:true});
    window.addEventListener('orientationchange', () => setTimeout(measureAndFit, 300), {passive:true});
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleFit, {passive:true});

    // Detect game screens/dialogues being added later.
    const observer = new MutationObserver(() => scheduleFit());
    observer.observe(body, {childList:true, subtree:true, attributes:true});

    // Do one immediate pass as well.
    measureAndFit();
  }
})();
