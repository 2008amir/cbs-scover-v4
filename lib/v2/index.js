/* ============================================================
   CBS-SCOVER-V2 command layer (CommonJS -> ESM bridge)
   ------------------------------------------------------------
   The full ELITE-PRO-V2 bot lives in ../../v2 exactly as shipped.
   This module lets the CommonJS V1 handler dispatch into the real
   V2 plugin engine, so both versions share one process, one
   WhatsApp connection and one HTTP server.
   ============================================================ */

const path = require('path');
const { pathToFileURL } = require('url');

const BRIDGE_PATH = path.join(__dirname, '..', '..', 'v2', 'bridge.js');

/* Commands V2 adds on top of V1 (used for the menu when the plugin engine has
   not finished loading yet). */
const FALLBACK_COMMANDS = [
    'calculator', 'calc', 'dino', 'doom', 'piano', 'ping', 'speed',
    'settings', 'setting', 'autoviewlike', 'avl', 'sendhtml', 'html', 'update'
];

let bridgePromise = null;
let bridge = null;

function loadBridge() {
    if (!bridgePromise) {
        bridgePromise = import(pathToFileURL(BRIDGE_PATH).href)
            .then((mod) => { bridge = mod; return mod; })
            .catch((err) => {
                console.error('[V2] bridge failed to load:', err?.message || err);
                bridgePromise = null;
                return null;
            });
    }
    return bridgePromise;
}

/* Warm the plugin engine up as soon as the socket is available. */
async function init(EliteProTech) {
    const mod = await loadBridge();
    if (!mod) return false;
    try {
        await mod.init(EliteProTech);
        return true;
    } catch (err) {
        console.error('[V2] init failed:', err?.message || err);
        return false;
    }
}

async function handleCommands(EliteProTech, m, { command }) {
    const mod = await loadBridge();
    if (!mod) return false;
    await mod.init(EliteProTech);
    if (!mod.owns(command)) return false;
    return await mod.handle(EliteProTech, m, { command });
}

/* V2 keeps the owner shell on its own "$" prefix. */
async function handleShell(EliteProTech, m) {
    const mod = await loadBridge();
    if (!mod) return false;
    await mod.init(EliteProTech);
    return await mod.handle(EliteProTech, m, { command: '', isCustomPrefix: true });
}

function menuCommands() {
    let names = [];
    try {
        if (bridge) names = bridge.commandNames();
    } catch {}
    if (!names.length) names = FALLBACK_COMMANDS.slice();

    const seen = new Set();
    const list = [];
    for (const name of names.sort()) {
        const key = String(name).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(key.charAt(0).toUpperCase() + key.slice(1));
    }
    list.push('Shell ($cmd)');
    return list;
}

module.exports = {
    init,
    handleCommands,
    handleShell,
    menuCommands,
    get MENU_COMMANDS() { return menuCommands(); }
};
