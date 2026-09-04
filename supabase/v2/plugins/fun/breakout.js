import { sendRichHtml } from '../../lib/richhtml.js'

const html = `<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{overflow:hidden;background:#05082b;font-family:"Trebuchet MS",sans-serif;color:#eaf2ff}
  canvas{display:block;touch-action:none}
  .hud{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;gap:8px;
       padding:14px 18px;font-size:15px;letter-spacing:1px;pointer-events:none;text-shadow:0 2px 6px #000}
  .hud a{pointer-events:auto;color:#6ee7ff;text-decoration:none;border:1px solid #6ee7ff55;
         padding:4px 12px;border-radius:999px;font-size:13px}
  .banner{position:fixed;inset:0;display:none;align-items:center;justify-content:center;
          flex-direction:column;gap:14px;background:rgba(5,8,43,.82);text-align:center;padding:20px}
  .banner h2{font-size:38px;letter-spacing:3px}
  .banner button{cursor:pointer;border:0;border-radius:999px;padding:12px 28px;font-size:15px;
      background:linear-gradient(90deg,#22d3ee,#3b82f6);color:#04060f;font-weight:700}
  .tip{position:fixed;bottom:10px;width:100%;text-align:center;font-size:12px;opacity:.5}
</style>
</head>
<body>
<div class="hud"><span id="score">Score 0</span><span id="balls">Balls 1</span><span id="left">Blocks 0</span><a href="/home.html">Home</a></div>
<div class="banner" id="banner"><h2 id="btitle"></h2><p id="bmsg"></p><button id="bbtn">Play</button></div>
<div class="tip">Move mouse / drag to slide the paddle · grab the glowing drops for extra balls</div>
<canvas id="cv"></canvas>
<script>
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let W=0,H=0;
function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
addEventListener('resize',()=>{resize();layout();});
resize();

const scoreEl=document.getElementById('score'),leftEl=document.getElementById('left'),ballsEl=document.getElementById('balls');
const banner=document.getElementById('banner'),btitle=document.getElementById('btitle'),
      bmsg=document.getElementById('bmsg'),bbtn=document.getElementById('bbtn');

// Row color palettes (a fresh one is picked every round = new "skin")
const PALETTES=[
  ['#e02020','#f07f13','#f2e11c','#2f8fe0','#e01fd0','#1fd03a'],
  ['#22d3ee','#3b82f6','#a855f7','#ec4899','#f59e0b','#84cc16'],
  ['#f43f5e','#fb923c','#facc15','#4ade80','#38bdf8','#c084fc'],
  ['#ef4444','#f97316','#eab308','#10b981','#06b6d4','#d946ef']
];

// Block layouts change every round
const LAYOUTS=[
  (c,r,C,R)=>true,
  (c,r)=>(c+r)%2===0,
  (c,r,C,R)=>r<2||c===0||c===C-1,
  (c,r,C)=>Math.abs(c-(C-1)/2)<=r,
  (c)=>c%3!==1,
  (c,r)=>r%2===0||c%2===0
];

let bricks=[],balls=[],drops=[],score=0,round=0,running=false;
const paddle={x:0,y:0,w:130,h:16};
let bw=60,bh=22,cols=8,rows=6,palette=PALETTES[0];

function layout(){paddle.y=H-64;paddle.w=Math.max(96,Math.min(190,W*0.24));}
layout();

function newBall(x,y,vx,vy){return{x,y,vx,vy,r:8};}

function build(){
  bricks=[];drops=[];
  cols=Math.max(6,Math.min(9,Math.floor(W/110)));
  rows=6;
  const pad=6,top=88,side=Math.max(18,W*0.06);
  bw=(W-side*2-pad*(cols-1))/cols;
  bh=Math.min(30,Math.max(18,H*0.04));
  palette=PALETTES[Math.floor(Math.random()*PALETTES.length)];
  const layoutFn=LAYOUTS[Math.floor(Math.random()*LAYOUTS.length)];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    if(!layoutFn(c,r,cols,rows))continue;
    bricks.push({x:side+c*(bw+pad),y:top+r*(bh+pad),w:bw,h:bh,
      color:palette[r%palette.length], drop:Math.random()<0.14});
  }
  leftEl.textContent='Blocks '+bricks.length;
  resetBalls();
}

function resetBalls(){
  balls=[newBall(W/2,paddle.y-14,(Math.random()-.5)*5,-9)];
  ballsEl.textContent='Balls 1';
}

function show(title,msg,btn){running=false;btitle.textContent=title;bmsg.textContent=msg;bbtn.textContent=btn;banner.style.display='flex';}
bbtn.onclick=()=>{banner.style.display='none';running=true;};

function move(e){const t=e.touches?e.touches[0]:e;paddle.x=Math.max(paddle.w/2,Math.min(W-paddle.w/2,t.clientX));}
addEventListener('mousemove',move);
addEventListener('touchmove',e=>{move(e);e.preventDefault();},{passive:false});

function splitBalls(){
  const extra=[];
  balls.forEach(b=>{
    const sp=Math.hypot(b.vx,b.vy)||6;
    const a=Math.atan2(b.vy,b.vx);
    extra.push(newBall(b.x,b.y,Math.cos(a+.5)*sp,Math.sin(a+.5)*sp));
    extra.push(newBall(b.x,b.y,Math.cos(a-.5)*sp,Math.sin(a-.5)*sp));
  });
  balls=balls.concat(extra).slice(0,12);
  ballsEl.textContent='Balls '+balls.length;
}

// Dark-blue woven backdrop (procedural, no local images)
function drawBackground(){
  ctx.fillStyle='#0a1040';ctx.fillRect(0,0,W,H);
  const s=46;
  ctx.save();ctx.globalAlpha=.5;
  for(let y=0;y<H+s;y+=s){
    for(let x=((y/s)%2)*-s;x<W+s;x+=s*2){
      ctx.fillStyle='#0d1550';
      ctx.beginPath();
      ctx.moveTo(x,y);ctx.lineTo(x+s,y+s*0.55);ctx.lineTo(x,y+s*1.1);ctx.lineTo(x-s,y+s*0.55);
      ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(30,50,130,.35)';ctx.lineWidth=1;ctx.stroke();
    }
  }
  ctx.restore();
  // framed play border
  ctx.strokeStyle='rgba(90,120,220,.55)';ctx.lineWidth=6;
  ctx.strokeRect(3,3,W-6,H-6);
}

function drawBrick(b){
  ctx.save();
  ctx.shadowColor=b.color;ctx.shadowBlur=8;
  ctx.fillStyle=b.color;ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.shadowBlur=0;
  // glossy top highlight
  const g=ctx.createLinearGradient(0,b.y,0,b.y+b.h);
  g.addColorStop(0,'rgba(255,255,255,.45)');
  g.addColorStop(.4,'rgba(255,255,255,.08)');
  g.addColorStop(1,'rgba(0,0,0,.35)');
  ctx.fillStyle=g;ctx.fillRect(b.x,b.y,b.w,b.h);
  ctx.strokeStyle=b.drop?'#ffe066':'rgba(0,0,0,.7)';
  ctx.lineWidth=b.drop?3:2;
  ctx.strokeRect(b.x,b.y,b.w,b.h);
  ctx.restore();
}

function drawPaddle(){
  const x=paddle.x-paddle.w/2,y=paddle.y;
  // red end caps
  ctx.fillStyle='#e03a1f';
  ctx.beginPath();ctx.roundRect(x,y,18,paddle.h,5);ctx.fill();
  ctx.beginPath();ctx.roundRect(x+paddle.w-18,y,18,paddle.h,5);ctx.fill();
  // metallic silver middle
  const g=ctx.createLinearGradient(0,y,0,y+paddle.h);
  g.addColorStop(0,'#e8ecf4');g.addColorStop(.45,'#9aa4b8');g.addColorStop(1,'#5b6474');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.roundRect(x+14,y,paddle.w-28,paddle.h,4);ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(x,y,paddle.w,paddle.h,5);ctx.stroke();
}

function drawBall(b){
  ctx.save();
  ctx.shadowColor='#22d3ee';ctx.shadowBlur=14;
  ctx.fillStyle='#7ff3ff';
  ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.beginPath();ctx.arc(b.x-b.r*.3,b.y-b.r*.3,b.r*.4,0,7);ctx.fill();
  ctx.restore();
}

function loop(){
  requestAnimationFrame(loop);
  drawBackground();

  bricks.forEach(drawBrick);
  drawPaddle();

  // drops
  for(let i=drops.length-1;i>=0;i--){
    const d=drops[i];
    if(running)d.y+=3;
    ctx.save();ctx.shadowColor='#ffe066';ctx.shadowBlur=12;
    ctx.fillStyle='#ffe066';ctx.beginPath();ctx.arc(d.x,d.y,9,0,7);ctx.fill();ctx.restore();
    ctx.fillStyle='#04060f';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('+',d.x,d.y+4);
    if(d.y>paddle.y&&d.y<paddle.y+40&&Math.abs(d.x-paddle.x)<paddle.w/2){drops.splice(i,1);splitBalls();continue;}
    if(d.y>H+20)drops.splice(i,1);
  }

  // balls
  for(let i=balls.length-1;i>=0;i--){
    const b=balls[i];
    if(!b)continue;
    if(running){
      b.x+=b.vx;b.y+=b.vy;
      if(b.x<b.r+6){b.x=b.r+6;b.vx*=-1;}
      if(b.x>W-b.r-6){b.x=W-b.r-6;b.vx*=-1;}
      if(b.y<b.r+6){b.y=b.r+6;b.vy*=-1;}
      if(b.y>paddle.y-b.r&&b.y<paddle.y+paddle.h&&Math.abs(b.x-paddle.x)<paddle.w/2+b.r&&b.vy>0){
        b.vy=-Math.abs(b.vy);
        b.vx+=(b.x-paddle.x)*0.06;
      }
      if(b.y>H+30){
        balls.splice(i,1);ballsEl.textContent='Balls '+balls.length;
        if(balls.length===0){score=0;round=0;scoreEl.textContent='Score 0';build();show('Missed!','All balls got past you.','Try again');}
        continue;
      }
      for(let k=0;k<bricks.length;k++){
        const br=bricks[k];
        if(b.x>br.x-b.r&&b.x<br.x+br.w+b.r&&b.y>br.y-b.r&&b.y<br.y+br.h+b.r){
          const ox=Math.min(Math.abs(b.x-br.x),Math.abs(b.x-(br.x+br.w)));
          const oy=Math.min(Math.abs(b.y-br.y),Math.abs(b.y-(br.y+br.h)));
          if(ox<oy)b.vx*=-1;else b.vy*=-1;
          if(br.drop)drops.push({x:br.x+br.w/2,y:br.y+br.h/2});
          bricks.splice(k,1);
          score+=15;scoreEl.textContent='Score '+score;
          leftEl.textContent='Blocks '+bricks.length;
          if(bricks.length===0){round++;build();show('Cleared!','New colors and block pattern. Score '+score,'Next round');}
          break;
        }
      }
    } else if(banner.style.display!=='flex'){b.x=paddle.x;b.y=paddle.y-14;}
    drawBall(b);
  }
}
paddle.x=W/2;build();
show('Brick Breaker','Clear every block. Catch the glowing drops to split into multiple balls.','Start');
loop();
</script>`
let handler = async (m, { EliteProTech }) => {
    try {
        await sendRichHtml(EliteProTech, m.chat, { id: 'elite-breakout', title: 'ELITE-PRO-V2 • BREAKOUT', html, source: 'eliteprotech' })
    } catch (error) {
        await m.reply(`Unable to send Breakout: ${error.message || String(error)}`)
    }
}

handler.command = ['breakout']

export default handler
