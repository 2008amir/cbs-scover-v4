/* =====================================================================
   CENTRAL KEY SERVER CLIENT
   Lovable is the single source of truth for the bot's API keys.
   This bot server asks Lovable for the keys (once, then cached and
   refreshed in the background) and afterwards talks to Google directly.
   No chat/AI traffic ever passes through Lovable.
   ===================================================================== */
const axios = require('axios');

const KEY_SERVER_URL = String(
    process.env.KEY_SERVER_URL ||
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
        ? `${String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL).replace(/\/+$/, '')}/rest/v1/rpc/get_bot_api_keys`
        : 'https://phoumtuzhwslfcwebbeq.supabase.co/rest/v1/rpc/get_bot_api_keys')
).trim();

const KEY_SERVER_APIKEY = String(
    process.env.KEY_SERVER_APIKEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_LAQSH-LGZXzne6e3TBVmCg_FsANe1sk'
).trim();

// Read lazily: hosting panels inject env vars after module load.
function botKeysToken() {
    return String(process.env.BOT_KEYS_TOKEN || process.env.KEY_SERVER_TOKEN || '').trim();
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, keys: null };
let inflight = null;

function localFallback() {
    const gemini = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_KEY_2,
        process.env.GEMINI_KEY_3,
        process.env.GEMINI_KEY_4
    ].map(v => String(v || '').trim()).filter((v, i, all) => v && all.indexOf(v) === i);
    return {
        geminiKeys: gemini,
        videoGeminiKey: String(process.env.VIDEO_KNOWLEDGE_GEMINI_API_KEY || '').trim() || null,
        youtubeKey: String(process.env.YOUTUBE_API_KEY || '').trim() || null
    };
}

function normalise(payload) {
    const keys = Array.isArray(payload?.geminiKeys) ? payload.geminiKeys : [];
    const gemini = keys.map(v => String(v || '').trim()).filter((v, i, all) => v && all.indexOf(v) === i);
    return {
        geminiKeys: gemini,
        videoGeminiKey: payload?.videoGeminiKey ? String(payload.videoGeminiKey).trim() : null,
        youtubeKey: payload?.youtubeKey ? String(payload.youtubeKey).trim() : null
    };
}

async function fetchFromServer() {
    const BOT_KEYS_TOKEN = botKeysToken();
    if (!BOT_KEYS_TOKEN) throw new Error('BOT_KEYS_TOKEN is not configured on this server');
    const { data } = await axios.post(
        KEY_SERVER_URL,
        { p_token: BOT_KEYS_TOKEN },
        {
            timeout: 20000,
            headers: {
                'Content-Type': 'application/json',
                apikey: KEY_SERVER_APIKEY,
                Authorization: `Bearer ${KEY_SERVER_APIKEY}`
            }
        }
    );
    const keys = normalise(data);
    if (!keys.geminiKeys.length) throw new Error('key server returned no chatbot keys');
    return keys;
}

// Returns the cached key set, refreshing it from Lovable when stale.
// If Lovable is unreachable, the last known keys (or local env values) are used.
async function loadKeys(force = false) {
    const fresh = cache.keys && (Date.now() - cache.at) < CACHE_TTL_MS;
    if (fresh && !force) return cache.keys;
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const keys = await fetchFromServer();
            cache = { at: Date.now(), keys };
            return keys;
        } catch (err) {
            console.warn('key server unavailable:', err?.response?.data?.message || err?.message || err);
            if (cache.keys) return cache.keys;
            const fallback = localFallback();
            if (fallback.geminiKeys.length || fallback.videoGeminiKey || fallback.youtubeKey) {
                cache = { at: Date.now(), keys: fallback };
                return fallback;
            }
            throw err;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}

async function geminiKeys() {
    const keys = await loadKeys();
    return keys.geminiKeys.slice();
}

async function videoGeminiKey() {
    const keys = await loadKeys();
    return keys.videoGeminiKey || null;
}

async function youtubeKey() {
    const keys = await loadKeys();
    return keys.youtubeKey || null;
}

function cachedSnapshot() {
    return cache.keys ? { ...cache.keys, at: cache.at } : null;
}

module.exports = { loadKeys, geminiKeys, videoGeminiKey, youtubeKey, cachedSnapshot };
