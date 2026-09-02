import { sendRichHtml } from '../../lib/richhtml.js'

let handler = async (m, { EliteProTech }) => {
    const quoted = m.quoted?.text?.trim()
    const html = quoted ? `<div style="min-height:392px;padding:22px;border-radius:16px;background:linear-gradient(145deg,#25213d,#101018);border:1px solid #49436e;color:#fff;font-family:Arial">${quoted}</div>` : ''
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
