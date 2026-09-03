import { proto } from '@whiskeysockets/baileys'

/* ------------------------------------------------------------------
   The Baileys build this server runs (eliteprotech-baileys) does not
   know the AI bot message protos (botForwardedMessage /
   richResponseMessage), so its encoder silently dropped the whole
   payload: the message was "sent" but never arrived.

   To keep the interactive HTML cards working we encode those two
   protos by hand and append the bytes to the encoded message.
   ------------------------------------------------------------------ */

const supportsRichResponse = () => {
    try {
        return typeof proto?.Message?.fromObject === 'function' &&
            'botForwardedMessage' in (proto.Message.prototype || {})
    } catch {
        return false
    }
}

/* --- minimal protobuf writer --- */
class Writer {
    constructor() { this.bytes = [] }
    varint(value) {
        let v = value >>> 0
        while (v > 127) { this.bytes.push((v & 127) | 128); v >>>= 7 }
        this.bytes.push(v)
        return this
    }
    tag(field, wire) { return this.varint((field << 3) | wire) }
    uint(field, value) { return this.tag(field, 0).varint(value) }
    bool(field, value) { return this.uint(field, value ? 1 : 0) }
    raw(field, buffer) {
        const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
        this.tag(field, 2).varint(buf.length)
        for (const b of buf) this.bytes.push(b)
        return this
    }
    string(field, value) { return this.raw(field, Buffer.from(String(value), 'utf-8')) }
    finish() { return Buffer.from(this.bytes) }
}

/* Field numbers taken from the WhatsApp Message proto. */
const F = {
    messageBotForwarded: 108,      // Message.botForwardedMessage (FutureProofMessage)
    futureProofMessage: 1,         // FutureProofMessage.message
    messageRichResponse: 97,       // Message.richResponseMessage
    rrMessageType: 1,
    rrSubmessages: 2,
    rrSubType: 1,
    rrSubText: 3,
    rrUnifiedResponse: 3,
    rrUnifiedData: 1,
    rrContextInfo: 4,
    ctxForwardingScore: 21,
    ctxIsForwarded: 22,
    ctxBotInfo: 56,
    botInfoJid: 2,
    ctxForwardOrigin: 67
}

function encodeRichResponse({ title, payloadBase64, botJid }) {
    const submessage = new Writer().uint(F.rrSubType, 2).string(F.rrSubText, title).finish()
    const unified = new Writer().raw(F.rrUnifiedData, Buffer.from(payloadBase64, 'utf-8')).finish()
    const botInfo = new Writer().string(F.botInfoJid, botJid).finish()
    const context = new Writer()
        .uint(F.ctxForwardingScore, 1)
        .bool(F.ctxIsForwarded, true)
        .raw(F.ctxBotInfo, botInfo)
        .uint(F.ctxForwardOrigin, 4)
        .finish()

    return new Writer()
        .uint(F.rrMessageType, 1)
        .raw(F.rrSubmessages, submessage)
        .raw(F.rrUnifiedResponse, unified)
        .raw(F.rrContextInfo, context)
        .finish()
}

function encodeBotForwarded(options) {
    const rich = new Writer().raw(F.messageRichResponse, encodeRichResponse(options)).finish()
    const future = new Writer().raw(F.futureProofMessage, rich).finish()
    return new Writer().raw(F.messageBotForwarded, future).finish()
}

/* Append the hand-encoded bytes whenever a message carries our marker. */
function patchEncoder() {
    const Message = proto?.Message
    if (!Message || Message.__richHtmlPatched) return
    const original = Message.encode.bind(Message)
    Message.encode = function (message, writer) {
        const extra = message && message.__richHtmlBytes
        if (!extra) return original(message, writer)
        const clone = { ...message }
        delete clone.__richHtmlBytes
        const out = original(clone, writer)
        if (typeof out.raw === 'function') out.raw(extra)
        else out._push((val, buf, pos) => { for (let i = 0; i < val.length; i++) buf[pos + i] = val[i] }, extra.length, extra)
        return out
    }
    Message.__richHtmlPatched = true
}

export async function sendRichHtml(EliteProTech, chat, { id, title, html, source }) {
    const responseId = `${id}-${Date.now()}`
    const payload = {
        response_id: responseId,
        sections: [{
            view_model: {
                primitive: {
                    __typename: 'GenAIaeacdsnwHtmlPrimitive',
                    payload: html,
                    trusted_sources: [source]
                },
                __typename: 'GenAISingleLayoutViewModel'
            }
        }]
    }
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64')
    const botJid = '867051314767696@bot'

    const content = {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId
            }
        }
    }

    if (supportsRichResponse()) {
        content.botForwardedMessage = {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: title }],
                    unifiedResponse: { data: Buffer.from(payloadBase64, 'utf-8') },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid },
                        forwardOrigin: 4
                    }
                }
            }
        }
    } else {
        patchEncoder()
        content.botForwardedMessage = { message: {} }
        content.__richHtmlBytes = encodeBotForwarded({ title, payloadBase64, botJid })
    }

    await EliteProTech.relayMessage(chat, content, {})
}

export { encodeBotForwarded, patchEncoder }
