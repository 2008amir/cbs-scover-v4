import { sendRichHtml } from '../../lib/richhtml.js'

const html = `
<style>
*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
  user-select:none
}

body{
  margin:0;
  background:#0d0c16;
  color:#fff;
  font-family:Arial;
  overflow-x:hidden
}

.card{
  max-width:620px;
  margin:70px auto 40px;
  padding:22px;
  border-radius:22px;
  background:radial-gradient(circle at top right,#51458f,#171424 56%,#0d0c16);
  border:1px solid #7566c5;
  box-shadow:0 14px 38px #0009;
  min-height:400px;
  position:relative;
  z-index:2
}

.head{
  display:flex;
  justify-content:space-between;
  align-items:center
}

.small{
  font-size:9px;
  letter-spacing:2px;
  color:#bbb2dd
}

.title{
  font-size:22px;
  font-weight:900;
  margin-top:4px
}

.oct{
  text-align:right
}

.oct b{
  font-size:22px;
  color:#d4cbff
}

/* PULL-OUT PIANO */
.piano-wrap{
  position:relative;
  width:calc(100% + 70px);
  margin-left:-35px;
  margin-top:25px;
  z-index:10;
}

.piano-tab{
  width:110px;
  height:22px;
  margin:auto;
  background:#51458f;
  border:1px solid #7566c5;
  border-bottom:0;
  border-radius:12px 12px 0 0;
  text-align:center;
  font-size:8px;
  font-weight:bold;
  letter-spacing:1px;
  color:#d9d2ff;
  padding-top:6px;
}

.keys{
  position:relative;
  display:flex;
  height:259px;
  padding:8px;
  background:#09090e;
  border:1px solid #635793;
  border-radius:16px;
  box-shadow:
    0 18px 35px #000b,
    inset 0 2px 12px #000;
  touch-action:none;
  transform:translateY(0);
  transition:transform .18s ease
}

.piano-wrap:active .keys{
  transform:translateY(3px)
}

.white{
  flex:1;
  margin:0 2px;
  border:0;
  border-radius:0 0 10px 10px;
  background:linear-gradient(#fff,#cbc9d7);
  color:#3a354b;
  font-weight:bold;
  padding-top:140px;
  box-shadow:inset 0 -7px 10px #0002;
  touch-action:none
}

.black{
  position:absolute;
  top:8px;
  width:10%;
  height:108px;
  border:0;
  border-radius:0 0 8px 8px;
  background:linear-gradient(90deg,#050507,#454154,#08070b);
  color:#eee;
  z-index:2;
  touch-action:none
}

.black:active,
.white:active{
  transform:translateY(3px);
  background:#aa9aea
}

.b1{left:13%}
.b2{left:26.5%}
.b3{left:53.5%}
.b4{left:67%}
.b5{left:80.5%}

.controls{
  display:flex;
  gap:8px;
  margin-top:25px
}

.control{
  flex:1;
  border:0;
  padding:12px 4px;
  border-radius:11px;
  background:#6555b3;
  color:#fff;
  font-size:10px;
  font-weight:900;
  letter-spacing:1px;
  box-shadow:0 5px 12px #0005
}

.control:active{
  transform:scale(.96)
}

.note{
  text-align:center;
  margin-top:13px;
  padding:9px;
  border-radius:10px;
  background:#ffffff0d;
  color:#d9d2ff;
  font-size:14px;
  font-weight:bold
}

.hint{
  text-align:center;
  margin-top:10px;
  color:#aaa1ca;
  font-size:10px
}

/* MOBILE */
@media(max-width:560px){
  .card{
    margin-top:55px;
    padding:18px 12px 20px
  }

  .piano-wrap{
    width:calc(100% + 30px);
    margin-left:-15px
  }

  .keys{
    height:225px
  }

  .white{
    padding-top:120px;
    font-size:12px
  }

  .black{
    height:95px;
    font-size:10px
  }
}
</style>

<div class="card">

  <div class="head">
    <div>
      <div class="small">ELITE-PRO-V2 GAME</div>
      <div class="title">🎹 Piano</div>
    </div>

    <div class="oct">
      <div class="small">OCTAVE</div>
      <b id="octave">4</b>
    </div>
  </div>

  <!-- PULL-OUT PIANO -->
  <div class="piano-wrap">

    <div class="piano-tab">
      PULL-OUT PIANO
    </div>

    <div class="keys" id="keys">

      <button class="white" data-n="C">C</button>
      <button class="white" data-n="D">D</button>
      <button class="white" data-n="E">E</button>
      <button class="white" data-n="F">F</button>
      <button class="white" data-n="G">G</button>
      <button class="white" data-n="A">A</button>
      <button class="white" data-n="B">B</button>

      <button class="black b1" data-n="C#">C#</button>
      <button class="black b2" data-n="D#">D#</button>
      <button class="black b3" data-n="F#">F#</button>
      <button class="black b4" data-n="G#">G#</button>
      <button class="black b5" data-n="A#">A#</button>

    </div>
  </div>

  <div class="controls">
    <button class="control" id="down">− OCTAVE</button>
    <button class="control" id="center">CENTER</button>
    <button class="control" id="up">+ OCTAVE</button>
  </div>

  <div class="note" id="note">
    TAP A KEY
  </div>

  <div class="hint">
    Keyboard: A S D F G H J · W E T Y U
  </div>

</div>

<script>

const notes={
  C:0,
  'C#':1,
  D:2,
  'D#':3,
  E:4,
  F:5,
  'F#':6,
  G:7,
  'G#':8,
  A:9,
  'A#':10,
  B:11
};

const keys={
  a:'C',
  s:'D',
  d:'E',
  f:'F',
  g:'G',
  h:'A',
  j:'B',
  w:'C#',
  e:'D#',
  t:'F#',
  y:'G#',
  u:'A#'
};

let ctx;
let octave=4;

const label=document.getElementById('octave');
const note=document.getElementById('note');

function play(n){

  ctx=ctx ||
    new(window.AudioContext||window.webkitAudioContext)();

  if(ctx.state==='suspended'){
    ctx.resume();
  }

  const o=ctx.createOscillator();
  const g=ctx.createGain();

  const f=
    440*Math.pow(
      2,
      (notes[n]+((octave+1)*12)-69)/12
    );

  o.type='triangle';
  o.frequency.value=f;

  const now=ctx.currentTime;

  g.gain.setValueAtTime(.0001,now);

  g.gain.exponentialRampToValueAtTime(
    .3,
    now+.02
  );

  g.gain.exponentialRampToValueAtTime(
    .0001,
    now+.7
  );

  o.connect(g);
  g.connect(ctx.destination);

  o.start(now);
  o.stop(now+.72);

  note.textContent='PLAYING '+n+octave;

  /*
   * Key animation
   */
  const key=
    document.querySelector(
      '[data-n="'+n+'"]'
    );

  if(key){

    key.style.transform='translateY(3px)';

    setTimeout(()=>{
      key.style.transform='';
    },120);
  }

  if(navigator.vibrate){
    navigator.vibrate(6);
  }
}

function setOctave(n){

  octave=Math.max(
    1,
    Math.min(7,n)
  );

  label.textContent=octave;

  note.textContent=
    'OCTAVE '+octave;
}

/*
 * Mouse + touch + pen
 */
document
  .querySelectorAll('[data-n]')
  .forEach(k=>{

    k.addEventListener(
      'pointerdown',
      e=>{
        e.preventDefault();
        play(k.dataset.n);
      }
    );

  });

/*
 * Octave controls
 */
document.getElementById('down').onclick=
  ()=>setOctave(octave-1);

document.getElementById('up').onclick=
  ()=>setOctave(octave+1);

document.getElementById('center').onclick=
  ()=>setOctave(4);

/*
 * Computer keyboard
 */
document.addEventListener(
  'keydown',
  e=>{

    if(e.repeat) return;

    const k=e.key.toLowerCase();

    if(k==='z'){
      setOctave(octave-1);
      return;
    }

    if(k==='x'){
      setOctave(octave+1);
      return;
    }

    if(keys[k]){
      play(keys[k]);
    }

  }
);

</script>
`;
let handler = async (m, { EliteProTech }) => {
    try {
        await sendRichHtml(EliteProTech, m.chat, { id: 'elite-piano', title: 'ELITE-PRO-V2 • PIANO', html, source: 'eliteprotech' })
    } catch (error) {
        await m.reply(`Unable to send Piano: ${error.message || String(error)}`)
    }
}

handler.command = ['piano']

export default handler
