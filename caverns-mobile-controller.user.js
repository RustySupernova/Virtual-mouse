// ==UserScript==
// @name         Caverns of the Mad Mage - Mobile Controller
// @namespace    https://github.com/RustySupernova/Virtual-mouse
// @version      3.1.0
// @description  iPhone/iPad controls for Caverns of the Mad Mage, including touch-to-mouse input
// @match        https://bluesquirrel.itch.io/caverns-of-the-mad-mage*
// @match        https://html-classic.itch.zone/html/17576366/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const GAME = 'https://html-classic.itch.zone/html/17576366/index.html';
  const GAME_HOST = 'html-classic.itch.zone';
  const ROOT_ID = 'cmm-controller';

  // Use the actual game document instead of the cross-origin itch.io iframe.
  if (location.hostname === 'bluesquirrel.itch.io') {
    if (location.pathname.startsWith('/caverns-of-the-mad-mage')) location.replace(GAME);
    return;
  }
  if (location.hostname !== GAME_HOST || !location.pathname.startsWith('/html/17576366/')) return;
  if (window.top !== window.self || document.getElementById(ROOT_ID)) return;

  const KEY = {
    w:['w','KeyW',87], a:['a','KeyA',65], s:['s','KeyS',83], d:['d','KeyD',68],
    q:['q','KeyQ',81], e:['e','KeyE',69], z:['z','KeyZ',90], c:['c','KeyC',67],
    Enter:['Enter','Enter',13], Escape:['Escape','Escape',27], Space:[' ','Space',32]
  };

  function keyEvent(type, name) {
    const x = KEY[name] || [name,name,0];
    const ev = new KeyboardEvent(type, {key:x[0], code:x[1], bubbles:true, cancelable:true, composed:true});
    for (const p of ['keyCode','which','charCode']) {
      try { Object.defineProperty(ev,p,{get:()=>x[2]}); } catch (_) {}
    }
    // Dispatch once. Re-dispatching the same Event object to several targets
    // can produce inconsistent behaviour in Safari.
    document.dispatchEvent(ev);
  }

  function installViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta=document.createElement('meta'); meta.name='viewport'; (document.head||document.documentElement).appendChild(meta); }
    meta.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
    const style=document.createElement('style');
    style.id='cmm-viewport-style';
    style.textContent='html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important;background:#000!important;-webkit-text-size-adjust:100%!important;overscroll-behavior:none!important}';
    (document.head||document.documentElement).appendChild(style);
  }

  function findStage() {
    // Prefer the game's actual root. Do not use body: transforming body breaks
    // Safari's fixed/absolute coordinate system and click hit testing.
    const preferred=['#root','#app','#game','#game-root','#game-container','.game-container','.game','main'];
    for(const s of preferred){const el=document.querySelector(s);if(el&&!el.closest('#'+ROOT_ID))return el;}
    const kids=[...document.body.children].filter(e=>e.id!==ROOT_ID);
    if(!kids.length)return null;
    const vw=innerWidth||1,vh=innerHeight||1;
    return kids.reduce((best,el)=>{const r=el.getBoundingClientRect();const score=Math.min(1,(r.width*r.height)/(vw*vh))*100000+Math.min(5000,el.querySelectorAll('*').length);return score>(best.score||-1)?{el,score}:best},{}).el||kids[0];
  }

  function installGameFit() {
    const style=document.createElement('style');
    style.id='cmm-game-fit-style';
    style.textContent='#cmm-game-stage{position:relative!important;transform-origin:0 0!important}';
    (document.head||document.documentElement).appendChild(style);

    let stage=null,timer=0, lastScale=1;
    const measure=el=>{
      const base=el.getBoundingClientRect();
      let w=Math.max(base.width,el.scrollWidth||0,el.offsetWidth||0);
      let h=Math.max(base.height,el.scrollHeight||0,el.offsetHeight||0);
      const all=el.querySelectorAll('*');
      for(let i=0;i<Math.min(all.length,1500);i++){
        const r=all[i].getBoundingClientRect();
        if(r.width||r.height){w=Math.max(w,r.right-base.left);h=Math.max(h,r.bottom-base.top);}
      }
      return {w:Math.max(1,w),h:Math.max(1,h)};
    };
    const fit=()=>{
      stage=findStage();
      if(!stage||stage===document.body)return;
      stage.id='cmm-game-stage';
      // Important: preserve the game's own layout while measuring.
      stage.style.transform='none';
      const vw=Math.max(1,visualViewport?.width||innerWidth),vh=Math.max(1,visualViewport?.height||innerHeight);
      const m=measure(stage);
      const scale=Math.min(1,vw/m.w,vh/m.h);
      const x=Math.max(0,(vw-m.w*scale)/2),y=Math.max(0,(vh-m.h*scale)/2);
      stage.style.transform=`translate(${x}px,${y}px) scale(${scale})`;
      stage.dataset.cmmScale=scale;
      lastScale=scale;
    };
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(fit),150)};
    [0,400,1000,2000].forEach(t=>setTimeout(fit,t));
    addEventListener('resize',schedule,{passive:true});
    addEventListener('orientationchange',()=>setTimeout(fit,300),{passive:true});
    if(visualViewport)visualViewport.addEventListener('resize',schedule,{passive:true});
    // Only watch additions/removals. Attribute mutations can cause a resize
    // loop while the game is running.
    new MutationObserver(rs=>{if(rs.some(r=>r.type==='childList'))schedule()}).observe(document.body,{childList:true,subtree:true});
    window.CMMLayout={fit,getStage:()=>stage,getScale:()=>lastScale};
  }

  // The game is explicitly mouse + keyboard. The previous v3 controller only
  // supplied keyboard events, so the New Game screen could not be activated.
  // Forward a normal iPhone tap to the game as a synthetic mouse click.
  // This also makes inventory/item buttons usable without a separate mouse pad.
  function installTouchMouse() {
    let active=null, moved=false, startX=0,startY=0;

    const getPoint=e=>({x:e.clientX,y:e.clientY});
    const targetAt=(x,y)=>document.elementFromPoint(x,y)||document.body;
    const mouse=(type,x,y,button=0,buttons=0,target=null)=>{
      const el=target||targetAt(x,y);
      if(!el)return;
      const ev=new MouseEvent(type,{bubbles:true,cancelable:true,composed:true,view:window,clientX:x,clientY:y,screenX:x,screenY:y,button,buttons,detail:type==='click'?1:0});
      el.dispatchEvent(ev);
    };

    // Use pointer events on the game itself. Controller buttons stop propagation,
    // so they are unaffected.
    document.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||e.target.closest('#'+ROOT_ID))return;
      active=e.pointerId;moved=false;startX=e.clientX;startY=e.clientY;
      mouse('mousemove',e.clientX,e.clientY,0,0);
    },{capture:true,passive:true});

    document.addEventListener('pointermove',e=>{
      if(e.pointerType!=='touch'||e.pointerId!==active)return;
      if(Math.hypot(e.clientX-startX,e.clientY-startY)>8)moved=true;
      mouse('mousemove',e.clientX,e.clientY,0,0);
    },{capture:true,passive:true});

    document.addEventListener('pointerup',e=>{
      if(e.pointerType!=='touch'||e.pointerId!==active)return;
      const x=e.clientX,y=e.clientY;
      if(!moved){
        // Do not suppress Safari's native click. Synthetic click is dispatched
        // only if the target is not one of the controller elements.
        const el=targetAt(x,y);
        mouse('mousedown',x,y,0,1,el);
        mouse('mouseup',x,y,0,0,el);
        mouse('click',x,y,0,0,el);
      }
      active=null;
    },{capture:true,passive:true});

    document.addEventListener('pointercancel',e=>{if(e.pointerId===active)active=null},{capture:true,passive:true});
  }

  function installController() {
    const style=document.createElement('style');
    style.textContent=`
      #${ROOT_ID}{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:2147483647!important;pointer-events:none!important;user-select:none!important;-webkit-user-select:none!important;font-family:-apple-system,BlinkMacSystemFont,sans-serif!important}
      #${ROOT_ID} *{box-sizing:border-box!important}
      #cmm-pad{position:absolute!important;left:max(9px,env(safe-area-inset-left))!important;bottom:max(9px,env(safe-area-inset-bottom))!important;width:min(38vw,230px)!important;height:min(38vw,230px)!important;min-width:185px!important;min-height:185px!important;max-width:230px!important;max-height:230px!important;pointer-events:none!important}
      .cmm-key{position:absolute!important;width:31%!important;height:31%!important;padding:0!important;border:2px solid rgba(255,255,255,.48)!important;border-radius:22%!important;background:rgba(8,8,8,.72)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:clamp(27px,7vw,41px)!important;font-weight:800!important;box-shadow:0 3px 12px rgba(0,0,0,.45)!important;pointer-events:auto!important;touch-action:none!important;-webkit-tap-highlight-color:transparent!important}
      .cmm-key.pressed{transform:scale(.86)!important;background:rgba(255,255,255,.4)!important}
      #cmm-q{left:0;top:0}#cmm-up{left:34.5%;top:0}#cmm-e{right:0;top:0}#cmm-left{left:0;top:34.5%}#cmm-right{right:0;top:34.5%}#cmm-z{left:0;bottom:0}#cmm-down{left:34.5%;bottom:0}#cmm-c{right:0;bottom:0}
      #cmm-diag{position:absolute!important;left:34.5%!important;top:34.5%!important;width:31%!important;height:31%!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:50%!important;background:rgba(0,0,0,.2)!important;color:rgba(255,255,255,.4)!important;pointer-events:auto!important;touch-action:none!important}
      #cmm-actions{position:absolute!important;right:max(9px,env(safe-area-inset-right))!important;bottom:max(9px,env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:column!important;gap:8px!important;pointer-events:none!important}
      .cmm-action{width:clamp(86px,21vw,112px)!important;height:clamp(52px,12vw,67px)!important;border:2px solid rgba(255,255,255,.45)!important;border-radius:15px!important;background:rgba(8,8,8,.72)!important;color:#fff!important;font-size:clamp(12px,3.4vw,17px)!important;font-weight:800!important;pointer-events:auto!important;touch-action:none!important}
      @media(max-width:390px){#cmm-pad{width:200px!important;height:200px!important;min-width:200px!important;min-height:200px!important}}
      @media(orientation:landscape) and (max-height:500px){#cmm-pad{width:28vh!important;height:28vh!important;min-width:150px!important;min-height:150px!important;max-width:185px!important;max-height:185px!important}.cmm-action{width:94px!important;height:48px!important}}
    `;
    document.documentElement.appendChild(style);

    const root=document.createElement('div');root.id=ROOT_ID;
    root.innerHTML=`<div id="cmm-pad"><button class="cmm-key" id="cmm-q" data-key="q">↖</button><button class="cmm-key" id="cmm-up" data-key="w">▲</button><button class="cmm-key" id="cmm-e" data-key="e">↗</button><button class="cmm-key" id="cmm-left" data-key="a">◀</button><button id="cmm-diag">•</button><button class="cmm-key" id="cmm-right" data-key="d">▶</button><button class="cmm-key" id="cmm-z" data-key="z">↙</button><button class="cmm-key" id="cmm-down" data-key="s">▼</button><button class="cmm-key" id="cmm-c" data-key="c">↘</button></div><div id="cmm-actions"><button class="cmm-action" data-key="Enter">ENTER</button><button class="cmm-action" data-key="Escape">ESC</button></div>`;
    document.documentElement.appendChild(root);

    root.querySelectorAll('[data-key]').forEach(btn=>{
      let active=false;
      const down=e=>{e.preventDefault();e.stopPropagation();if(active)return;active=true;btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId)}catch(_){}keyEvent('keydown',btn.dataset.key)};
      const up=e=>{e.preventDefault();e.stopPropagation();if(!active)return;active=false;btn.classList.remove('pressed');keyEvent('keyup',btn.dataset.key)};
      btn.addEventListener('pointerdown',down,{passive:false});btn.addEventListener('pointerup',up,{passive:false});btn.addEventListener('pointercancel',up,{passive:false});btn.addEventListener('lostpointercapture',up,{passive:false});
    });
    let diag=true;
    root.querySelector('#cmm-diag').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();diag=!diag;['cmm-q','cmm-e','cmm-z','cmm-c'].forEach(id=>root.querySelector('#'+id).style.display=diag?'flex':'none')},{passive:false});
    root.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
    root.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  }

  function start(){
    if(document.getElementById(ROOT_ID))return;
    installViewport();
    installGameFit();
    installTouchMouse();
    installController();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();