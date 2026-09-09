// ==UserScript==
// @name         Caverns of the Mad Mage - Mobile Controller
// @namespace    https://github.com/RustySupernova/Virtual-mouse
// @version      1.1.0
// @description  Adds an iPhone-friendly virtual keyboard and mouse to Caverns of the Mad Mage on itch.io.
// @match        https://bluesquirrel.itch.io/caverns-of-the-mad-mage*
// @match        https://html-classic.itch.zone/html/17576366/*
// @run-at       document-idle
// @inject-into  content
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const OUTER_ORIGIN = 'https://bluesquirrel.itch.io';
  const GAME_ORIGIN = 'https://html-classic.itch.zone';
  const GAME_PATH = '/html/17576366/';
  const UI_ID = 'cmc-userscript-controller';
  const STYLE_ID = 'cmc-userscript-style';
  const MESSAGE_SOURCE = 'cmc-mobile-controller';

  const isGameFrame = location.origin === GAME_ORIGIN && location.pathname.startsWith(GAME_PATH);
  const isOuterPage = location.origin === OUTER_ORIGIN && location.pathname.startsWith('/caverns-of-the-mad-mage');

  if (!isGameFrame && !isOuterPage) return;
  if (isGameFrame) installGameBridge();
  else installControllerUI();

  const virtualMouse = { x: 0, y: 0 };

  function installGameBridge() {
    window.addEventListener('message', (event) => {
      // Normal itch embedding gives the game the bluesquirrel.itch.io parent
      // origin. Some sandbox configurations can expose a null origin, so we
      // accept null only when the message source is our own controller and the
      // message came through this frame's parent window.
      if (event.source !== window.parent) return;
      if (event.origin !== OUTER_ORIGIN && event.origin !== 'null') return;
      const data = event.data;
      if (!data || data.source !== MESSAGE_SOURCE || !data.type) return;

      if (data.type === 'key') dispatchKey(data.key, Boolean(data.down));
      else if (data.type === 'mouseMove') dispatchMouseMove(Number(data.dx) || 0, Number(data.dy) || 0);
      else if (data.type === 'mouseButton') dispatchMouseButton(data.button === 'right' ? 2 : 0, Boolean(data.down));
    });

    try {
      window.parent.postMessage({ source: MESSAGE_SOURCE, type: 'ready' }, OUTER_ORIGIN);
    } catch (_) {}
  }

  function gameTargets() {
    const targets = [window, document, document.body, document.documentElement];
    return targets.filter(Boolean);
  }

  function dispatchKey(key, down) {
    const codeMap = {
      w: ['KeyW', 87], a: ['KeyA', 65], s: ['KeyS', 83], d: ['KeyD', 68],
      q: ['KeyQ', 81], e: ['KeyE', 69], z: ['KeyZ', 90], c: ['KeyC', 67],
      ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40],
      ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39],
      Enter: ['Enter', 13], Escape: ['Escape', 27], Space: ['Space', 32]
    };
    const [code, keyCode] = codeMap[key] || [key, 0];

    const event = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key,
      code,
      bubbles: true,
      cancelable: true,
      composed: true,
      repeat: false
    });

    // Older HTML5 games frequently use event.which/keyCode rather than the
    // modern event.key API. KeyboardEvent's constructor leaves these as 0,
    // so define the legacy values explicitly when Safari permits it.
    for (const name of ['keyCode', 'which', 'charCode']) {
      try {
        Object.defineProperty(event, name, { get: () => keyCode });
      } catch (_) {}
    }

    for (const target of gameTargets()) {
      try { target.dispatchEvent(event); } catch (_) {}
    }
  }

  function getCanvas() {
    return document.querySelector('canvas') || document.querySelector('canvas#game') || document.body;
  }

  function dispatchMouseMove(dx, dy) {
    const canvas = getCanvas();
    const rect = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

    if (!virtualMouse.x || !virtualMouse.y) {
      virtualMouse.x = (rect.left + rect.right) / 2;
      virtualMouse.y = (rect.top + rect.bottom) / 2;
    }

    virtualMouse.x = Math.max(rect.left, Math.min(rect.right || window.innerWidth, virtualMouse.x + dx));
    virtualMouse.y = Math.max(rect.top, Math.min(rect.bottom || window.innerHeight, virtualMouse.y + dy));

    const target = document.elementFromPoint(virtualMouse.x, virtualMouse.y) || canvas || document.body;
    target.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: virtualMouse.x,
      clientY: virtualMouse.y,
      screenX: virtualMouse.x,
      screenY: virtualMouse.y,
      button: 0,
      buttons: 0,
      view: window
    }));
  }

  function dispatchMouseButton(button, down) {
    const target = document.elementFromPoint(virtualMouse.x, virtualMouse.y) || getCanvas();
    const buttons = down ? (button === 2 ? 2 : 1) : 0;
    target.dispatchEvent(new MouseEvent(down ? 'mousedown' : 'mouseup', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button,
      buttons,
      clientX: virtualMouse.x,
      clientY: virtualMouse.y,
      screenX: virtualMouse.x,
      screenY: virtualMouse.y,
      view: window
    }));

    if (!down) {
      target.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
        button,
        buttons: 0,
        clientX: virtualMouse.x,
        clientY: virtualMouse.y,
        screenX: virtualMouse.x,
        screenY: virtualMouse.y,
        view: window
      }));
    }
  }

  function installControllerUI() {
    if (document.getElementById(UI_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${UI_ID}{position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;user-select:none;-webkit-user-select:none}
      #${UI_ID} *{box-sizing:border-box;touch-action:none}
      #${UI_ID} .cmc-panel{pointer-events:auto;display:flex;gap:8px;align-items:center}
      #${UI_ID} .cmc-dpad{width:156px;height:156px;position:relative}
      #${UI_ID} button,#${UI_ID} .cmc-mouse{border:1px solid rgba(255,255,255,.28);background:rgba(20,20,25,.68);color:#fff;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 3px 14px rgba(0,0,0,.3);font-weight:700}
      #${UI_ID} button{border-radius:14px;min-width:54px;height:50px;font-size:15px}
      #${UI_ID} .cmc-key{position:absolute;width:52px;height:52px;padding:0}
      #${UI_ID} .cmc-w{left:52px;top:0}.cmc-a{left:0;top:52px}.cmc-s{left:52px;top:52px}.cmc-d{left:104px;top:52px}
      #${UI_ID} .cmc-mouse{width:170px;height:156px;border-radius:18px;position:relative;overflow:hidden}
      #${UI_ID} .cmc-mouse-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.42);font-size:12px;pointer-events:none}
      #${UI_ID} .cmc-buttons{position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;padding:7px}
      #${UI_ID} .cmc-buttons button{flex:1;height:38px;min-width:0;font-size:12px}
      #${UI_ID} .cmc-actions{display:flex;flex-direction:column;gap:7px}
      #${UI_ID} .cmc-toggle{width:48px;min-width:48px;height:40px;pointer-events:auto}
      #${UI_ID}.collapsed .cmc-main{display:none}
      #${UI_ID}.collapsed{left:auto;right:10px}
      @media (orientation:landscape){#${UI_ID}{left:12px;right:12px;bottom:8px}#${UI_ID} .cmc-dpad{width:142px;height:142px}#${UI_ID} .cmc-mouse{width:190px;height:142px}}
      @media (max-width:520px){#${UI_ID}{gap:6px;left:6px;right:6px;bottom:6px}#${UI_ID} .cmc-dpad{width:132px;height:132px}#${UI_ID} .cmc-key{width:44px;height:44px}#${UI_ID} .cmc-w{left:44px}.cmc-a{left:0;top:44px}.cmc-s{left:44px;top:44px}.cmc-d{left:88px;top:44px}#${UI_ID} .cmc-mouse{width:145px;height:132px}#${UI_ID} button{min-width:46px;height:44px}}
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = UI_ID;
    root.innerHTML = `<div class="cmc-panel cmc-main"><div class="cmc-dpad"><button class="cmc-key cmc-w" data-key="w">W</button><button class="cmc-key cmc-a" data-key="a">A</button><button class="cmc-key cmc-s" data-key="s">S</button><button class="cmc-key cmc-d" data-key="d">D</button></div><div class="cmc-actions"><button data-key="q">Q</button><button data-key="e">E</button><button data-key="enter">ENTER</button><button data-key="escape">ESC</button></div><div class="cmc-mouse" id="cmc-mouse-pad"><div class="cmc-mouse-label">TOUCH MOUSE</div><div class="cmc-buttons"><button data-mouse="left">LMB</button><button data-mouse="right">RMB</button></div></div></div><button class="cmc-toggle" id="cmc-toggle" aria-label="Collapse controller">⌄</button>`;
    document.body.appendChild(root);

    root.querySelectorAll('[data-key]').forEach((button) => {
      const rawKey = button.dataset.key;
      const key = rawKey === 'enter' ? 'Enter' : rawKey === 'escape' ? 'Escape' : rawKey;
      let active = false;
      const press = (event) => { event.preventDefault(); if (active) return; active = true; sendToGame({source:MESSAGE_SOURCE,type:'key',key,down:true}); };
      const release = (event) => { event.preventDefault(); if (!active) return; active = false; sendToGame({source:MESSAGE_SOURCE,type:'key',key,down:false}); };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', (event) => { if (event.buttons) release(event); });
    });

    const mousePad = root.querySelector('#cmc-mouse-pad');
    let lastX = 0, lastY = 0, mousePointerId = null;
    mousePad.addEventListener('pointerdown', (event) => { if (event.target.closest('button')) return; event.preventDefault(); mousePointerId = event.pointerId; lastX = event.clientX; lastY = event.clientY; mousePad.setPointerCapture(event.pointerId); });
    mousePad.addEventListener('pointermove', (event) => { if (event.pointerId !== mousePointerId) return; event.preventDefault(); const dx=(event.clientX-lastX)*1.7, dy=(event.clientY-lastY)*1.7; lastX=event.clientX; lastY=event.clientY; sendToGame({source:MESSAGE_SOURCE,type:'mouseMove',dx,dy}); });
    const endMouse = (event) => { if (event.pointerId === mousePointerId) mousePointerId=null; };
    mousePad.addEventListener('pointerup', endMouse); mousePad.addEventListener('pointercancel', endMouse);

    root.querySelectorAll('[data-mouse]').forEach((button) => {
      const which=button.dataset.mouse; let active=false;
      const down=(event)=>{event.preventDefault();if(active)return;active=true;sendToGame({source:MESSAGE_SOURCE,type:'mouseButton',button:which,down:true});};
      const up=(event)=>{event.preventDefault();if(!active)return;active=false;sendToGame({source:MESSAGE_SOURCE,type:'mouseButton',button:which,down:false});};
      button.addEventListener('pointerdown',down); button.addEventListener('pointerup',up); button.addEventListener('pointercancel',up);
    });

    root.querySelector('#cmc-toggle').addEventListener('click', () => { root.classList.toggle('collapsed'); root.querySelector('#cmc-toggle').textContent=root.classList.contains('collapsed')?'⌃':'⌄'; });

    // Safari/Userscripts injects the same userscript into matching nested
    // frames. We only use postMessage here, so no cross-origin DOM access is
    // needed.
    const findFrame = () => [...document.querySelectorAll('iframe')].find((f) => { try{return f.src.includes('html-classic.itch.zone/html/17576366/');}catch(_){return false;} });
    const sendReady = () => { const frame=findFrame(); if(frame&&frame.contentWindow) frame.contentWindow.postMessage({source:MESSAGE_SOURCE,type:'ping'},GAME_ORIGIN); };
    setInterval(sendReady,1500); sendReady();
  }

  function sendToGame(message) {
    const frame=[...document.querySelectorAll('iframe')].find((f)=>{try{return f.src.includes('html-classic.itch.zone/html/17576366/');}catch(_){return false;}});
    if(frame&&frame.contentWindow) frame.contentWindow.postMessage(message,GAME_ORIGIN);
  }
})();
