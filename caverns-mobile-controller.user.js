// ==UserScript==
// @name         Caverns of the Mad Mage - Mobile Controller
// @namespace    https://github.com/RustySupernova/Virtual-mouse
// @version      3.3.0
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
    document.dispatchEvent(ev);
  }

  function installViewport() {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta=document.createElement('meta');
      meta.name='viewport';
      (document.head||document.documentElement).appendChild(meta);
    }
    meta.content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
    const style=document.createElement('style');
    style.id='cmm-viewport-style';
    style.textContent='html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important;background:#000!important;-webkit-text-size-adjust:100%!important;overscroll-behavior:none!important}';
    (document.head||document.documentElement).appendChild(style);
  }

  // Find the actual game root. We avoid transforming <body>, because Safari's
  // fixed-position and hit-testing behaviour becomes unreliable when body is
  // transformed.
  function findStage() {
    const preferred=['#root','#app','#game','#game-root','#game-container','.game-container','.game','main'];
    for (const selector of preferred) {
      const el=document.querySelector(selector);
      if (el && !el.closest('#'+ROOT_ID)) return el;
    }
    if (!document.body) return null;
    const children=[...document.body.children].filter(el=>el.id!==ROOT_ID);
    if (!children.length) return null;
    const vw=Math.max(1,innerWidth), vh=Math.max(1,innerHeight);
    return children.reduce((best,el)=>{
      const r=el.getBoundingClientRect();
      const score=(r.width*r.height)/(vw*vh)+Math.min(0.05,el.querySelectorAll('*').length/100000);
      return !best || score>best.score ? {el,score} : best;
    },null)?.el || null;
  }

  function installGameFit() {
    const style=document.createElement('style');
    style.id='cmm-game-fit-style';
    style.textContent=`
      #cmm-game-stage{position:relative!important;transform-origin:0 0!important}
    `;
    document.documentElement.appendChild(style);

    let stage=null;
    let scale=1;
    let visualLeft=0;
    let visualTop=0;
    let naturalWidth=1;
    let naturalHeight=1;
    let timer=0;

    const measure=el=>{
      // Prefer the element's own layout size. The game is normally a canvas
      // plus UI, so offset/scroll dimensions are more reliable than scanning
      // every descendant (and avoid a costly layout pass on iPhone).
      const rect=el.getBoundingClientRect();
      let w=Math.max(el.offsetWidth||0,el.scrollWidth||0,rect.width||0);
      let h=Math.max(el.offsetHeight||0,el.scrollHeight||0,rect.height||0);
      const canvas=el.querySelector('canvas');
      if(canvas){
        w=Math.max(w,canvas.offsetWidth||0,canvas.width||0);
        h=Math.max(h,canvas.offsetHeight||0,canvas.height||0);
      }
      return {w:Math.max(1,w),h:Math.max(1,h)};
    };

    const fit=()=>{
      const candidate=findStage();
      if(!candidate || candidate===document.body || candidate===document.documentElement) return;
      stage=candidate;
      stage.id='cmm-game-stage';

      // Always remove the previous transform before measuring, otherwise the
      // measurement compounds on every resize.
      stage.style.transform='none';
      const m=measure(stage);
      naturalWidth=m.w;
      naturalHeight=m.h;

      const vw=Math.max(1,visualViewport?.width||innerWidth);
      const vh=Math.max(1,visualViewport?.height||innerHeight);
      scale=Math.min(1,vw/naturalWidth,vh/naturalHeight);
      visualLeft=(vw-naturalWidth*scale)/2;
      visualTop=(vh-naturalHeight*scale)/2;

      stage.style.transform=`translate(${visualLeft}px,${visualTop}px) scale(${scale})`;
      stage.dataset.cmmScale=String(scale);
    };

    const schedule=()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>requestAnimationFrame(fit),100);
    };

    // The game can create its canvas after document-start.
    [0,250,750,1500,2500].forEach(t=>setTimeout(fit,t));
    addEventListener('resize',schedule,{passive:true});
    addEventListener('orientationchange',()=>setTimeout(fit,300),{passive:true});
    if(window.visualViewport) visualViewport.addEventListener('resize',schedule,{passive:true});

    // Only watch DOM additions/removals. Watching attributes can create a
    // resize loop because the game and this script both change styles.
    if(document.body){
      new MutationObserver(records=>{
        if(records.some(r=>r.type==='childList')) schedule();
      }).observe(document.body,{childList:true,subtree:true});
    }

    window.CMMLayout={
      fit,
      getStage:()=>stage,
      getScale:()=>scale,
      getVisualRect:()=>({left:visualLeft,top:visualTop,width:naturalWidth*scale,height:naturalHeight*scale})
    };
  }

  function installTouchMouse() {
    let active=null, moved=false, startX=0,startY=0;

    const visualPoint=e=>({x:e.clientX,y:e.clientY});
    const targetAt=(x,y)=>document.elementFromPoint(x,y)||document.body;

    // CSS-transforming the game makes it visible on the whole iPhone screen,
    // but the game itself still uses its original coordinate system. Therefore
    // we distinguish between:
    //   1. visual coordinates: where the user's finger is on the iPhone;
    //   2. game coordinates: coordinates inside the unscaled game root.
    //
    // The target is found using visual coordinates, while MouseEvent.clientX/Y
    // are converted back to the game's coordinate space. This is the key fix
    // that lets us use scaling without breaking New Game / inventory clicks.
    const mapToGame=(x,y)=>{
      const layout=window.CMMLayout;
      if(!layout) return {x,y};
      const rect=layout.getVisualRect();
      const s=layout.getScale()||1;
      return {
        x:(x-rect.left)/s + rect.left,
        y:(y-rect.top)/s + rect.top
      };
    };

    const mouse=(type,x,y,button=0,buttons=0,target=null)=>{
      const visualTarget=target||targetAt(x,y);
      if(!visualTarget) return;
      const p=mapToGame(x,y);
      const ev=new MouseEvent(type,{
        bubbles:true,
        cancelable:true,
        composed:true,
        view:window,
        clientX:p.x,
        clientY:p.y,
        screenX:p.x,
        screenY:p.y,
        button,
        buttons,
        detail:type==='click'?1:0
      });
      visualTarget.dispatchEvent(ev);
    };

    document.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||e.target.closest('#'+ROOT_ID)) return;
      active=e.pointerId;
      moved=false;
      startX=e.clientX;
      startY=e.clientY;
      mouse('mousemove',e.clientX,e.clientY,0,0);
    },{capture:true,passive:true});

    document.addEventListener('pointermove',e=>{
      if(e.pointerType!=='touch'||e.pointerId!==active) return;
      if(Math.hypot(e.clientX-startX,e.clientY-startY)>8) moved=true;
      mouse('mousemove',e.clientX,e.clientY,0,0);
    },{capture:true,passive:true});

    document.addEventListener('pointerup',e=>{
      if(e.pointerType!=='touch'||e.pointerId!==active) return;
      const x=e.clientX,y=e.clientY;
      if(!moved){
        const el=targetAt(x,y);
        mouse('mousedown',x,y,0,1,el);
        mouse('mouseup',x,y,0,0,el);
        mouse('click',x,y,0,0,el);
      }
      active=null;
    },{capture:true,passive:true});

    document.addEventListener('pointercancel',e=>{
      if(e.pointerId===active) active=null;
    },{capture:true,passive:true});
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

    const root=document.createElement('div');
    root.id=ROOT_ID;
    root.innerHTML=`<div id="cmm-pad"><button class="cmm-key" id="cmm-q" data-key="q">↖</button><button class="cmm-key" id="cmm-up" data-key="w">▲</button><button class="cmm-key" id="cmm-e" data-key="e">↗</button><button class="cmm-key" id="cmm-left" data-key="a">◀</button><button id="cmm-diag">•</button><button class="cmm-key" id="cmm-right" data-key="d">▶</button><button class="cmm-key" id="cmm-z" data-key="z">↙</button><button class="cmm-key" id="cmm-down" data-key="s">▼</button><button class="cmm-key" id="cmm-c" data-key="c">↘</button></div><div id="cmm-actions"><button class="cmm-action" data-key="Enter">ENTER</button><button class="cmm-action" data-key="Escape">ESC</button></div>`;
    document.documentElement.appendChild(root);

    root.querySelectorAll('[data-key]').forEach(btn=>{
      let active=false;
      const down=e=>{e.preventDefault();e.stopPropagation();if(active)return;active=true;btn.classList.add('pressed');try{btn.setPointerCapture(e.pointerId)}catch(_){}keyEvent('keydown',btn.dataset.key)};
      const up=e=>{e.preventDefault();e.stopPropagation();if(!active)return;active=false;btn.classList.remove('pressed');keyEvent('keyup',btn.dataset.key)};
      btn.addEventListener('pointerdown',down,{passive:false});
      btn.addEventListener('pointerup',up,{passive:false});
      btn.addEventListener('pointercancel',up,{passive:false});
      btn.addEventListener('lostpointercapture',up,{passive:false});
    });

    let diag=true;
    root.querySelector('#cmm-diag').addEventListener('pointerdown',e=>{
      e.preventDefault();
      e.stopPropagation();
      diag=!diag;
      ['cmm-q','cmm-e','cmm-z','cmm-c'].forEach(id=>root.querySelector('#'+id).style.display=diag?'flex':'none');
    },{passive:false});

    root.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
    root.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  }

  function start(){
    if(document.getElementById(ROOT_ID)) return;
    installViewport();
    installGameFit();
    installTouchMouse();
    installController();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
