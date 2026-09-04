import { sendRichHtml } from '../../lib/richhtml.js'

const html = `<style>*{margin:0;padding:0;box-sizing:border-box}
  body{overflow:hidden;background:#04060f;font-family:"Trebuchet MS",sans-serif;color:#eaf2ff}
  canvas{display:block;touch-action:none}
  .hud{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;
       padding:14px 18px;font-size:16px;letter-spacing:1px;pointer-events:none;text-shadow:0 2px 6px #000}
  .hud a{pointer-events:auto;color:#6ee7ff;text-decoration:none;border:1px solid #6ee7ff55;
         padding:4px 12px;border-radius:999px;font-size:13px}
  .banner{position:fixed;inset:0;display:none;align-items:center;justify-content:center;
          flex-direction:column;gap:14px;background:rgba(4,6,15,.78);text-align:center;padding:20px}
  .banner h2{font-size:38px;letter-spacing:3px}
  .banner button{cursor:pointer;border:0;border-radius:999px;padding:12px 28px;font-size:15px;
      background:linear-gradient(90deg,#6ee7ff,#a78bfa);color:#04060f;font-weight:700}
  .tip{position:fixed;bottom:12px;width:100%;text-align:center;font-size:12px;opacity:.5}
</style>
<div class="hud"><span id="score">Score 0</span><span id="wave">Aliens left 0</span><a href="/home.html">Home</a></div>
<div class="banner" id="banner"><h2 id="btitle"></h2><p id="bmsg"></p><button id="bbtn">Play</button></div>
<div class="tip">Move mouse / drag to aim · click or tap to fire</div>
<canvas id="cv"></canvas>
<script>
const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let W=0,H=0;
function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
addEventListener('resize',resize);resize();

const scoreEl=document.getElementById('score'),waveEl=document.getElementById('wave');
const banner=document.getElementById('banner'),btitle=document.getElementById('btitle'),
      bmsg=document.getElementById('bmsg'),bbtn=document.getElementById('bbtn');

// remote skin images (no local files)
const imgCache={};
function skin(seed){
  if(!imgCache[seed]){
    const i=new Image(); i.crossOrigin='anonymous';
    i.src='https://picsum.photos/seed/'+seed+'/96/96';
    imgCache[seed]=i;
  }
  return imgCache[seed];
}

const stars=[];
for(let i=0;i<140;i++)stars.push({x:Math.random(),y:Math.random(),s:Math.random()*2+.4,v:Math.random()*.3+.05});

let aliens=[],bullets=[],score=0,round=0,running=false;
const ship={x:0,y:0,w:46,h:38};
let aimX=0,aimY=0;

function spawn(){
  aliens=[];bullets=[];
  const n=7+Math.floor(Math.random()*6);
  const s=skin('alien'+round+'-'+Math.floor(Math.random()*999));
  const hue=Math.floor(Math.random()*360);
  for(let i=0;i<n;i++){
    aliens.push({
      x:40+Math.random()*(W-80),
      y:-Math.random()*H*0.8-40,
      r:20+Math.random()*10,
      vx:(Math.random()-.5)*1.2,
      vy:.35+Math.random()*.45+round*.08,
      img:s,hue:hue+i*18,t:Math.random()*6
    });
  }
  waveEl.textContent='Aliens left '+aliens.length;
}

function show(title,msg,btn){running=false;btitle.textContent=title;bmsg.textContent=msg;bbtn.textContent=btn;banner.style.display='flex';}
bbtn.onclick=()=>{banner.style.display='none';running=true;};

function aim(e){const t=e.touches?e.touches[0]:e;aimX=t.clientX;aimY=t.clientY;}
addEventListener('mousemove',aim);
addEventListener('touchmove',e=>{aim(e);e.preventDefault();},{passive:false});
function fire(){
  if(!running)return;
  const dx=aimX-ship.x,dy=aimY-(H-70),d=Math.hypot(dx,dy)||1;
  bullets.push({x:ship.x,y:H-70,vx:dx/d*11,vy:dy/d*11});
}
addEventListener('mousedown',fire);
addEventListener('touchstart',e=>{aim(e);fire();},{passive:true});

function drawShip(x,y){
  ctx.save();ctx.translate(x,y);
  const a=Math.atan2(aimY-y,aimX-x)+Math.PI/2;
  ctx.rotate(Math.max(-.5,Math.min(.5,a)));
  ctx.fillStyle='#6ee7ff';
  ctx.beginPath();ctx.moveTo(0,-26);ctx.lineTo(20,18);ctx.lineTo(0,8);ctx.lineTo(-20,18);ctx.closePath();ctx.fill();
  ctx.fillStyle='#a78bfa';ctx.fillRect(-26,10,52,7);
  ctx.fillStyle='#ffe066';ctx.beginPath();ctx.arc(0,-4,5,0,7);ctx.fill();
  ctx.restore();
}

function drawAlien(a){
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.sin(a.t)*.3);
  ctx.beginPath();ctx.arc(0,0,a.r,0,7);ctx.closePath();ctx.save();ctx.clip();
  if(a.img.complete&&a.img.naturalWidth)ctx.drawImage(a.img,-a.r,-a.r,a.r*2,a.r*2);
  else{ctx.fillStyle='hsl('+a.hue+',70%,55%)';ctx.fillRect(-a.r,-a.r,a.r*2,a.r*2);}
  ctx.restore();
  ctx.globalAlpha=.45;ctx.fillStyle='hsl('+a.hue+',80%,50%)';ctx.fill();ctx.globalAlpha=1;
  ctx.lineWidth=3;ctx.strokeStyle='hsl('+a.hue+',90%,70%)';ctx.stroke();
  ctx.fillStyle='#04060f';
  ctx.beginPath();ctx.arc(-a.r*.32,-a.r*.1,a.r*.17,0,7);ctx.arc(a.r*.32,-a.r*.1,a.r*.17,0,7);ctx.fill();
  ctx.restore();
}

function loop(){
  requestAnimationFrame(loop);
  ctx.fillStyle='#04060f';ctx.fillRect(0,0,W,H);
  stars.forEach(s=>{
    s.y+=s.v/H*60/60;if(s.y>1)s.y=0;
    ctx.fillStyle='rgba(158,203,255,.8)';ctx.fillRect(s.x*W,s.y*H,s.s,s.s);
  });

  ship.x+=((aimX||W/2)-ship.x)*.12;
  ship.x=Math.max(30,Math.min(W-30,ship.x));
  drawShip(ship.x,H-70);

  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.x+=b.vx;b.y+=b.vy;
    if(b.x<-20||b.x>W+20||b.y<-20||b.y>H+20){bullets.splice(i,1);continue;}
    ctx.fillStyle='#ffe066';ctx.beginPath();ctx.arc(b.x,b.y,4,0,7);ctx.fill();
  }

  for(let i=aliens.length-1;i>=0;i--){
    const a=aliens[i];
    if(running){
      a.t+=.05;a.x+=a.vx;a.y+=a.vy;
      if(a.x<a.r||a.x>W-a.r)a.vx*=-1;
      if(a.y>H-40){show('Overrun!','The aliens got through. Score '+score,'Try again');score=0;round=0;scoreEl.textContent='Score 0';spawn();break;}
    }
    drawAlien(a);
    for(let j=bullets.length-1;j>=0;j--){
      const b=bullets[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)<a.r+4){
        aliens.splice(i,1);bullets.splice(j,1);
        score+=10;scoreEl.textContent='Score '+score;
        waveEl.textContent='Aliens left '+aliens.length;
        if(aliens.length===0){round++;spawn();show('Wave cleared!','New alien skins incoming. Score '+score,'Next wave');}
        break;
      }
    }
  }
}
spawn();ship.x=W/2;aimX=W/2;aimY=H/2;
show('Alien Killer','Shoot every alien before they reach the bottom.','Start');
loop();
</script>`

let handler = async (m, { EliteProTech }) => {
    try {
        await sendRichHtml(EliteProTech, m.chat, { id: 'elite-alienkiller', title: 'ELITE-PRO-V2 • ALIEN KILLER', html, source: 'eliteprotech' })
    } catch (error) {
        await m.reply(`Unable to send Alien Killer: ${error.message || String(error)}`)
    }
}

handler.command = ['alienkiller']

export default handler
