/* =====================================================================
   SINGLE-TICK PATCH FOR BAILEYS
   Baileys sends the delivery receipt (2nd tick) from an internal closure
   inside lib/Socket/messages-recv.js, so wrapping sock.sendReceipt from the
   app is not enough. This rewrites those call sites so they first ask
   global.shouldSuppressDeliveryReceipt().

   Runs both from `postinstall` and from index.js at boot, because some hosts
   install with --ignore-scripts (which silently skipped the patch before).
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const CANDIDATE_PACKAGES = ['baileys', 'eliteprotech-baileys', '@whiskeysockets/baileys'];

const GUARD = 'global.shouldSuppressDeliveryReceipt';

function targetFiles() {
    const roots = [
        path.join(__dirname, '..', 'node_modules'),
        path.join(process.cwd(), 'node_modules')
    ];
    const files = [];
    for (const root of roots) {
        for (const pkg of CANDIDATE_PACKAGES) {
            const file = path.join(root, pkg, 'lib', 'Socket', 'messages-recv.js');
            if (fs.existsSync(file) && !files.includes(file)) files.push(file);
        }
    }
    return files;
}

function patchSource(source) {
    // Matches: await sendReceipt(msg.key.remoteJid, participant, [msg.key.id], type);
    const call = /await\s+sendReceipt\(\s*msg\.key\.remoteJid\s*,\s*participant\s*,\s*\[\s*msg\.key\.id\s*\]\s*,\s*type\s*\)\s*;/g;
    let changed = 0;
    const out = source.replace(call, (match) => {
        changed += 1;
        return `if (!${GUARD}?.(msg.key.remoteJid, participant)) { ${match} }`;
    });
    return { out, changed };
}

function apply({ quiet = false } = {}) {
    const files = targetFiles();
    if (!files.length) {
        if (!quiet) console.warn('Single-tick patch skipped: Baileys messages-recv.js was not found.');
        return false;
    }
    let anyPatched = false;
    for (const file of files) {
        try {
            const source = fs.readFileSync(file, 'utf8');
            if (source.includes(GUARD)) {
                if (!quiet) console.log(`Single-tick patch already applied: ${file}`);
                anyPatched = true;
                continue;
            }
            const { out, changed } = patchSource(source);
            if (!changed) {
                if (!quiet) console.warn(`Single-tick patch skipped (call site not found): ${file}`);
                continue;
            }
            fs.writeFileSync(file, out);
            anyPatched = true;
            if (!quiet) console.log(`Applied single-tick delivery-receipt patch (${changed} site${changed > 1 ? 's' : ''}): ${file}`);
        } catch (err) {
            if (!quiet) console.warn('Single-tick patch failed:', err?.message || err);
        }
    }
    return anyPatched;
}

module.exports = { apply };

if (require.main === module) apply();
