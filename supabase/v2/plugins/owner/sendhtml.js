import { sendRichHtml } from '../../lib/richhtml.js'

const PREVIEW_HEIGHT = 588

function fitHtmlToChatViewport(input) {
    const viewport = '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">'
    const sizing = `<style id="elite-chat-preview">:root{width:100%;height:100%;overflow:hidden}*{box-sizing:border-box;max-width:100%}html,body{margin:0;width:100%;height:${PREVIEW_HEIGHT}px;max-height:100dvh;overflow:hidden}body{position:relative}body>*{max-height:100%;overflow:auto}img,video,canvas,svg,iframe{max-width:100%;max-height:100%;object-fit:contain}</style>`

    if (/<html[\s>]/i.test(input)) {
        if (/<head[\s>]/i.test(input)) return input.replace(/<head([^>]*)>/i, `<head$1>${viewport}${sizing}`)
        return input.replace(/<html([^>]*)>/i, `<html$1><head>${viewport}${sizing}</head>`)
    }

    return `<!doctype html><html><head>${viewport}${sizing}</head><body><main style="width:100%;height:100%;overflow:auto">${input}</main></body></html>`
}

let handler = async (m, { EliteProTech }) => {
    const quoted = m.quoted?.text?.trim()
    const html = quoted ? fitHtmlToChatViewport(quoted) : ''
    if (!html) {
        return await m.reply(`Reply to a text message containing HTML.\n\nUsage: ${global.prefix || ''}sendhtml`)
    }

    try {
        await sendRichHtml(EliteProTech, m.chat, { id: 'elite-html', title: 'ELITE-PRO-V2', html, source: 'eliteprotech' })
    } catch (error) {
        await m.reply(`Unable to send HTML card: ${error.message || String(error)}`)
    }
}

handler.command = ['sendhtml', 'html']
handler.owner = true

export default handler
