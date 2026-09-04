import { sendRichHtml } from '../../lib/richhtml.js'

const html = `<style>*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none}body{margin:0;background:#08080f;color:#fff;font-family:Arial}.card{max-width:620px;margin:auto;padding:22px;border-radius:22px;background:radial-gradient(circle at top right,#2b2a5e,#141327 62%,#08080f);border:1px solid #6a5fb5;box-shadow:0 14px 38px #0009;min-height:518px}.head{display:flex;justify-content:space-between;align-items:center}.small{font-size:10px;letter-spacing:2px;color:#bbb2dd}h2{margin:4px 0 0;font-size:24px}b{color:#ffd85e}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.cell{aspect-ratio:1;border:1px solid #4a4287;border-radius:16px;background:#0c0b18;display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:900;color:#fff}.cell.x{color:#7cd6ff}.cell.o{color:#ff8ad1}.cell:active{background:#221f3d}.status{text-align:center;margin-top:16px;font-size:17px;font-weight:700;color:#e6e1ff;min-height:24px}.row{display:flex;gap:10px;justify-content:center;margin-top:14px;flex-wrap:wrap}.btn{border:0;border-radius:13px;padding:12px 18px;font-size:14px;font-weight:700;color:#fff;background:linear-gradient(180deg,#5b4cd8,#4537b8)}.btn.sec{background:#332a6b}.btn:active{transform:scale(.96)}.hint{text-align:center;color:#bdb7d8;font-size:12px;margin-top:12px}</style><div class="card"><div class="head"><div><div class="small">ELITE-PRO-V2 GAME</div><h2>Tic Tac Toe</h2></div><b id="score">0 - 0</b></div><div class="grid" id="grid"></div><div class="status" id="status">Your turn (X)</div><div class="row"><button class="btn" id="new">New Game</button><button class="btn sec" id="mode">Mode: 1 Player</button></div><div class="hint">You are X · beat the bot or switch to 2 players</div></div><script>
const G=document.getElementById('grid'),S=document.getElementById('status'),SC=document.getElementById('score');
let b,turn,over,two=false,win=0,loss=0;
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function reset(){b=Array(9).fill('');turn='X';over=false;paint();S.textContent=two?'Turn: X':'Your turn (X)'}
function winner(s){for(const[a,c,d]of LINES)if(s[a]&&s[a]===s[c]&&s[a]===s[d])return s[a];return s.includes('')?null:'D'}
function paint(){G.innerHTML='';b.forEach((v,i)=>{const el=document.createElement('div');el.className='cell '+v.toLowerCase();el.textContent=v;el.onclick=()=>tap(i);G.appendChild(el)})}
function best(s,me){const w=winner(s);if(w===me)return{sc:1};if(w&&w!=='D')return{sc:-1};if(w==='D')return{sc:0};
 let out={sc:-2,i:-1};const other=me==='X'?'O':'X';
 s.forEach((v,i)=>{if(v)return;const n=[...s];n[i]=me;const r=-best(n,other).sc;if(r>out.sc)out={sc:r,i}});return out}
function tap(i){if(over||b[i])return;b[i]=turn;turn=turn==='X'?'O':'X';paint();check();
 if(!over&&!two&&turn==='O'){const m=best(b,'O').i;if(m>-1){b[m]='O';turn='X';paint();check()}}
 if(!over)S.textContent=two?'Turn: '+turn:(turn==='X'?'Your turn (X)':'Bot thinking...')}
function check(){const w=winner(b);if(!w)return;over=true;
 if(w==='D')S.textContent="It's a draw!";
 else{S.textContent=w+' wins!';if(!two){w==='X'?win++:loss++;SC.textContent=win+' - '+loss}else if(w==='X')win++,SC.textContent=win+' - '+loss}}
document.getElementById('new').onclick=reset;
document.getElementById('mode').onclick=e=>{two=!two;e.target.textContent='Mode: '+(two?'2 Players':'1 Player');reset()};
reset()
</script>`

let handler = async (m, { EliteProTech }) => {
    try {
        await sendRichHtml(EliteProTech, m.chat, { id: 'elite-tictactoe', title: 'ELITE-PRO-V2 • TIC TAC TOE', html, source: 'eliteprotech' })
    } catch (error) {
        await m.reply(`Unable to send Tic Tac Toe: ${error.message || String(error)}`)
    }
}

handler.command = ['tictactoe', 'ttt']

export default handler
