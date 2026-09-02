/* =====================================================================
   LIVE GAMES WEB PAGES  —  /piano  and  /dino
   Served by the bot's keep-alive HTTP server so `.piano play` and
   `.dino play` can hand the user a real playable page: keys hover, press
   and make sound (Web Audio, no assets), and the octave buttons work.
   ===================================================================== */

function baseUrl() {
    const raw = process.env.GAME_URL || process.env.PUBLIC_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '';
    if (raw) return String(raw).replace(/\/+$/, '');
    const port = Number(process.env.PORT || 3000);
    return `http://localhost:${port}`;
}

function gameLink(kind) {
    return `${baseUrl()}/${kind === 'dino' ? 'dino' : 'piano'}`;
}

const SHELL = (title, body, script) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  body{min-height:100vh;background:linear-gradient(160deg,#3b2c8f,#191333);color:#fff;
       font-family:system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;
       justify-content:center;padding:16px;overflow:hidden;touch-action:manipulation}
  .card{width:100%;max-width:640px;background:#241c52;border-radius:26px;padding:20px 18px 26px;
        box-shadow:0 24px 60px rgba(0,0,0,.45)}
  .kicker{font-size:12px;letter-spacing:4px;color:#b9b6e8}
  h1{font-size:30px;margin:6px 0 16px}
  .btn{background:#5a4bd8;border:0;color:#fff;font-size:15px;font-weight:600;border-radius:16px;
       padding:14px 18px;flex:1;cursor:pointer;transition:transform .08s,background .15s}
  .btn:hover{background:#6f60ee}.btn:active{transform:scale(.95)}
  .row{display:flex;gap:10px;margin-top:16px}
  .readout{margin-top:14px;background:#332a6b;border-radius:16px;padding:16px;text-align:center;
           font-size:22px;font-weight:700;letter-spacing:1px;color:#d9d5ff}
  .hint{margin-top:12px;text-align:center;color:#b9b6e8;font-size:13px}
</style></head><body><div class="card">${body}</div>
<script>${script}</script></body></html>`;

/* -------------------------------- piano -------------------------------- */
const PIANO_BODY = `
<div class="kicker">CBS-SCOVER GAME</div>
<h1>🎹 Piano</h1>
<div id="board" style="position:relative;background:#15122e;border-radius:18px;padding:10px;height:260px"></div>
<div class="readout" id="readout">READY</div>
<div class="row">
  <button class="btn" id="down">− OCTAVE</button>
  <button class="btn" id="center">CENTER</button>
  <button class="btn" id="up">+ OCTAVE</button>
</div>
<div class="hint">Tap or hover a key · keyboard A S D F G H J and W E T Y U · Z / X change octave</div>
<style>
  .wk{position:absolute;top:0;background:linear-gradient(#fff,#e9e7f7);border-radius:0 0 9px 9px;
      border:1px solid #cfcde6;display:flex;align-items:flex-end;justify-content:center;
      padding-bottom:10px;color:#3a3a55;font-weight:700;font-size:15px;cursor:pointer;transition:background .08s}
  .wk:hover{background:linear-gradient(#efeaff,#d9d2ff)}
  .wk.on{background:linear-gradient(#b9a9ff,#8f78f5);color:#fff}
  .bk{position:absolute;top:0;background:linear-gradient(#2a2545,#0e0c1c);border-radius:0 0 7px 7px;
      color:#fff;font-size:11px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;
      cursor:pointer;z-index:3;transition:background .08s}
  .bk:hover{background:linear-gradient(#4a3f7d,#221c3d)}
  .bk.on{background:linear-gradient(#8f78f5,#5a4bd8)}
</style>`;

const PIANO_SCRIPT = `
const WHITE=['C','D','E','F','G','A','B'], LETTERS=['A','S','D','F','G','H','J'];
const BLACK=[['C#',0,'W'],['D#',1,'E'],['F#',3,'T'],['G#',4,'Y'],['A#',5,'U']];
const SEMI={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
let octave=4, ctx=null;
const board=document.getElementById('board'), readout=document.getElementById('readout');

function layout(){
  board.innerHTML='';
  const w=board.clientWidth-20, h=board.clientHeight-20, ww=w/7;
  WHITE.forEach((n,i)=>{
    const el=document.createElement('div'); el.className='wk'; el.dataset.note=n;
    el.style.left=(10+i*ww)+'px'; el.style.width=(ww-2)+'px'; el.style.height=h+'px'; el.style.top='10px';
    el.innerHTML=n+'<span style="opacity:.45;font-size:11px;margin-left:4px">'+LETTERS[i]+'</span>';
    board.appendChild(el);
  });
  BLACK.forEach(([n,i])=>{
    const el=document.createElement('div'); el.className='bk'; el.dataset.note=n;
    el.style.left=(10+(i+1)*ww-ww*0.29)+'px'; el.style.width=(ww*0.58)+'px';
    el.style.height=(h*0.62)+'px'; el.style.top='10px'; el.textContent=n;
    board.appendChild(el);
  });
}
function freq(note,oct){const midi=12*(oct+1)+SEMI[note];return 440*Math.pow(2,(midi-69)/12);}
function play(note){
  ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();
  if(ctx.state==='suspended')ctx.resume();
  const f=freq(note,octave), t=ctx.currentTime, g=ctx.createGain();
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.32,t+.01);
  g.gain.exponentialRampToValueAtTime(.0008,t+1.5); g.connect(ctx.destination);
  [[1,1],[2,.32],[3,.14],[4,.07]].forEach(([m,a])=>{
    const o=ctx.createOscillator(), og=ctx.createGain();
    o.type='sine'; o.frequency.value=f*m; og.gain.value=a; o.connect(og); og.connect(g);
    o.start(t); o.stop(t+1.6);
  });
  readout.textContent='PLAYING '+note+octave;
  const el=[...board.children].find(c=>c.dataset.note===note);
  if(el){el.classList.add('on'); setTimeout(()=>el.classList.remove('on'),180);}
  if(navigator.vibrate)navigator.vibrate(8);
}
function setOctave(v){octave=Math.max(0,Math.min(7,v)); readout.textContent='OCTAVE '+octave;}
board.addEventListener('pointerdown',e=>{const n=e.target.dataset.note; if(n)play(n);});
board.addEventListener('pointerover',e=>{const n=e.target.dataset.note; if(n&&e.buttons)play(n);});
document.getElementById('up').onclick=()=>setOctave(octave+1);
document.getElementById('down').onclick=()=>setOctave(octave-1);
document.getElementById('center').onclick=()=>setOctave(4);
addEventListener('keydown',e=>{
  if(e.repeat)return; const k=e.key.toUpperCase();
  if(k==='Z')return setOctave(octave-1); if(k==='X')return setOctave(octave+1);
  const wi=LETTERS.indexOf(k); if(wi>-1)return play(WHITE[wi]);
  const b=BLACK.find(x=>x[2]===k); if(b)play(b[0]);
});
addEventListener('resize',layout); layout();`;

/* --------------------------------- dino --------------------------------- */
const DINO_BODY = `
<div class="kicker">CBS-SCOVER GAME</div>
<h1>🦖 Dino Run</h1>
<canvas id="c" width="880" height="300" style="width:100%;background:#161031;border-radius:18px;display:block"></canvas>
<div class="readout" id="readout">TAP OR PRESS SPACE TO START</div>
<div class="row">
  <button class="btn" id="jump">JUMP</button>
  <button class="btn" id="duck">DUCK</button>
  <button class="btn" id="restart">RESTART</button>
</div>
<div class="hint">Space / ↑ = jump · ↓ = duck · avoid cactus and birds</div>`;

const DINO_SCRIPT = `
const c=document.getElementById('c'), x=c.getContext('2d'), readout=document.getElementById('readout');
const G=320/300*0, GROUND=240;
let ac=null;
function beep(f,d,type){
  ac=ac||new (window.AudioContext||window.webkitAudioContext)();
  if(ac.state==='suspended')ac.resume();
  const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
  o.type=type||'square'; o.frequency.value=f; g.gain.setValueAtTime(.16,t);
  g.gain.exponentialRampToValueAtTime(.001,t+d); o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t+d);
}
let S=null;
function reset(){S={y:0,vy:0,duck:false,obs:[],speed:6,score:0,best:Number(localStorage.dinoBest||0),over:false,run:true,t:0};}
reset();
function spawn(){S.obs.push({type:Math.random()<.32?'bird':'cactus',x:900});}
function jump(){ if(S.over)return start(); if(S.y===0){S.vy=15; beep(660,.12);} }
function duck(on){S.duck=on;}
function start(){reset(); S.run=true; readout.textContent='RUN!'; beep(520,.1);}
document.getElementById('jump').onclick=jump;
document.getElementById('duck').onpointerdown=()=>duck(true);
document.getElementById('duck').onpointerup=()=>duck(false);
document.getElementById('restart').onclick=start;
c.addEventListener('pointerdown',jump);
addEventListener('keydown',e=>{
  if(e.code==='Space'||e.key==='ArrowUp'){e.preventDefault();jump();}
  if(e.key==='ArrowDown')duck(true);
});
addEventListener('keyup',e=>{if(e.key==='ArrowDown')duck(false);});

function step(){
  if(S.run&&!S.over){
    S.t++;
    S.vy-=0.9; S.y=Math.max(0,S.y+S.vy); if(S.y===0)S.vy=0;
    S.speed=6+Math.min(8,S.score/300);
    S.obs.forEach(o=>o.x-=S.speed);
    S.obs=S.obs.filter(o=>o.x>-80);
    const last=S.obs[S.obs.length-1];
    if(!last||last.x<520-Math.random()*160)spawn();
    for(const o of S.obs){
      const hit=o.x<130&&o.x>40;
      if(!hit)continue;
      if(o.type==='cactus'&&S.y<60){S.over=true;}
      if(o.type==='bird'&&!S.duck&&S.y<110){S.over=true;}
    }
    if(S.over){ S.best=Math.max(S.best,Math.floor(S.score)); localStorage.dinoBest=S.best;
      readout.textContent='GAME OVER — '+Math.floor(S.score); beep(160,.4,'sawtooth'); }
    else { S.score+=0.6; readout.textContent='SCORE '+Math.floor(S.score)+'  ·  BEST '+S.best; }
  }
  draw(); requestAnimationFrame(step);
}
function draw(){
  x.clearRect(0,0,c.width,c.height);
  x.strokeStyle='#5a4bd8'; x.lineWidth=4; x.beginPath();
  x.moveTo(20,GROUND+14); x.lineTo(c.width-20,GROUND+14); x.stroke();
  const dy=GROUND-S.y, h=S.duck?26:52;
  x.fillStyle=S.over?'#ff6b81':'#a5f3fc';
  x.fillRect(80,dy-h,54,h);
  x.fillRect(122,dy-h-(S.duck?8:24),30,26);
  x.fillStyle='#101024'; x.fillRect(142,dy-h-(S.duck?2:16),5,5);
  for(const o of S.obs){
    if(o.type==='bird'){
      x.fillStyle='#ffd166';
      x.beginPath(); x.ellipse(o.x+22,GROUND-118,24,11,0,0,7); x.fill();
      x.beginPath(); x.moveTo(o.x+8,GROUND-124); x.lineTo(o.x+30,GROUND-152+((S.t/6|0)%2)*24); x.lineTo(o.x+38,GROUND-120); x.fill();
    } else {
      x.fillStyle='#4ade80';
      x.fillRect(o.x+16,GROUND-58,18,58);
      x.fillRect(o.x+2,GROUND-42,16,10); x.fillRect(o.x+2,GROUND-42,9,26);
      x.fillRect(o.x+32,GROUND-34,16,10); x.fillRect(o.x+40,GROUND-52,9,28);
    }
  }
}
step();`;

const PAGES = {
    '/piano': () => SHELL('Piano · Live', PIANO_BODY, PIANO_SCRIPT),
    '/dino': () => SHELL('Dino Run · Live', DINO_BODY, DINO_SCRIPT),
};

// Returns true when the request was handled as a live game page.
function handleRequest(req, res) {
    const path = String(req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
    const page = PAGES[path.toLowerCase()];
    if (!page) return false;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(page());
    return true;
}

module.exports = { handleRequest, gameLink, baseUrl };
