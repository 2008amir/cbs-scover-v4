/* ============================================================
   CBS-SCOVER-V2 bridge
   ------------------------------------------------------------
   The complete ELITE-PRO-V2 bot lives in this folder untouched.
   Instead of opening a second WhatsApp connection and a second
   HTTP server, this bridge runs the real V2 plugin engine inside
   the V1 process, on the V1 socket, so both versions live on one
   server.
   ============================================================ */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import handleMessage, { plugins, initPlugins, initEvents, wireEventDispatchers } from './index.js'
import { smsg, bind, decorateSocket } from './lib/myfunc.js'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* Commands already provided by CBS-SCOVER-V1. V2 keeps the files, but when a
   V2 command has the *exact same spelling* as a V1 command the V1
   implementation stays in charge so nothing answers twice. Different
   spellings (aliases V1 does not have) keep working from V2. */
const STATIC_V1_COMMANDS = [
    'menu', 'help', 'sticker', 's', 'toaudio', 'tomp3', 'tovideo',
    'toptt', 'url', 'getpp', 'pp', 'yts', 'ytsearch',
    'uptime', 'runtime', 'poll', 'tagall', 'hidetag',
    'add', 'kick', 'promote', 'demote', 'open', 'close', 'left',
    'owner', 'addowner', 'delowner', 'listowner',
    'mode', 'setprefix', 'setpp',
    'delete', 'del', 'eval', 'autoread', 'autoviewstatus',
    'autolike', 'autorecording', 'autotyping'
]

/* Names are discovered from V1 itself (the cached remote handler + the local
   ElitePro command file) so only true same-spelling duplicates are removed. */
let v1Cache = null
function v1Commands() {
    if (v1Cache) return v1Cache
    const names = new Set(STATIC_V1_COMMANDS)

    for (const name of global.V1_COMMAND_NAMES || []) {
        const key = String(name || '').toLowerCase().trim()
        if (key) names.add(key)
    }

    const files = [
        path.join(process.cwd(), 'ElitePro.js'),
        path.join(process.cwd(), 'database', 'handler.cache.js')
    ]
    for (const file of files) {
        let src = ''
        try { src = fs.readFileSync(file, 'utf-8') } catch { continue }
        for (const m of src.matchAll(/case\s*'([a-z0-9_\-]{1,24})'\s*:/gi)) names.add(m[1].toLowerCase())
        for (const m of src.matchAll(/command\s*===\s*'([a-z0-9_\-]{1,24})'/gi)) names.add(m[1].toLowerCase())
    }

    v1Cache = names
    return names
}

let ready = false
let socket = null


/* Keep V2 globals it depends on, without overwriting V1 branding. */
function ensureGlobals() {
    global.botMessage = global.botMessage || {
        owner: 'This feature is for the Owner only.',
        admin: 'This feature is for group Admins only.',
        group: 'This command can only be used in a group.',
        private: 'This command can only be used in a private chat.',
        isBotAdmin: 'I need to be an admin in this group to do that.'
    }
    global.stickerPack = global.stickerPack || {
        packname: global.packname || 'CBS-SCOVER',
        author: global.author || 'codebreakers'
    }
    global.botName = global.botName || global.botname || 'CBS-SCOVER'
    global.ownerName = global.ownerName || global.ownername || 'codebreakers'
    global.repo = global.repo || 'https://github.com/EliteProTech/ELITE-PRO-V2'
    /* V1 answers everyone, so V2 must not run in self mode. */
    global.botMode = 'public'
}

/* V2 reads its owners from lib/database/owner.json; keep it in sync with the
   V1 owner list so owner-only V2 commands recognise the same people. */
function syncOwners() {
    try {
        const v1Path = path.join(process.cwd(), 'database', 'owner.json')
        const v2Path = path.join(process.cwd(), 'lib', 'database', 'owner.json')
        const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf-8'))
        const list = (Array.isArray(v1) ? v1 : Object.values(v1 || {}))
            .flat()
            .map(v => String(v).replace(/\D/g, ''))
            .filter(Boolean)
        const owner = String(global.ownernumber || '').replace(/\D/g, '')
        if (owner) list.push(owner)
        fs.mkdirSync(path.dirname(v2Path), { recursive: true })
        fs.writeFileSync(v2Path, JSON.stringify([...new Set(list)], null, 2))
    } catch {}
}


export async function init(sock) {
    ensureGlobals()
    syncOwners()

    if (sock && socket !== sock) {
        socket = sock
        decorateSocket(sock)
        try { bind(sock) } catch {}
    }
    if (!ready) {
        await initPlugins()
        await initEvents()
        ready = true
    }
    if (socket) {
        try { wireEventDispatchers(socket) } catch {}
    }
}

export function commandNames({ excludeV1 = true } = {}) {
    const names = []
    for (const key of plugins.keys()) {
        if (typeof key !== 'string') continue
        if (excludeV1 && V1_COMMANDS.has(key)) continue
        names.push(key)
    }
    return names
}

export function owns(command) {
    const key = String(command || '').toLowerCase()
    if (!key) return false
    if (V1_COMMANDS.has(key)) return false
    return plugins.has(key)
}

/* Runs a V2 command (or the "$" shell custom prefix) on the V1 socket.
   Returns true when V2 handled the message. */
export async function handle(sock, m, { command, isCustomPrefix = false } = {}) {
    await init(sock)
    if (!isCustomPrefix && !owns(command)) return false

    let vm = m
    try {
        vm = (await smsg(sock, m)) || m
    } catch {}

    try {
        await handleMessage(sock, vm)
        return true
    } catch (e) {
        console.error('[V2] command failed:', e?.message || e)
        return true
    }
}

export const V2_DIR = __dirname
export { plugins }
