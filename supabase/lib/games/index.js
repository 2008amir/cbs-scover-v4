/* =====================================================================
   LOCAL GAMES  —  .piano  and  .dino
   Both games are rendered locally (SVG -> PNG with sharp) and the piano
   sound is synthesised locally (PCM -> WAV -> Opus PTT with ffmpeg), so
   nothing depends on the remote handler host or any external API.
   ===================================================================== */
const fs = require('fs');
const path = require('path');

let sharp = null;
try { sharp = require('sharp'); } catch { sharp = null; }

const { toPTT } = require('../converter');
const web = require('./web');

const LIVE_RE = /^(play|live|link|open|start\s*live)$/i;

const DB_DIR = path.join(__dirname, '..', '..', 'database');
const STATE_FILE = path.join(DB_DIR, 'games.json');

/* ------------------------------- storage ------------------------------- */
function readState() {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {}; } catch { return {}; }
}
function writeState(state) {
    try {
        fs.mkdirSync(DB_DIR, { recursive: true });
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch {}
}
function chatState(chat) {
    const state = readState();
    state[chat] = state[chat] || {};
    return { state, chat: state[chat] };
}

/* ------------------------------ rendering ----------------------------- */
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
const KEY_LETTERS = ['A', 'S', 'D', 'F', 'G', 'H', 'J'];

function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pianoSvg(octave, playing) {
    const W = 620, H = 900;
    const boardX = 50, boardY = 150, boardW = 520, boardH = 330;
    const whiteW = boardW / 7;

    let keys = '';
    WHITE_KEYS.forEach((note, i) => {
        const x = boardX + i * whiteW;
        keys += `<rect x="${x}" y="${boardY}" width="${whiteW - 4}" height="${boardH}" rx="8" fill="#f7f7fb" stroke="#c9c9d6"/>`;
        keys += `<text x="${x + whiteW / 2 - 2}" y="${boardY + boardH - 22}" font-size="24" fill="#3a3a55" text-anchor="middle" font-family="sans-serif">${note}</text>`;
        keys += `<text x="${x + whiteW / 2 - 2}" y="${boardY + boardH + 34}" font-size="18" fill="#b9b6e8" text-anchor="middle" font-family="sans-serif">${KEY_LETTERS[i]}</text>`;
    });
    BLACK_KEYS.forEach((note, i) => {
        if (!note) return;
        const x = boardX + (i + 1) * whiteW - whiteW * 0.3;
        keys += `<rect x="${x}" y="${boardY}" width="${whiteW * 0.56}" height="${boardH * 0.62}" rx="6" fill="#15152a"/>`;
        keys += `<text x="${x + whiteW * 0.28}" y="${boardY + 60}" font-size="18" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${note}</text>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b2c8f"/><stop offset="100%" stop-color="#211a4d"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="34" fill="url(#bg)"/>
  <text x="40" y="56" font-size="20" letter-spacing="4" fill="#b9b6e8" font-family="sans-serif">CBS-SCOVER GAME</text>
  <text x="40" y="108" font-size="46" fill="#ffffff" font-family="sans-serif">Piano</text>
  <text x="${W - 40}" y="52" font-size="18" letter-spacing="3" fill="#b9b6e8" text-anchor="end" font-family="sans-serif">OCTAVE</text>
  <text x="${W - 40}" y="104" font-size="42" fill="#ffffff" text-anchor="end" font-family="sans-serif">${octave}</text>
  <rect x="30" y="${boardY - 30}" width="${W - 60}" height="${boardH + 100}" rx="20" fill="#2a2158"/>
  ${keys}
  <rect x="40" y="620" width="160" height="66" rx="20" fill="#5a4bd8"/>
  <text x="120" y="662" font-size="20" fill="#ffffff" text-anchor="middle" font-family="sans-serif">- OCTAVE</text>
  <rect x="230" y="620" width="160" height="66" rx="20" fill="#5a4bd8"/>
  <text x="310" y="662" font-size="20" fill="#ffffff" text-anchor="middle" font-family="sans-serif">CENTER</text>
  <rect x="420" y="620" width="160" height="66" rx="20" fill="#5a4bd8"/>
  <text x="500" y="662" font-size="20" fill="#ffffff" text-anchor="middle" font-family="sans-serif">+ OCTAVE</text>
  <rect x="40" y="716" width="540" height="80" rx="20" fill="#332a6b"/>
  <text x="310" y="766" font-size="26" fill="#ffffff" text-anchor="middle" font-family="sans-serif">${esc(playing || 'READY')}</text>
  <text x="310" y="850" font-size="18" fill="#b9b6e8" text-anchor="middle" font-family="sans-serif">Keyboard: A S D F G H J · W E T Y U</text>
</svg>`;
}

function dinoShape(x, baseY, over) {
    const body = over ? '#ff6b81' : '#a5f3fc';
    const top = baseY - 76;
    return `<g fill="${body}">` +
        `<rect x="${x}" y="${top + 26}" width="46" height="34" rx="14"/>` +
        `<rect x="${x + 34}" y="${top}" width="34" height="30" rx="12"/>` +
        `<rect x="${x + 58}" y="${top + 12}" width="16" height="10" rx="5"/>` +
        `<rect x="${x + 6}" y="${top + 54}" width="12" height="24" rx="6"/>` +
        `<rect x="${x + 28}" y="${top + 54}" width="12" height="24" rx="6"/>` +
        `<rect x="${x - 18}" y="${top + 30}" width="24" height="12" rx="6"/>` +
        `</g><circle cx="${x + 58}" cy="${top + 12}" r="3" fill="#101024"/>`;
}

function dinoSvg({ score, best, dinoY, obstacles, over }) {
    const W = 900, H = 420;
    const ground = 320;
    let items = '';
    for (const ob of obstacles) {
        if (ob.type === 'bird') {
            const y = ground - 150;
            items += `<g fill="#ffd166"><ellipse cx="${ob.x + 24}" cy="${y + 20}" rx="26" ry="12"/>` +
                `<polygon points="${ob.x + 10},${y + 16} ${ob.x + 34},${y - 12} ${ob.x + 40},${y + 18}"/>` +
                `<circle cx="${ob.x + 46}" cy="${y + 16}" r="9"/></g>`;
        } else {
            const h = 78;
            items += `<g fill="#4ade80"><rect x="${ob.x + 16}" y="${ground - h}" width="20" height="${h}" rx="9"/>` +
                `<rect x="${ob.x}" y="${ground - h + 22}" width="18" height="12" rx="6"/>` +
                `<rect x="${ob.x}" y="${ground - h + 22}" width="10" height="34" rx="5"/>` +
                `<rect x="${ob.x + 34}" y="${ground - h + 34}" width="18" height="12" rx="6"/>` +
                `<rect x="${ob.x + 44}" y="${ground - h + 10}" width="10" height="36" rx="5"/></g>`;
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2b2160"/><stop offset="100%" stop-color="#161031"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="26" fill="url(#sky)"/>
  <text x="40" y="52" font-size="18" letter-spacing="4" fill="#b9b6e8" font-family="sans-serif">CBS-SCOVER GAME</text>
  <text x="40" y="98" font-size="40" fill="#ffffff" font-family="sans-serif">Dino Run</text>
  <text x="${W - 40}" y="52" font-size="18" fill="#b9b6e8" text-anchor="end" font-family="sans-serif">HI ${best}</text>
  <text x="${W - 40}" y="96" font-size="36" fill="#ffffff" text-anchor="end" font-family="sans-serif">${score}</text>
  <line x1="30" y1="${ground + 8}" x2="${W - 30}" y2="${ground + 8}" stroke="#5a4bd8" stroke-width="5"/>
  ${dinoShape(90, ground - dinoY, over)}
  ${items}
  <text x="${W / 2}" y="${H - 24}" font-size="20" fill="${over ? '#ff9db1' : '#b9b6e8'}" text-anchor="middle" font-family="sans-serif">${over ? 'GAME OVER — send .dino to play again' : 'send: jump · duck · run'}</text>
</svg>`;
}

async function renderPng(svg) {
    if (!sharp) return null;
    try { return await sharp(Buffer.from(svg)).png().toBuffer(); } catch { return null; }
}

/* --------------------------- piano synthesis --------------------------- */
const SEMITONES = { C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11 };
const LETTER_TO_NOTE = { A: 'C', S: 'D', D: 'E', F: 'F', G: 'G', H: 'A', J: 'B', W: 'C#', E: 'D#', T: 'F#', Y: 'G#', U: 'A#' };

function parseNotes(text, octave) {
    const out = [];
    const tokens = String(text).toUpperCase().match(/[A-G](?:#|B)?[0-9]?|[SHJWETYU]|-|\s+/g) || [];
    for (const raw of tokens) {
        const token = raw.trim();
        if (!token) continue;
        if (token === '-') { out.push(null); continue; }

        let name = token;
        let oct = octave;
        const withOctave = token.match(/^([A-G](?:#|B)?)([0-9])$/);
        if (withOctave) { name = withOctave[1]; oct = Number(withOctave[2]); }

        if (!(name in SEMITONES) && LETTER_TO_NOTE[name]) name = LETTER_TO_NOTE[name];
        if (!(name in SEMITONES)) continue;

        const midi = 12 * (oct + 1) + SEMITONES[name];
        out.push({ label: `${name}${oct}`, freq: 440 * Math.pow(2, (midi - 69) / 12) });
    }
    return out;
}

function renderWav(notes, noteMs = 420) {
    const rate = 44100;
    const perNote = Math.round(rate * (noteMs / 1000));
    const total = perNote * notes.length;
    const data = Buffer.alloc(total * 2);

    notes.forEach((note, index) => {
        if (!note) return;
        for (let i = 0; i < perNote; i++) {
            const t = i / rate;
            const decay = Math.exp(-3.2 * t);
            const attack = Math.min(1, t / 0.008);
            // A few harmonics give the tone a piano-like body.
            const sample =
                Math.sin(2 * Math.PI * note.freq * t) * 0.6 +
                Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.22 +
                Math.sin(2 * Math.PI * note.freq * 3 * t) * 0.1 +
                Math.sin(2 * Math.PI * note.freq * 4 * t) * 0.05;
            const value = Math.max(-1, Math.min(1, sample * decay * attack * 0.8));
            data.writeInt16LE(Math.round(value * 32767), (index * perNote + i) * 2);
        }
    });

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(rate, 24);
    header.writeUInt32LE(rate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);
    return Buffer.concat([header, data]);
}

async function toVoiceNote(wav) {
    try {
        const out = await toPTT(wav, 'wav');
        const buffer = out?.data || out;
        if (Buffer.isBuffer(buffer) && buffer.length) return buffer;
    } catch {}
    return null;
}

function pianoHelp(prefix, octave) {
    return `🎹 *PIANO* — octave *${octave}*\n\n` +
        `• *${prefix}piano play* — open the LIVE piano (keys hover, press and sound)\n` +
        `• *${prefix}piano C D E F G A B* — play notes\n` +
        `• *${prefix}piano ASDFGHJ* — keyboard letters (W E T Y U = black keys)\n` +
        `• *${prefix}piano C#4 E4 G4* — note with its own octave\n` +
        `• *${prefix}piano -* — a rest inside a melody\n` +
        `• *${prefix}piano +octave* / *${prefix}piano -octave* / *${prefix}piano center*\n\n` +
        `_The board above shows the live octave, keys and letters._`;
}

async function sendLive(EliteProTech, m, kind, svg) {
    const url = web.gameLink(kind);
    const png = await renderPng(svg);
    const caption = kind === 'dino'
        ? `🦖 *DINO RUN — LIVE*\n\n▶️ ${url}\n\nTap the link and play for real: tap or press *space* to jump, *↓* to duck. Sound and scoring are live in the page.`
        : `🎹 *PIANO — LIVE*\n\n▶️ ${url}\n\nTap the link and play for real: every key hovers, presses and makes sound, and the *− / + OCTAVE* buttons change the octave.`;
    if (png) await EliteProTech.sendMessage(m.chat, { image: png, caption }, { quoted: m });
    else await EliteProTech.sendMessage(m.chat, { text: caption }, { quoted: m });
    return true;
}


async function sendPianoBoard(EliteProTech, m, octave, playing, caption) {
    const png = await renderPng(pianoSvg(octave, playing));
    if (png) {
        await EliteProTech.sendMessage(m.chat, { image: png, caption }, { quoted: m });
    } else {
        await EliteProTech.sendMessage(m.chat, { text: caption }, { quoted: m });
    }
}

async function handlePiano(EliteProTech, m, { args, prefix, reply }) {
    const { state, chat } = chatState(m.chat);
    let octave = Number.isInteger(chat.pianoOctave) ? chat.pianoOctave : 3;
    const input = String(args || '').trim();
    const lowered = input.toLowerCase();

    if (LIVE_RE.test(lowered)) return sendLive(EliteProTech, m, 'piano', pianoSvg(octave, 'LIVE'));


    if (/^(\+octave|\+|up|octave\s*up)$/.test(lowered) || /^(-octave|down|octave\s*down)$/.test(lowered) || /^center$/.test(lowered)) {
        if (/^center$/.test(lowered)) octave = 3;
        else if (lowered.startsWith('+') || lowered.includes('up')) octave = Math.min(7, octave + 1);
        else octave = Math.max(0, octave - 1);
        chat.pianoOctave = octave;
        writeState(state);
        await sendPianoBoard(EliteProTech, m, octave, `OCTAVE ${octave}`, pianoHelp(prefix, octave));
        return true;
    }

    if (!input) {
        chat.pianoOctave = octave;
        writeState(state);
        await sendPianoBoard(EliteProTech, m, octave, 'READY', pianoHelp(prefix, octave));
        return true;
    }

    const notes = parseNotes(input, octave);
    const playable = notes.filter(Boolean);
    if (!playable.length) {
        await reply(`❔ I could not read any note in *${input}*.\n\n${pianoHelp(prefix, octave)}`);
        return true;
    }
    if (notes.length > 48) notes.length = 48;

    const wav = renderWav(notes);
    const opus = await toVoiceNote(wav);
    const labels = notes.map(n => (n ? n.label : '·')).join(' ');

    await sendPianoBoard(EliteProTech, m, octave, `PLAYING ${playable[0].label}`, `🎹 *Playing:* ${labels}`);

    if (opus) {
        await EliteProTech.sendMessage(m.chat, { audio: opus, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });
    } else {
        await EliteProTech.sendMessage(m.chat, { audio: wav, mimetype: 'audio/wav' }, { quoted: m }).catch(() => {});
    }
    return true;
}

/* -------------------------------- dino -------------------------------- */
function newDino(best) {
    return { score: 0, best: best || 0, dinoY: 0, ducking: false, obstacles: [{ type: 'cactus', x: 780 }], over: false };
}

function stepDino(game, action) {
    const speed = 110 + Math.min(120, game.score * 4);
    game.dinoY = action === 'jump' ? 120 : 0;
    game.ducking = action === 'duck';

    for (const ob of game.obstacles) ob.x -= speed;

    for (const ob of game.obstacles) {
        const near = ob.x > 40 && ob.x < 170;
        if (!near) continue;
        if (ob.type === 'cactus' && action !== 'jump') game.over = true;
        if (ob.type === 'bird' && action !== 'duck') game.over = true;
    }

    game.obstacles = game.obstacles.filter(ob => ob.x > -80);
    const last = game.obstacles[game.obstacles.length - 1];
    if (!last || last.x < 520) {
        game.obstacles.push({ type: Math.random() < 0.35 ? 'bird' : 'cactus', x: 780 + Math.floor(Math.random() * 120) });
    }
    if (!game.over) game.score += 1;
    if (game.score > game.best) game.best = game.score;
    return game;
}

function dinoCaption(game, prefix) {
    if (game.over) {
        return `💥 *GAME OVER*\n\n🏁 Score: *${game.score}*\n🏆 Best: *${game.best}*\n\nSend *${prefix}dino* to run again.`;
    }
    const next = game.obstacles.find(ob => ob.x > 40);
    const hint = next ? (next.type === 'bird' ? 'a bird is coming — *duck*' : 'a cactus is coming — *jump*') : 'the track is clear — *run*';
    return `🦖 *DINO RUN*\n\nScore: *${game.score}*  ·  Best: *${game.best}*\n\n👀 ${hint}\n\nReply *jump*, *duck* or *run* (or *${prefix}dino stop*).`;
}

async function sendDino(EliteProTech, m, game, prefix) {
    const png = await renderPng(dinoSvg(game));
    const caption = dinoCaption(game, prefix);
    if (png) await EliteProTech.sendMessage(m.chat, { image: png, caption }, { quoted: m });
    else await EliteProTech.sendMessage(m.chat, { text: caption }, { quoted: m });
}

async function handleDino(EliteProTech, m, { args, prefix }) {
    const { state, chat } = chatState(m.chat);
    const action = String(args || '').trim().toLowerCase();

    if (LIVE_RE.test(action)) return sendLive(EliteProTech, m, 'dino', dinoSvg(newDino(chat.dinoBest)));


    if (action === 'stop' || action === 'off' || action === 'quit') {
        chat.dino = null;
        writeState(state);
        await EliteProTech.sendMessage(m.chat, { text: '🦖 Dino Run stopped.' }, { quoted: m });
        return true;
    }

    let game = chat.dino && !chat.dino.over ? chat.dino : null;
    if (!game || action === 'start' || action === 'new') {
        game = newDino(chat.dinoBest);
        chat.dino = game;
        writeState(state);
        await sendDino(EliteProTech, m, game, prefix);
        return true;
    }

    const move = ['jump', 'j', 'up'].includes(action) ? 'jump'
        : ['duck', 'd', 'down'].includes(action) ? 'duck'
            : 'run';
    stepDino(game, move);
    chat.dino = game;
    chat.dinoBest = Math.max(Number(chat.dinoBest || 0), game.score);
    if (game.over) chat.dino = { ...game };
    writeState(state);
    await sendDino(EliteProTech, m, game, prefix);
    return true;
}

// Plain replies (jump / duck / run) while a dino game is running in this chat.
async function handleDinoReply(EliteProTech, m, body, prefix) {
    const word = String(body || '').trim().toLowerCase();
    if (!/^(jump|duck|run|j|d)$/.test(word)) return false;
    const { chat } = chatState(m.chat);
    if (!chat.dino || chat.dino.over) return false;
    return handleDino(EliteProTech, m, { args: word, prefix });
}

async function handleCommands(EliteProTech, m, ctx) {
    if (ctx.command === 'piano') return handlePiano(EliteProTech, m, ctx);
    if (ctx.command === 'dino' || ctx.command === 'dinorun') return handleDino(EliteProTech, m, ctx);
    return false;
}

module.exports = { handleCommands, handleDinoReply, parseNotes, renderWav, pianoSvg, dinoSvg, renderPng };
