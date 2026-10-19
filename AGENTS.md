# Architecture
- This repository runs a standalone Node.js Baileys bot; V1 and V2 share one WhatsApp socket.
- Keep connection monitoring and socket-scoped timer disposal in lib/connection-health.js so reconnects do not accumulate background tasks.
- Never delete active Baileys authentication/encryption files during scheduled maintenance; only explicit logout may clear credentials.
- Maintenance expires bounded caches by retention policy, not process RSS, to preserve active conversations and anti-delete recovery.
- Load provider credentials through lib/env-config.js with a repository-relative .env path; separate Gemini chat, Gemini video analysis and YouTube search credentials to prevent wrong-service authentication.
- Normalize voice environment settings in lib/voicechanger/env.js so invalid numerical settings never enter provider requests.
- Keep image generation in lib/image-generation.js with bounded requests, validated image buffers, and sanitized errors; V1 is evaluated with the repository-root require.
