(() => {
  if (window.top !== window.self) {
    // The game runtime is loaded in a cross-origin iframe. This script runs in that
    // frame too, so synthetic input is dispatched directly to the game's document.
  }
  if (document.documentElement.dataset.cavernsMobileController === '1') return;
  document.documentElement.dataset.cavernsMobileController = '1';

  const root = document.createElement('div');
  root.id = 'cmc-controller';
  root.innerHTML = `
    <div id="cmc-dpad">
      <button data-key="w" class="up">▲</button>
      <button data-key="a" class="left">◀</button>
      <button data-key="s" class="down">▼</button>
      <button data-key="d" class="right">▶</button>
    </div>
    <div id="cmc-mousepad"><span>DRAG</span><i></i></div>
    <div id="cmc-mousebuttons"><button id="cmc-lmb">LMB</button><button id="cmc-rmb">RMB</button></div>
    <button id="cmc-enter" class="cmc-action">ENTER</button>
    <button id="cmc-escape" class="cmc-escape">ESC</button>
    <button id="cmc-toggle" aria-label="Toggle controller">⌄</button>
  `;
  document.documentElement.appendChild(root);

  let sensitivity = 1.5;
  let virtualX = Math.max(1, Math.floor(innerWidth / 2));
  let virtualY = Math.max(1, Math.floor(innerHeight / 2));
  let padActive = false;
  let lastX = 0, lastY = 0;
  let hidden = false;

  function dispatchKey(type, key) {
    const code = /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key === ' ' ? 'Space' : key;
    const target = document.activeElement || document.body || document.documentElement;
    target.dispatchEvent(new KeyboardEvent(type, {key, code, bubbles:true, cancelable:true, composed:true}));
  }

  function dispatchMouse(type, x, y, button = 0) {
    const target = document.elementFromPoint(x, y) || document.body || document.documentElement;
    target.dispatchEvent(new MouseEvent(type, {
      bubbles:true, cancelable:true, composed:true,
      clientX:x, clientY:y, button,
      buttons:type === 'mouseup' ? 0 : 1
    }));
  }

  function bindKey(button) {
    const key = button.dataset.key;
    const down = e => { e.preventDefault(); button.setPointerCapture?.(e.pointerId); dispatchKey('keydown', key); };
    const up = e => { e.preventDefault(); dispatchKey('keyup', key); };
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('lostpointercapture', up);
  }
  root.querySelectorAll('[data-key]').forEach(bindKey);

  function bindAction(id, key) {
    const b = root.querySelector(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); dispatchKey('keydown', key); });
    b.addEventListener('pointerup', e => { e.preventDefault(); dispatchKey('keyup', key); });
    b.addEventListener('pointercancel', () => dispatchKey('keyup', key));
  }
  bindAction('#cmc-enter', 'Enter');
  bindAction('#cmc-escape', 'Escape');

  const pad = root.querySelector('#cmc-mousepad');
  pad.addEventListener('pointerdown', e => {
    e.preventDefault(); padActive = true; lastX = e.clientX; lastY = e.clientY; pad.setPointerCapture(e.pointerId);
  });
  pad.addEventListener('pointermove', e => {
    if (!padActive) return;
    e.preventDefault();
    const dx = (e.clientX - lastX) * sensitivity;
    const dy = (e.clientY - lastY) * sensitivity;
    lastX = e.clientX; lastY = e.clientY;
    virtualX = Math.max(0, Math.min(innerWidth - 1, virtualX + dx));
    virtualY = Math.max(0, Math.min(innerHeight - 1, virtualY + dy));
    dispatchMouse('mousemove', virtualX, virtualY, 0);
  });
  pad.addEventListener('pointerup', () => { padActive = false; });
  pad.addEventListener('pointercancel', () => { padActive = false; });

  function bindMouse(id, button) {
    const b = root.querySelector(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); dispatchMouse('mousedown', virtualX, virtualY, button); });
    b.addEventListener('pointerup', e => { e.preventDefault(); dispatchMouse('mouseup', virtualX, virtualY, button); });
    b.addEventListener('pointercancel', () => dispatchMouse('mouseup', virtualX, virtualY, button));
  }
  bindMouse('#cmc-lmb', 0);
  bindMouse('#cmc-rmb', 2);

  root.querySelector('#cmc-toggle').addEventListener('pointerdown', e => {
    e.preventDefault(); hidden = !hidden;
    root.classList.toggle('cmc-hidden', hidden);
  });

  // Keep the controller usable while preventing the page underneath from scrolling.
  root.addEventListener('touchmove', e => e.preventDefault(), {passive:false});
})();
