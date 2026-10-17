# Architecture
- This repository runs a standalone Node.js Baileys bot; V1 and V2 share one WhatsApp socket.
- Keep connection monitoring and socket-scoped timer disposal in lib/connection-health.js so reconnects do not accumulate background tasks.
- Never delete active Baileys authentication/encryption files during scheduled maintenance; only explicit logout may clear credentials.
- Maintenance expires bounded caches by retention policy, not process RSS, to preserve active conversations and anti-delete recovery.