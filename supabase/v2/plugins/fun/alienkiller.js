import { sendRichHtml } from '../../lib/richhtml.js'

const html = `<style>*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}body{margin:0;background:#05060f;color:#fff;font-family:Arial}.card{max-width:620px;margin:auto;padding:22px;border-radius:22px;background:radial-gradient(circle at top right,#1f3a5e,#101324 62%,#05060f);border:1px solid #4f7fb5;box-shadow:0 14px 38px #0009;min-height:518px}.head{display:flex;justify-content:space-between;align-items:center}.small{font-size:10px;letter-spacing:2px;color:#a9c6dd}h2{margin:4px 0 0;font-size:24px}b{color:#69f0b4}canvas{margin-top:14px;width:100%;border-radius:14px;background:#03040a;border:1px solid #2f5687;touch-action:none}.pad{display:flex;gap:10px;justify-content:center;margin-top:14px}.pad button{flex:1;max-width:150px;height:48px;border:0;border-radius:13px;background:#ffffff18;color:#fff;font-size:16px;font-weight:bold}.pad button:active{background:#2ea4ff}.hint{text-align:center;color:#a9c6dd;font-size:12px;margin-top:10px}</style><div class="card"><div class="head"><div><div class="small">ELITE-PRO-V2 GAME</div><h2>Alien Killer</h2></div><b id="score">0</b></div><canvas id="g" width="672" height="518"></canvas><div class="pad"><button data-a="l">◀</button><button data-a="f">FIRE</button><button data-a="r">▶</button></div><div class="hint">Drag on the screen to move · FIRE or Space to shoot</div></div><script>
const c=document.getElementById('g'),x=c.getContext('2d'),sc=document.getElementById('score');
let ship,aliens,bullets,bombs,score,lives,over,win,dirx=0,dir=1,speed=0.5,last=0,cool=0;
function reset(){ship={x:c.width/2-24,w:48,h:20};aliens=[];bullets=[];bombs=[];score=0;lives=3;over=false;win=false;dir=1;speed=.5;
 for(let r=0;r<4;r++)for(let i=0;i<9;i++)aliens.push({x:60+i*62,y:50+r*54,w:38,h:26,a:true});sc.textContent='0'}
function fire(){if(over||win||cool>0)return;bullets.push({x:ship.x+ship.w/2-2,y:c.height-46});cool=14}
function step(dt){if(over||win)return;cool-=dt;
 ship.x=Math.max(4,Math.min(c.width-ship.w-4,ship.x+dirx*7*dt));
 bullets.forEach(b=>b.y-=9*dt);bullets=bullets.filter(b=>b.y>-12);
 bombs.forEach(b=>b.y+=5*dt);bombs=bombs.filter(b=>b.y<c.height+12);
 let live=aliens.filter(a=>a.a),edge=false;
 live.forEach(a=>{a.x+=dir*speed*dt*2;if(a.x<6||a.x+a.w>c.width-6)edge=true});
 if(edge){dir*=-1;live.forEach(a=>a.y+=16)}
 if(Math.random()<0.02*dt&&live.length){const a=live[Math.floor(Math.random()*live.length)];bombs.push({x:a.x+a.w/2-2,y:a.y+a.h})}
 for(const b of bullets)for(const a of live)if(b.x>a.x&&b.x<a.x+a.w&&b.y>a.y&&b.y<a.y+a.h){a.a=false;b.y=-99;score+=25;sc.textContent=score}
 for(const b of bombs)if(b.x>ship.x&&b.x<ship.x+ship.w&&b.y>c.height-40){b.y=9999;lives--;if(lives<=0)over=true}
 live=aliens.filter(a=>a.a);
 if(!live.length)win=true;
 if(live.some(a=>a.y+a.h>c.height-42))over=true;
 speed=.5+(36-live.length)*0.05}
function draw(){x.clearRect(0,0,c.width,c.height);
 x.fillStyle='#1b2c4a';for(let i=0;i<40;i++)x.fillRect((i*97)%c.width,(i*61)%c.height,2,2);
 x.fillStyle='#69f0b4';x.fillRect(ship.x,c.height-40,ship.w,ship.h);x.fillRect(ship.x+ship.w/2-4,c.height-50,8,10);
 x.fillStyle='#ff7bd1';aliens.forEach(a=>{if(!a.a)return;x.fillRect(a.x,a.y,a.w,a.h);x.fillStyle='#03040a';x.fillRect(a.x+8,a.y+8,6,6);x.fillRect(a.x+a.w-14,a.y+8,6,6);x.fillStyle='#ff7bd1'});
 x.fillStyle='#fff';bullets.forEach(b=>x.fillRect(b.x,b.y,4,12));
 x.fillStyle='#ffd85e';bombs.forEach(b=>x.fillRect(b.x,b.y,4,12));
 x.font='14px Arial';x.fillStyle='#a9c6dd';x.fillText('LIVES '+Math.max(0,lives),12,20);
 if(over||win){x.fillStyle='#000c';x.fillRect(0,c.height/2-60,c.width,120);x.fillStyle='#fff';x.textAlign='center';x.font='bold 34px Arial';x.fillText(win?'EARTH IS SAFE!':'GAME OVER',c.width/2,c.height/2);x.font='16px Arial';x.fillText('Tap to play again',c.width/2,c.height/2+30);x.textAlign='left'}}
function loop(t){const dt=Math.min((t-last||16)/16,3);last=t;step(dt);draw();requestAnimationFrame(loop)}
document.querySelectorAll('[data-a]').forEach(b=>{const a=b.dataset.a;
 const on=e=>{e.preventDefault();if(a==='f')fire();else dirx=a==='l'?-1:1};
 const off=()=>{if(a!=='f')dirx=0};
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off)});
c.addEventListener('pointerdown',e=>{if(over||win)return reset();const r=c.getBoundingClientRect();ship.x=(e.clientX-r.left)/r.width*c.width-ship.w/2;fire()});
c.addEventListener('pointermove',e=>{if(!e.buttons)return;const r=c.getBoundingClientRect();ship.x=(e.clientX-r.left)/r.width*c.width-ship.w/2});
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')dirx=-1;if(e.key==='ArrowRight')dirx=1;if(e.key===' '){e.preventDefault();fire()}});
document.addEventListener('keyup',()=>dirx=0);
reset();requestAnimationFrame(loop)
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
