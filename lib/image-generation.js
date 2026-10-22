const axios = require('axios');
const { envText } = require('./env-config');
const { imageGeminiKeys } = require('./keyserver');

// Dedicated image model: Flash 3 image (Nano Banana 2 class). Override with IMAGE_GEMINI_MODEL.
const IMAGE_MODEL = envText(process.env, 'IMAGE_GEMINI_MODEL') || 'gemini-3.1-flash-image';

class ImageGenerationError extends Error {
    constructor(code) { super(code); this.code = code; }
}

function imageBuffer(payload) {
    for (const candidate of payload?.candidates || []) {
        for (const part of candidate.content?.parts || []) {
            const image = part.inlineData || part.inline_data;
            if (!/^image\/(png|jpeg|webp)$/.test(image?.mimeType || image?.mime_type || '')) continue;
            if (typeof image.data !== 'string' || image.data.length > 28 * 1024 * 1024) continue;
            const buffer = Buffer.from(image.data, 'base64');
            const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
            const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
            const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
            if (png || jpeg || webp) return buffer;
        }
    }
    return null;
}

async function generateImage(prompt, { getKeys = imageGeminiKeys, http = axios, timeoutMs = 120000 } = {}) {
    const keys = await getKeys();
    if (!keys.length) throw new ImageGenerationError('MISSING_KEY');
    const deadline = Date.now() + timeoutMs;
    let failure = 'UNAVAILABLE';
    for (const key of keys) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        let response;
        try {
            response = await http.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`,
                { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } },
                { headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
                    timeout: Math.min(remaining, 45000), maxContentLength: 28 * 1024 * 1024, validateStatus: () => true }
            );
        } catch { failure = 'UNAVAILABLE'; continue; }
        if (response.status === 401 || response.status === 403) { failure = 'KEY_ACCESS'; continue; }
        if (response.status === 429) { failure = 'QUOTA'; continue; }
        if (response.status >= 500) { failure = 'UNAVAILABLE'; continue; }
        if (response.status < 200 || response.status >= 300) {
            if (/API_KEY_INVALID|API key not valid/i.test(JSON.stringify(response.data))) { failure = 'KEY_ACCESS'; continue; }
            throw new ImageGenerationError(response.status === 404 ? 'MODEL_UNAVAILABLE' : 'REQUEST_REJECTED');
        }
        const buffer = imageBuffer(response.data);
        if (buffer) return buffer;
        const blocked = response.data?.promptFeedback?.blockReason || response.data?.candidates?.some(c => ['SAFETY', 'IMAGE_SAFETY', 'PROHIBITED_CONTENT'].includes(c.finishReason));
        throw new ImageGenerationError(blocked ? 'BLOCKED' : 'NO_IMAGE');
    }
    throw new ImageGenerationError(failure);
}

const errors = {
    MISSING_KEY: '❌ Add IMAGE_GEMINI_KEY (or IMAGE_GEMINI_KEY_2 to IMAGE_GEMINI_KEY_5) to your .env, then restart the bot.',
    KEY_ACCESS: '❌ Your Gemini keys cannot access image generation. Check their validity and image-generation access in Google AI Studio.',
    QUOTA: '❌ Gemini image quota is exhausted. Check billing or quota in Google AI Studio, or try again later.',
    MODEL_UNAVAILABLE: '❌ The Gemini image model is unavailable. Please contact the bot owner.',
    REQUEST_REJECTED: '❌ Gemini rejected the image request. Try a different prompt.',
    BLOCKED: '❌ Gemini blocked this image request. Try a different prompt.',
    NO_IMAGE: '❌ Gemini returned no image. Try a more specific image description.',
    UNAVAILABLE: '❌ The image service is temporarily unavailable or timed out. Please try again later.',
    SEND_FAILED: '❌ The image was generated, but WhatsApp could not send it. Please try again.'
};

async function handleCreate(socket, message, prompt, command, { generate = generateImage } = {}) {
    const send = content => socket.sendMessage(message.chat, content, { quoted: message });
    const react = text => socket.sendMessage(message.chat, { react: { text, key: message.key } }).catch(() => {});
    if (!prompt?.trim()) return send({ text: `⚠️ Example: *${command} a man walking home*` });
    await react('🖼️');
    let generated = false;
    try {
        const image = await generate(prompt.trim());
        generated = true;
        await send({ image, caption: '*AI Image Generated*' });
        await react('✅');
    } catch (error) {
        const code = generated ? 'SEND_FAILED' : (error instanceof ImageGenerationError ? error.code : 'UNAVAILABLE');
        console.error('Create failed:', code);
        await react('❌');
        await send({ text: errors[code] || errors.UNAVAILABLE });
    }
}

module.exports = { generateImage, imageBuffer, handleCreate, ImageGenerationError };