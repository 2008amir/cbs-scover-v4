/* =====================================================================
   LOCAL API PROXY
   The upstream ElitePro API host (eliteprotech-apis.zone.id) currently
   answers several routes with HTTP 500 ("Auth returned non-JSON: 403
   Forbidden"), which broke `.play` / `.song` downloads and `.shazam`.

   This tiny local HTTP server answers those broken routes with working
   providers, keeping the exact response shape the remote command handler
   expects, and transparently forwards every other route to the original
   upstream host. The handler source is patched to point at this server.
   ===================================================================== */
const http = require('http');
const axios = require('axios');

const UPSTREAM = 'https://eliteprotech-apis.zone.id';
let baseUrl = null;
let starting = null;

const HTTP = axios.create({
    timeout: 120000,
    validateStatus: () => true,
    headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0' }
});

function json(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(payload);
}

async function tryJson(url) {
    try {
        const res = await HTTP.get(url);
        if (res.status >= 200 && res.status < 300 && res.data && typeof res.data === 'object') return res.data;
    } catch {}
    return null;
}

/* ---------- YouTube audio ---------- */
async function resolveYtAudio(url) {
    const target = encodeURIComponent(url);
    const providers = [
        `${UPSTREAM}/convert?url=${target}`,
        `https://apis.davidcyriltech.my.id/download/ytmp3?url=${target}`,
        `https://apis.davidcyriltech.my.id/youtube/mp3?url=${target}`
    ];

    for (const provider of providers) {
        const data = await tryJson(provider);
        if (!data) continue;
        const result = data.result || data;
        const downloadURL = data.downloadURL || result.download_url || result.downloadURL || result.url || result.link;
        const title = data.title || result.title || null;
        if (downloadURL && /^https?:\/\//i.test(String(downloadURL))) {
            return { success: true, title, downloadURL: String(downloadURL) };
        }
    }
    return null;
}

/* ---------- Song identification (Shazam) ---------- */
function normaliseShazam(payload) {
    const src = payload?.data || payload?.result || payload || {};
    const track = src.track || src;
    const title = track.title || track.name || src.title;
    if (!title) return null;
    return {
        success: true,
        data: {
            title,
            artist: track.artist || track.subtitle || track.artists?.[0]?.name || 'Unknown',
            album: track.album || 'Unknown',
            release_date: track.release_date || track.releaseDate || track.release || 'Unknown',
            label: track.label || 'Unknown',
            genres: Array.isArray(track.genres) ? track.genres : (track.genre ? [track.genre] : []),
            score: track.score ?? null
        }
    };
}

/* Official RapidAPI Shazam recognition (primary provider when a key is set). */
const RAPID_HOSTS = [
    { host: 'shazam-api6.p.rapidapi.com', path: '/shazam/recognize/', field: 'upload_file' },
    { host: 'shazam-core.p.rapidapi.com', path: '/v1/tracks/recognize', field: 'file' },
    { host: 'shazam-api7.p.rapidapi.com', path: '/songs/recognize', field: 'upload_file' }
];

async function recogniseWithRapidApi(url) {
    const key = String(process.env.SHAZAM_API_KEY || process.env.RAPIDAPI_KEY || '').trim();
    if (!key) return null;

    let audio;
    try {
        const res = await HTTP.get(url, { responseType: 'arraybuffer' });
        if (res.status < 200 || res.status >= 300) return null;
        audio = Buffer.from(res.data);
    } catch { return null; }

    const hostOverride = String(process.env.SHAZAM_API_HOST || '').trim();
    const targets = hostOverride
        ? [{ host: hostOverride, path: String(process.env.SHAZAM_API_PATH || '/shazam/recognize/'), field: 'upload_file' }, ...RAPID_HOSTS]
        : RAPID_HOSTS;

    for (const t of targets) {
        try {
            const form = new FormData();
            form.append(t.field, new Blob([audio], { type: 'audio/mpeg' }), 'audio.mp3');
            const res = await HTTP.post(`https://${t.host}${t.path}`, form, {
                headers: { 'x-rapidapi-key': key, 'x-rapidapi-host': t.host }
            });
            if (res.status < 200 || res.status >= 300) continue;
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            const normalised = normaliseShazam(data);
            if (normalised) return normalised;
        } catch {}
    }
    return null;
}

async function identifySong(url) {
    const official = await recogniseWithRapidApi(url);
    if (official) return official;

    const target = encodeURIComponent(url);
    const providers = [`${UPSTREAM}/shazam?url=${target}`, `https://apis.davidcyriltech.my.id/shazam?url=${target}`];

    const auddToken = String(process.env.AUDD_API_TOKEN || '').trim();
    if (auddToken) {
        providers.push(`https://api.audd.io/recognize?api_token=${encodeURIComponent(auddToken)}&url=${target}&return=apple_music,spotify`);
    }

    for (const provider of providers) {
        const data = await tryJson(provider);
        if (!data) continue;
        if (data.status === 'error') continue;
        const normalised = normaliseShazam(data);
        if (normalised) return normalised;
    }
    return null;
}


/* ---------- Server ---------- */
async function forward(req, res, target) {
    try {
        const upstream = await HTTP.get(target, { responseType: 'arraybuffer' });
        res.writeHead(upstream.status, {
            'Content-Type': upstream.headers['content-type'] || 'application/octet-stream'
        });
        res.end(Buffer.from(upstream.data));
    } catch (err) {
        json(res, 502, { success: false, error: err?.message || 'upstream request failed' });
    }
}

async function handle(req, res) {
    const parsed = new URL(req.url, 'http://127.0.0.1');
    const route = parsed.pathname.replace(/\/+$/, '') || '/';
    const url = parsed.searchParams.get('url') || '';

    try {
        if ((route === '/convert' || route === '/ytaudio') && url) {
            const audio = await resolveYtAudio(url);
            if (!audio) return json(res, 502, { success: false, error: 'no audio provider available' });
            return json(res, 200, audio);
        }

        if (route === '/shazam' && url) {
            const song = await identifySong(url);
            if (!song) return json(res, 200, { success: false, error: 'Could not identify the song' });
            return json(res, 200, song);
        }
    } catch (err) {
        return json(res, 500, { success: false, error: err?.message || String(err) });
    }

    return forward(req, res, `${UPSTREAM}${parsed.pathname}${parsed.search}`);
}

// Starts (once) and returns the base URL the patched handler should use.
function start() {
    if (baseUrl) return Promise.resolve(baseUrl);
    if (starting) return starting;

    starting = new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            handle(req, res).catch(() => json(res, 500, { success: false, error: 'proxy failure' }));
        });
        server.on('error', () => resolve(null));
        server.listen(0, '127.0.0.1', () => {
            baseUrl = `http://127.0.0.1:${server.address().port}`;
            console.log('🔁 API fallback proxy ready on ' + baseUrl);
            resolve(baseUrl);
        });
        server.unref?.();
    }).finally(() => { starting = null; });

    return starting;
}

module.exports = { start, resolveYtAudio, identifySong, UPSTREAM };
