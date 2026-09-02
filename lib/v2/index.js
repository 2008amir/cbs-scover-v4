/* ============================================================
   CBS-SCOVER-V2 command layer
   Ported from the ELITE-PRO-V2 plugin set (rich HTML cards, tools
   and owner utilities). Only commands that do not already exist in
   V1 are merged here.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const HTML = require('./html');

const SETTINGS_PATH = path.join(__dirname, '..', '..', 'database', 'settings.json');

/* The V2 commands, in the order they appear in the menu. */
const MENU_COMMANDS = [
    'Calculator',
    'Dino',
    'Doom',
    'Piano',
    'Ping',
    'Settings',
    'Autoviewlike',
    'Sendhtml',
    'Shell ($cmd)'
];

/* ---------------------------- rich html ---------------------------- */

async function sendRichHtml(EliteProTech, chat, { id, title, html, source = 'cbs-scover' }) {
    const responseId = `${id}-${Date.now()}`;
    const payload = {
        response_id: responseId,
        sections: [{
            view_model: {
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: [source]
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        }]
    };

    await EliteProTech.relayMessage(chat, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: { messageDisclaimerText: '', botResponseId: responseId }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: title }],
                    unifiedResponse: {
                        data: Buffer.from(JSON.stringify(payload)).toString('base64')
                    },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4
                    }
                }
            }
        }
    }, {});
}

/* ---------------------------- settings ---------------------------- */

function readSettings() {
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function writeSettings(data) {
    try {
        fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('V2 settings save failed:', err?.message || err);
    }
}

function onOff(value) {
    return value ? 'ON' : 'OFF';
}

/* ---------------------------- helpers ---------------------------- */

function quotedText(m) {
    const q = m?.quoted;
    if (!q) return '';
    return (
        q.text ||
        q.message?.conversation ||
        q.message?.extendedTextMessage?.text ||
        ''
    ).trim();
}

const CARDS = {
    calculator: { id: 'cbs-calculator', title: 'CBS-SCOVER-V2 • CALCULATOR', label: 'calculator' },
    dino: { id: 'cbs-dino', title: 'CBS-SCOVER-V2 • DINO RUNNER', label: 'Dino Runner' },
    doom: { id: 'cbs-doom', title: 'CBS-SCOVER-V2 • MINI DOOM', label: 'Mini Doom' },
    piano: { id: 'cbs-piano', title: 'CBS-SCOVER-V2 • PIANO', label: 'piano' }
};

/* ---------------------------- commands ---------------------------- */

async function handleCommands(EliteProTech, m, ctx) {
    const { command, args, reply, prefix, isOwner } = ctx;

    /* ---- interactive HTML cards: calculator, dino, doom, piano ---- */
    const cardKey = command === 'calc' ? 'calculator' : command;
    if (CARDS[cardKey] && HTML[cardKey]) {
        const card = CARDS[cardKey];
        try {
            await sendRichHtml(EliteProTech, m.chat, { id: card.id, title: card.title, html: HTML[cardKey] });
        } catch (err) {
            await reply(`❌ Unable to send the ${card.label}: ${err?.message || err}`);
        }
        return true;
    }

    /* ---- ping / speed ---- */
    if (command === 'ping' || command === 'speed') {
        const start = Date.now();
        const sent = await EliteProTech.sendMessage(m.chat, { text: '⏱️ Speed test...' }, { quoted: m });
        const latency = Date.now() - start;
        try {
            await EliteProTech.sendMessage(m.chat, { text: `🏓 Pong *${latency}ms*`, edit: sent.key });
        } catch {
            await reply(`🏓 Pong *${latency}ms*`);
        }
        return true;
    }

    /* ---- settings overview ---- */
    if (command === 'settings' || command === 'setting') {
        if (!isOwner) {
            await reply('⛔ Command restricted to the bot owner.');
            return true;
        }
        await reply(
            `⚙️ *CBS-SCOVER SETTINGS*\n\n` +
            `Prefix: *${prefix}*\n` +
            `Bot name: *${global.botname || 'CBS-SCOVER'}*\n` +
            `Owner: *${global.ownername || 'codebreakers'}*\n\n` +
            `Auto-view status: *${onOff(global.autoviewstatus)}*\n` +
            `Auto-like status: *${onOff(global.autolikestatus)}*\n` +
            `Auto-read: *${onOff(global.autoread)}*\n` +
            `Auto-bio: *${onOff(global.autobio)}*\n` +
            `Auto-recording: *${onOff(global.autoRecording)}*\n` +
            `Auto-typing: *${onOff(global.autoTyping)}*\n` +
            `Auto-record/type: *${onOff(global.autorecordtype)}*\n` +
            `Auto-react: *${onOff(global.autoreact)}*`
        );
        return true;
    }

    /* ---- autoviewlike / avl ---- */
    if (command === 'autoviewlike' || command === 'avl') {
        if (!isOwner) {
            await reply('⛔ Command restricted to the bot owner.');
            return true;
        }
        const choice = String(args || '').trim().split(/\s+/)[0].toLowerCase();
        if (!['on', 'off', 'enable', 'disable'].includes(choice)) {
            const state = global.autoviewstatus && global.autolikestatus ? 'ON' : 'OFF';
            await reply(`👀 Auto-view + auto-like status are *${state}*.\n\nUsage: *${prefix}autoviewlike on | off*`);
            return true;
        }
        const enabled = choice === 'on' || choice === 'enable';
        global.autoviewstatus = enabled;
        global.autolikestatus = enabled;
        const settings = readSettings();
        settings.autoViewStatus = enabled;
        settings.autoLikeStatus = enabled;
        writeSettings(settings);
        await reply(`✅ Auto-view + auto-like status are now *${enabled ? 'ON' : 'OFF'}*.`);
        return true;
    }

    /* ---- sendhtml / html ---- */
    if (command === 'sendhtml' || command === 'html') {
        if (!isOwner) {
            await reply('⛔ Command restricted to the bot owner.');
            return true;
        }
        const html = quotedText(m);
        if (!html) {
            await reply(`ℹ️ Reply to a text message that contains HTML.\n\nUsage: *${prefix}sendhtml*`);
            return true;
        }
        try {
            await sendRichHtml(EliteProTech, m.chat, { id: 'cbs-html', title: 'CBS-SCOVER-V2', html });
        } catch (err) {
            await reply(`❌ Unable to send the HTML card: ${err?.message || err}`);
        }
        return true;
    }

    return false;
}

/* ---- shell: owner only, custom "$" prefix (e.g. $ls -la) ---- */
async function handleShell(EliteProTech, m, { body, reply, isOwner }) {
    const raw = String(body || '');
    if (!raw.startsWith('$')) return false;
    if (!isOwner) return true;   // silent deny, exactly like V2

    const command = raw.slice(1).trim();
    if (!command) {
        await reply('ℹ️ Provide a shell command to run.\nUsage: *$ls -la*');
        return true;
    }

    const TIMEOUT_MS = 30000;
    try {
        const { stdout, stderr } = await execAsync(command, { timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 });
        const output = `${stdout || ''}${stderr ? `\n${stderr}` : ''}`.trim() || '(no output)';
        await reply(output.slice(0, 4000));
    } catch (err) {
        await reply(err?.killed ? `⏱️ Command timed out after ${TIMEOUT_MS / 1000}s` : String(err?.stderr || err?.message || err).slice(0, 4000));
    }
    return true;
}

module.exports = { handleCommands, handleShell, sendRichHtml, MENU_COMMANDS };
