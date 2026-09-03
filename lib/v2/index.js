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
    'autoviewlike', 'avl', 'avs', 'calc', 'calculator', 'dino', 'doom',
    'html', 'leavegroup', 'owners', 'piano', 'removeowner', 'sendhtml',
    'setting', 'speed', 'tovoice'
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

/* Read every V2 plugin's declared commands straight off disk, grouped by the
   plugin folder, so the menu lists all V2 sections even before the plugin
   engine has finished loading. */
const PLUGIN_DIR = path.join(__dirname, '..', '..', 'v2', 'plugins');

function scanPluginGroups() {
    const fs = require('fs');
    const groups = {};

    const walk = (dir, category) => {
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const name = entry.name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                walk(full, category || name);
                continue;
            }
            if (!entry.name.endsWith('.js')) continue;
            let src = '';
            try { src = fs.readFileSync(full, 'utf-8'); } catch { continue; }

            const names = [];
            for (const match of src.matchAll(/handler\.command\s*=\s*(\[[^\]]*\]|'[^']*'|"[^"]*")/g)) {
                for (const cmd of match[1].matchAll(/['"]([^'"]+)['"]/g)) names.push(cmd[1].toLowerCase());
            }
            if (/handler\.customPrefix/.test(src)) names.push('Shell ($cmd)');
            if (!names.length) continue;

            const key = category || 'Other';
            groups[key] = groups[key] || [];
            groups[key].push(...names);
        }
    };

    walk(PLUGIN_DIR, '');

    const out = {};
    for (const key of Object.keys(groups).sort()) {
        const unique = [...new Set(groups[key])].sort();
        out[key] = unique.map(n => n.charAt(0).toUpperCase() + n.slice(1));
    }
    return out;
}

function menuGroups() {
    const groups = scanPluginGroups();
    if (Object.keys(groups).length) return groups;
    return { Commands: menuCommands() };
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
    menuGroups,
    handleCommands,
    handleShell,
    menuCommands,
    get MENU_COMMANDS() { return menuCommands(); },
    get MENU_GROUPS() { return menuGroups(); }
};
