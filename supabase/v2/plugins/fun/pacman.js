import { sendRichHtml } from '../../lib/richhtml.js'

const html = `<style>*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}body{margin:0;background:#08080f;color:#fff;font-family:Arial}.card{max-width:620px;margin:auto;padding:22px;border-radius:22px;background:radial-gradient(circle at top right,#2b2a5e,#141327 62%,#08080f);border:1px solid #6a5fb5;box-shadow:0 14px 38px #0009;min-height:518px}.head{display:flex;justify-content:space-between;align-items:center}.small{font-size:10px;letter-spacing:2px;color:#bbb2dd}h2{margin:4px 0 0;font-size:24px}b{color:#ffd85e}canvas{margin-top:14px;width:100%;border-radius:14px;background:#05050b;border:1px solid #4a4287}.pad{display:grid;grid-template-columns:repeat(3,60px);gap:8px;justify-content:center;margin-top:14px}.pad button{height:46px;border:0;border-radius:12px;background:#ffffff18;color:#fff;font-size:18px;font-weight:bold}.pad button:active{background:#8c79e5}.hint{text-align:center;color:#bdb7d8;font-size:12px;margin-top:10px}</style><div class="card"><div class="head"><div><div class="small">ELITE-PRO-V2 GAME</div><h2>Pac-Man</h2></div><b id="score">0</b></div><canvas id="g" width="672" height="672"></canvas><div class="pad"><span></span><button data-d="u">▲</button><span></span><button data-d="l">◀</button><button data-d="d">▼</button><button data-d="r">▶</button></div><div class="hint">Use the pad or arrow keys · eat every pellet to win</div></div><script>
const MAP=["###################","#........#........#","#o##.###.#.###.##o#","#.................#","#.##.#.#####.#.##.#","#....#...#...#....#","####.###.#.###.####","#......#...#......#","#.####.#####.####.#","#.#.............#.#","#.#.##.#####.##.#.#","#......#   #......#","#.####.#####.####.#","#........#........#","#o##.###.#.###.##o#","#..#.....#.....#..#","##.#.###.#.###.#.##","#........#........#","###################"];
const R=MAP.length,C=MAP[0].length,c=document.getElementById('g'),x=c.getContext('2d'),sc=document.getElementById('score');
const T=Math.floor(c.width/C);let grid,p,ghosts,score,dir,next,over,win,t=0;
function reset(){grid=MAP.map(r=>r.split(''));score=0;over=false;win=false;dir={x:0,y:0};next={x:0,y:0};p={r:13,c:9};ghosts=[{r:9,c:9,dx:1,dy:0,col:'#ff5f5f'},{r:11,c:9,dx:-1,dy:0,col:'#7cd6ff'},{r:9,c:8,dx:0,dy:1,col:'#ffb2e6'}];sc.textContent='0'}
function open(r,cc){return grid[r]&&grid[r][cc]&&grid[r][cc]!=='#'}
function step(){if(over||win)return;
 if(open(p.r+next.y,p.c+next.x))dir={...next};
 if(open(p.r+dir.y,p.c+dir.x)){p.r+=dir.y;p.c+=dir.x}
 const cell=grid[p.r][p.c];if(cell==='.'||cell==='o'){score+=cell==='o'?50:10;grid[p.r][p.c]=' ';sc.textContent=score}
 if(!grid.some(r=>r.includes('.')||r.includes('o')))win=true;
 for(const g of ghosts){const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>open(g.r+dy,g.c+dx));
  if(!opts.length)continue;
  let pick=opts.find(([dx,dy])=>dx===g.dx&&dy===g.dy);
  if(!pick||Math.random()<0.3)pick=opts[Math.floor(Math.random()*opts.length)];
  g.dx=pick[0];g.dy=pick[1];g.r+=g.dy;g.c+=g.dx;
  if(g.r===p.r&&g.c===p.c)over=true}
}
function draw(){x.clearRect(0,0,c.width,c.height);
 for(let r=0;r<R;r++)for(let cc=0;cc<C;cc++){const v=grid[r][cc];const px=cc*T,py=r*T;
  if(v==='#'){x.fillStyle='#3b47c9';x.fillRect(px+1,py+1,T-2,T-2)}
  else if(v==='.'){x.fillStyle='#ffe9a8';x.beginPath();x.arc(px+T/2,py+T/2,2.5,0,7);x.fill()}
  else if(v==='o'){x.fillStyle='#ffd85e';x.beginPath();x.arc(px+T/2,py+T/2,6,0,7);x.fill()}}
 x.fillStyle='#ffd85e';x.beginPath();x.arc(p.c*T+T/2,p.r*T+T/2,T/2-2,.35+t,6.28-.35+t);x.lineTo(p.c*T+T/2,p.r*T+T/2);x.fill();
 for(const g of ghosts){x.fillStyle=g.col;x.beginPath();x.arc(g.c*T+T/2,g.r*T+T/2,T/2-2,Math.PI,0);x.rect(g.c*T+2,g.r*T+T/2,T-4,T/2-2);x.fill()}
 if(over||win){x.fillStyle='#000c';x.fillRect(0,c.height/2-60,c.width,120);x.fillStyle='#fff';x.textAlign='center';x.font='bold 34px Arial';x.fillText(win?'YOU WIN!':'GAME OVER',c.width/2,c.height/2);x.font='16px Arial';x.fillText('Tap to play again',c.width/2,c.height/2+30);x.textAlign='left'}}
let acc=0,last=0;function loop(ts){const d=ts-last;last=ts;acc+=d;if(acc>170){acc=0;t=t?0:.25;step()}draw();requestAnimationFrame(loop)}
document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const d=b.dataset.d;next={x:d==='l'?-1:d==='r'?1:0,y:d==='u'?-1:d==='d'?1:0}});
document.addEventListener('keydown',e=>{const k={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(k){e.preventDefault();next={x:k[0],y:k[1]}}});
c.addEventListener('pointerdown',()=>{if(over||win)reset()});
reset();requestAnimationFrame(loop)
</script>`

let handler = async (m, { EliteProTech }) => {
    try {
        await sendRichHtml(EliteProTech, m.chat, { id: 'elite-pacman', title: 'ELITE-PRO-V2 • PAC-MAN', html, source: 'eliteprotech' })
    } catch (error) {
        await m.reply(`Unable to send Pac-Man: ${error.message || String(error)}`)
    }
}

handler.command = ['pacman']

export default handler
