/* =====================================================================
   LOCAL KEY LOADER
   All API keys now come from the local environment (.env / hosting panel).
   No external key server is involved.
   ===================================================================== */

function uniq(list) {
    return list
        .map(v => String(v || '').trim())
        .filter((v, i, all) => v && all.indexOf(v) === i);
}

function readEnvKeys() {
    const gemini = uniq([
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_KEY_2,
        process.env.GEMINI_KEY_3,
        process.env.GEMINI_KEY_4,
        process.env.GEMINI_KEY_5
    ]);
    return {
        geminiKeys: gemini,
        videoGeminiKey: String(process.env.VIDEO_KNOWLEDGE_GEMINI_API_KEY || gemini[0] || '').trim() || null,
        youtubeKey: String(process.env.YOUTUBE_API_KEY || '').trim() || null
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

async function youtubeKey() {
    const keys = await loadKeys(true);
    return keys.youtubeKey || null;
}

function cachedSnapshot() {
    return cache.keys ? { ...cache.keys, at: cache.at } : null;
}

module.exports = { loadKeys, geminiKeys, videoGeminiKey, youtubeKey, cachedSnapshot };
