const path = require('path');

// Resolve from the repository, not the hosting panel's working directory.
// Panel environment values take precedence over .env.
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

function envText(env, ...names) {
    for (const name of names) {
        const value = String(env[name] || '').trim();
        if (value) return value;
    }
    return '';
}

function envNumber(env, name, fallback, min, max) {
    const raw = envText(env, name);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

module.exports = { envText, envNumber };