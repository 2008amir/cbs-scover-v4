import * as baileys from '@whiskeysockets/baileys'

/*
 * Rich HTML is sent through Baileys' native AIRichResponseMessage protobuf.
 * V1 and V2 now use the same official Baileys release, so no custom encoder or
 * private writer patch is needed on the shared socket.
 */
const getProto = () => global.baileysProto || baileys.proto

export async function sendRichHtml(EliteProTech, chat, { id, title, html, source }) {
    const Message = getProto()?.Message
    if (typeof Message?.fromObject !== 'function' || !('richResponseMessage' in (Message.prototype || {}))) {
        throw new Error('The installed Baileys version does not support rich HTML messages')
    }

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

    const content = Message.fromObject({
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: {
                messageDisclaimerText: '',
                botResponseId: responseId
            }
        },
        richResponseMessage: {
            messageType: 1,
            submessages: [{ messageType: 2, messageText: title }],
            unifiedResponse: {
                data: Buffer.from(JSON.stringify(payload)).toString('base64')
            },
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                forwardOrigin: 4
            }
        }
    })

    await EliteProTech.relayMessage(chat, content, {})
}