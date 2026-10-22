const test = require('node:test');
const assert = require('node:assert/strict');
const { readEnvKeys } = require('./keyserver');
const { imageGeminiKeys } = require('./keyserver');
const { voiceEnvironment } = require('./voicechanger/env');

test('image pool reads five dedicated slots and never borrows chat or video keys', () => {
    const env = { GEMINI_API_KEY: 'test-chat', GEMINI_youtube_KEY: 'test-video' };
    for (let i = 1; i <= 5; i++) env[`IMAGE_GEMINI_KEY_${i}`] = `test-image-${i}`;
    const keys = readEnvKeys(env);
    assert.deepEqual(keys.imageGeminiKeys, [1, 2, 3, 4, 5].map(i => `test-image-${i}`));
    assert.deepEqual(keys.geminiKeys, ['test-chat']);
    assert.deepEqual(keys.videoGeminiKeys, ['test-video']);
});

test('image pool accepts bare, hyphen and short slot names', () => {
    const keys = readEnvKeys({
        IMAGE_GEMINI_KEY: 'test-image-1',
        'IMAGE-GEMINI-KEY-2': 'test-image-2',
        IMAGE_GEMINI_3: 'test-image-3'
    });
    assert.deepEqual(keys.imageGeminiKeys, ['test-image-1', 'test-image-2', 'test-image-3']);
});

test('imageGeminiKeys() serves the dedicated pool from the environment', async () => {
    const saved = { ...process.env };
    for (const name of Object.keys(process.env)) if (/^IMAGE_GEMINI/i.test(name)) delete process.env[name];
    process.env.IMAGE_GEMINI_KEY_1 = 'test-live-image';
    try {
        assert.deepEqual(await imageGeminiKeys(), ['test-live-image']);
    } finally {
        for (const name of Object.keys(process.env)) if (!(name in saved)) delete process.env[name];
        Object.assign(process.env, saved);
    }
});

test('missing image keys leave the pool empty without borrowing chat keys', () => {
    const keys = readEnvKeys({ GEMINI_API_KEY: 'test-chat' });
    assert.deepEqual(keys.imageGeminiKeys, []);
});

test('chat reads the five requested slots only', () => {
    const env = { GEMINI_API_KEY: 'test-chat-1', GEMINI_youtube_KEY: 'test-video' };
    for (let i = 2; i <= 5; i++) env[`GEMINI_KEY_${i}`] = `test-chat-${i}`;
    env.GEMINI_KEY_6 = 'test-outside';
    assert.deepEqual(readEnvKeys(env).geminiKeys, [1, 2, 3, 4, 5].map(i => `test-chat-${i}`));
});

test('video reads five dedicated slots and YouTube uses its own key', () => {
    const env = { GEMINI_youtube_KEY: 'test-video-1', YOUTUBE_API_KEY: 'test-search' };
    for (let i = 2; i <= 5; i++) env[`GEMINI_youtube_KEY_${i}`] = `test-video-${i}`;
    const keys = readEnvKeys(env);
    assert.deepEqual(keys.videoGeminiKeys, [1, 2, 3, 4, 5].map(i => `test-video-${i}`));
    assert.deepEqual(keys.youtubeKeys, ['test-search']);
});

test('hyphenated and legacy uppercase video names are accepted', () => {
    assert.deepEqual(readEnvKeys({ 'GEMINI_youtube_KEY-5': 'test-five', GEMINI_YOUTUBE_KEY_2: 'test-two' }).videoGeminiKeys,
        ['test-two', 'test-five']);
});

test('missing video keys never borrow chat or old dedicated keys', () => {
    const keys = readEnvKeys({ GEMINI_API_KEY: 'test-chat', VIDEO_KNOWLEDGE_GEMINI_API_KEY: 'test-old' });
    assert.deepEqual(keys.videoGeminiKeys, []);
    assert.equal(keys.videoGeminiKey, null);
    assert.equal(keys.youtubeKey, null);
});

test('blank and duplicate keys are ignored', () => {
    assert.deepEqual(readEnvKeys({ GEMINI_API_KEY: ' test-chat ', GEMINI_KEY_2: 'test-chat', GEMINI_KEY_3: ' ' }).geminiKeys,
        ['test-chat']);
});

test('HF token aliases are trimmed and primary takes precedence', () => {
    assert.equal(voiceEnvironment({ HF_TOKEN: ' test-primary ', HUGGINGFACE_TOKEN: 'test-fallback' }).HF_TOKEN, 'test-primary');
    assert.equal(voiceEnvironment({ HF_TOKEN: ' ', HUGGINGFACE_TOKEN: ' test-fallback ' }).HF_TOKEN, 'test-fallback');
});

test('Space URLs normalize and invalid numbers use safe defaults', () => {
    const config = voiceEnvironment({ HF_SPACE: ' https://huggingface.co/spaces/Plachta/Seed-VC/ ',
        VC_CHUNK_SECONDS: 'oops', VC_DIFFUSION_STEPS: '-1', VC_TIMEOUT_MS: 'Infinity' });
    assert.equal(config.HF_SPACE, 'Plachta/Seed-VC');
    assert.equal(config.CHUNK_SECONDS, 45);
    assert.equal(config.DIFFUSION_STEPS, 30);
    assert.equal(config.REQUEST_TIMEOUT_MS, 240000);
});