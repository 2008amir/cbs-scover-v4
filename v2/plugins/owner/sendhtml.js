import { sendRichHtml } from '../../lib/richhtml.js'

const PREVIEW_HEIGHT = 588

function fitHtmlToChatViewport(input) {
    const viewport = '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">'
    const sizing = `<style id="elite-chat-preview">:root{width:100%!important;height:100%!important;overflow:hidden!important}*{box-sizing:border-box;max-width:100%!important}html,body{margin:0!important;width:100%!important;height:${PREVIEW_HEIGHT}px!important;max-height:100dvh!important;overflow:hidden!important}body{position:relative}body>*{min-height:0!important;max-height:100%!important;overflow:auto!important}img,video,canvas,svg,iframe{max-width:100%!important;max-height:100%!important;object-fit:contain}</style>`

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
