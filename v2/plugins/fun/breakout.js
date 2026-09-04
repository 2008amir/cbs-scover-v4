import { sendRichHtml } from '../../lib/richhtml.js'

const html = `<style>*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}body{margin:0;background:#07070f;color:#fff;font-family:Arial}.card{max-width:620px;margin:auto;padding:22px;border-radius:22px;background:radial-gradient(circle at top right,#3a2a63,#151228 62%,#07070f);border:1px solid #7059b5;box-shadow:0 14px 38px #0009;min-height:518px}.head{display:flex;justify-content:space-between;align-items:center}.small{font-size:10px;letter-spacing:2px;color:#c3b6dd}h2{margin:4px 0 0;font-size:24px}b{color:#ffd85e}canvas{margin-top:14px;width:100%;border-radius:14px;background:#05040c;border:1px solid #4c3f87;touch-action:none}.pad{display:flex;gap:10px;justify-content:center;margin-top:14px}.pad button{flex:1;max-width:170px;height:48px;border:0;border-radius:13px;background:#ffffff18;color:#fff;font-size:18px;font-weight:bold}.pad button:active{background:#8c79e5}.hint{text-align:center;color:#c3b6dd;font-size:12px;margin-top:10px}</style><div class="card"><div class="head"><div><div class="small">ELITE-PRO-V2 GAME</div><h2>Breakout</h2></div><b id="score">0</b></div><canvas id="g" width="672" height="518"></canvas><div class="pad"><button data-a="l">◀</button><button data-a="r">▶</button></div><div class="hint">Drag on the board or use the pad · clear every brick</div></div><script>
const c=document.getElementById('g'),x=c.getContext('2d'),sc=document.getElementById('score');
const COLS=9,ROWS=5,BW=(c.width-40)/COLS,BH=26,HUES=['#ff6b6b','#ffa74f','#ffd85e','#69f0b4','#7cd6ff'];
let pad,ball,bricks,score,lives,over,win,dirx=0,last=0;
function reset(){pad={x:c.width/2-60,w:120,h:14};ball={x:c.width/2,y:c.height-70,vx:4,vy:-4.6,r:8};score=0;lives=3;over=false;win=false;
 bricks=[];for(let r=0;r<ROWS;r++)for(let i=0;i<COLS;i++)bricks.push({x:20+i*BW,y:44+r*(BH+8),w:BW-8,h:BH,a:true,col:HUES[r]});sc.textContent='0'}
function loseLife(){lives--;if(lives<=0){over=true;return}ball={x:c.width/2,y:c.height-70,vx:4,vy:-4.6,r:8}}
function step(dt){if(over||win)return;
 pad.x=Math.max(4,Math.min(c.width-pad.w-4,pad.x+dirx*8*dt));
 ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
 if(ball.x<ball.r||ball.x>c.width-ball.r)ball.vx*=-1;
 if(ball.y<ball.r)ball.vy*=-1;
 if(ball.y>c.height-ball.r)return loseLife();
 const py=c.height-34;
 if(ball.y+ball.r>py&&ball.y<py+pad.h&&ball.x>pad.x&&ball.x<pad.x+pad.w&&ball.vy>0){
  const hit=(ball.x-(pad.x+pad.w/2))/(pad.w/2);ball.vy=-Math.abs(ball.vy);ball.vx=hit*5.6}
 for(const b of bricks){if(!b.a)continue;
  if(ball.x>b.x-ball.r&&ball.x<b.x+b.w+ball.r&&ball.y>b.y-ball.r&&ball.y<b.y+b.h+ball.r){
   b.a=false;score+=20;sc.textContent=score;
   const ox=Math.min(Math.abs(ball.x-b.x),Math.abs(ball.x-(b.x+b.w))),oy=Math.min(Math.abs(ball.y-b.y),Math.abs(ball.y-(b.y+b.h)));
   if(ox<oy)ball.vx*=-1;else ball.vy*=-1;break}}
 if(!bricks.some(b=>b.a))win=true}
function draw(){x.clearRect(0,0,c.width,c.height);
 bricks.forEach(b=>{if(!b.a)return;x.fillStyle=b.col;x.fillRect(b.x,b.y,b.w,b.h);x.fillStyle='#ffffff22';x.fillRect(b.x,b.y,b.w,4)});
 x.fillStyle='#e8e2ff';x.fillRect(pad.x,c.height-34,pad.w,pad.h);
 x.beginPath();x.arc(ball.x,ball.y,ball.r,0,7);x.fillStyle='#ffd85e';x.fill();
 x.font='14px Arial';x.fillStyle='#c3b6dd';x.fillText('LIVES '+Math.max(0,lives),12,22);
 if(over||win){x.fillStyle='#000c';x.fillRect(0,c.height/2-60,c.width,120);x.fillStyle='#fff';x.textAlign='center';x.font='bold 34px Arial';x.fillText(win?'YOU CLEARED IT!':'GAME OVER',c.width/2,c.height/2);x.font='16px Arial';x.fillText('Tap to play again',c.width/2,c.height/2+30);x.textAlign='left'}}
function loop(t){const dt=Math.min((t-last||16)/16,3);last=t;step(dt);draw();requestAnimationFrame(loop)}
document.querySelectorAll('[data-a]').forEach(b=>{const a=b.dataset.a;
 const on=e=>{e.preventDefault();dirx=a==='l'?-1:1};const off=()=>dirx=0;
 b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off)});
c.addEventListener('pointerdown',e=>{if(over||win)return reset();const r=c.getBoundingClientRect();pad.x=(e.clientX-r.left)/r.width*c.width-pad.w/2});
c.addEventListener('pointermove',e=>{if(!e.buttons)return;const r=c.getBoundingClientRect();pad.x=(e.clientX-r.left)/r.width*c.width-pad.w/2});
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')dirx=-1;if(e.key==='ArrowRight')dirx=1});
document.addEventListener('keyup',()=>dirx=0);
reset();requestAnimationFrame(loop)
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
