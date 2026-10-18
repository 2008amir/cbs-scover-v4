/* =====================================================================
   LOCAL KEY LOADER
   All API keys now come from the local environment (.env / hosting panel).
   No external key server is involved.
   ===================================================================== */

const { envText } = require('./env-config');

function uniq(list) {
    return list
        .map(v => String(v || '').trim())
        .filter((v, i, all) => v && all.indexOf(v) === i);
}

function readEnvKeys(env = process.env) {
    const gemini = uniq([
        env.GEMINI_API_KEY,
        env.GEMINI_KEY_2,
        env.GEMINI_KEY_3,
        env.GEMINI_KEY_4,
        env.GEMINI_KEY_5
    ]);
    // Mixed-case names requested by the owner, plus old uppercase aliases.
    // Hyphenated names are supported in .env, but underscores work in shells too.
    const video = uniq(Array.from({ length: 5 }, (_, i) => {
        const suffix = i ? `_${i + 1}` : '';
        return envText(env, `GEMINI_youtube_KEY${suffix}`,
            `GEMINI_youtube_KEY-${i + 1}`, `GEMINI_YOUTUBE_KEY${suffix}`,
            `GEMINI_YOUTUBE_KEY-${i + 1}`);
    }));
    const youtube = uniq([env.YOUTUBE_API_KEY]);
    return {
        geminiKeys: gemini,
        videoGeminiKeys: video,
        videoGeminiKey: video[0] || null,
        youtubeKeys: youtube,
        youtubeKey: youtube[0] || null
    };
}

let cache = { at: 0, keys: null };

// Kept async for backwards compatibility with existing call sites.
async function loadKeys(force = false) {
    if (!cache.keys || force) {
        cache = { at: Date.now(), keys: readEnvKeys() };
    }
    return cache.keys;
}

async function geminiKeys() {
    const keys = await loadKeys(true);
    return keys.geminiKeys.slice();
}

async function videoGeminiKey() {
    const keys = await loadKeys(true);
    return keys.videoGeminiKey || null;
}

async function videoGeminiKeys() {
    const keys = await loadKeys(true);
    return keys.videoGeminiKeys.slice();
}

async function youtubeKey() {
    const keys = await loadKeys(true);
    return keys.youtubeKey || null;
}

function cachedSnapshot() {
    return cache.keys ? { ...cache.keys, at: cache.at } : null;
}

module.exports = { loadKeys, geminiKeys, videoGeminiKey, videoGeminiKeys, youtubeKey, cachedSnapshot, readEnvKeys };
