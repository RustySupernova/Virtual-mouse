const frame = document.getElementById('gameFrame');
const welcome = document.getElementById('welcome');
const controller = document.getElementById('controller');
const status = document.getElementById('connectionStatus');
const toast = document.getElementById('toast');
const settings = document.getElementById('settingsPanel');
const proxyInput = document.getElementById('proxyUrl');
const sensitivity = document.getElementById('mouseSensitivity');
const opacity = document.getElementById('opacitySlider');
const MAD_MAGE_RUNTIME = 'https://html-classic.itch.zone/html/17576366/index.html';

let proxy = localStorage.getItem('cavernsProxy') || '';
let mouseSensitivity = Number(localStorage.getItem('cavernsSensitivity') || 10);
proxyInput.value = proxy;
sensitivity.value = mouseSensitivity;

function toastMessage(text) {
  toast.textContent = text; toast.classList.add('show');
  clearTimeout(toastMessage.timer); toastMessage.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function keyCode(key) {
  if (/^[a-z]$/i.test(key)) return 'Key' + key.toUpperCase();
  return {Enter:'Enter',Escape:'Escape', ' ':'Space'}[key] || key;
}

function sendKeyboard(type, key) {
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('cross-origin');
    const target = doc.activeElement || doc.body || doc.documentElement;
    target.dispatchEvent(new KeyboardEvent(type, {key, code:keyCode(key), bubbles:true, cancelable:true, composed:true}));
    return true;
  } catch (_) {
    toastMessage('Controller needs same-origin game mode');
    return false;
  }
}

function mouseEvent(type, x, y, button = 0) {
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('cross-origin');
    const target = doc.activeElement || doc.body || doc.documentElement;
    target.dispatchEvent(new MouseEvent(type, {bubbles:true,cancelable:true,clientX:x,clientY:y,button,buttons:type==='mouseup'?0:1}));
  } catch (_) { toastMessage('Controller needs same-origin game mode'); }
}

let virtualX = 400, virtualY = 300;
function moveMouse(dx, dy) {
  virtualX += dx * mouseSensitivity; virtualY += dy * mouseSensitivity;
  virtualX = Math.max(0, virtualX); virtualY = Math.max(0, virtualY);
  mouseEvent('mousemove', virtualX, virtualY, 0);
}

function bindKeyButton(button) {
  const key = button.dataset.key;
  const down = e => { e.preventDefault(); button.setPointerCapture?.(e.pointerId); sendKeyboard('keydown', key); };
  const up = e => { e.preventDefault(); sendKeyboard('keyup', key); };
  button.addEventListener('pointerdown', down); button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up); button.addEventListener('lostpointercapture', up);
}
document.querySelectorAll('#dpad button').forEach(bindKeyButton);

function bindAction(id, key) {
  const b = document.getElementById(id); if (!b) return;
  b.addEventListener('pointerdown', e => {e.preventDefault(); sendKeyboard('keydown', key);});
  b.addEventListener('pointerup', e => {e.preventDefault(); sendKeyboard('keyup', key);});
  b.addEventListener('pointercancel', () => sendKeyboard('keyup', key));
}
bindAction('enterButton','Enter'); bindAction('escapeButton','Escape');

const pad = document.getElementById('mousePad');
let padActive = false, lastX = 0, lastY = 0;
pad.addEventListener('pointerdown', e => { e.preventDefault(); padActive=true; lastX=e.clientX; lastY=e.clientY; pad.setPointerCapture(e.pointerId); });
pad.addEventListener('pointermove', e => { if (!padActive) return; e.preventDefault(); moveMouse(e.clientX-lastX,e.clientY-lastY); lastX=e.clientX; lastY=e.clientY; });
pad.addEventListener('pointerup', e => {padActive=false;}); pad.addEventListener('pointercancel', () => padActive=false);

function bindMouseButton(id, button) {
  const b=document.getElementById(id);
  b.addEventListener('pointerdown', e=>{e.preventDefault();mouseEvent('mousedown',virtualX,virtualY,button);});
  b.addEventListener('pointerup', e=>{e.preventDefault();mouseEvent('mouseup',virtualX,virtualY,button);});
  b.addEventListener('pointercancel',()=>mouseEvent('mouseup',virtualX,virtualY,button));
}
bindMouseButton('leftClick',0); bindMouseButton('rightClick',2);

document.getElementById('loadGame').addEventListener('click', () => {
  const target = proxy || MAD_MAGE_RUNTIME;
  frame.src = target;
  frame.style.display='block'; welcome.style.display='none'; status.textContent='Loading…';
});
frame.addEventListener('load', () => {status.textContent='Game loaded'; toastMessage('Game loaded');});

document.getElementById('settingsButton').addEventListener('click',()=>settings.classList.add('open'));
document.getElementById('closeSettings').addEventListener('click',()=>settings.classList.remove('open'));
document.getElementById('saveSettings').addEventListener('click',()=>{
  proxy=proxyInput.value.trim().replace(/\/$/,''); mouseSensitivity=Number(sensitivity.value)||10;
  localStorage.setItem('cavernsProxy',proxy); localStorage.setItem('cavernsSensitivity',mouseSensitivity);
  settings.classList.remove('open'); toastMessage('Settings saved');
});
opacity.addEventListener('input',()=>controller.style.opacity=opacity.value);

document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('touchmove',e=>{if(e.target.closest('#controller'))e.preventDefault();},{passive:false});
