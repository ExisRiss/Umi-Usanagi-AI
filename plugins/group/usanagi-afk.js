/* By AlzRiss - Usanagi Umi AI */

import { setAfk } from '../../core/awang-afk.js'

const handler = async (m, { conn }) => {
  const reason = String(m.text || '').trim()
  setAfk(m.sender, reason)

  const tag = m.sender.split('@')[0]

  await conn.sendMessage(
    m.chat,
    {
      text: [
        '╭─〔 AFK 〕',
        '│',
        `│ @${tag} sekarang AFK.`,
        `│ Alasan : *${reason || 'Tidak ada alasan'}*`,
        '│',
        '│ Kirim pesan apa saja untuk',
        '│ mengakhiri status AFK.',
        '╰──────────────',
      ].join('\n'),
      mentions: [m.sender],
    },
    { quoted: m.raw }
  )
}

handler.command = /^(afk|away|brb)$/i
handler.help = ['afk']
handler.tags = ['group']
handler.category = 'group'
handler.description = 'Menandai status AFK dengan alasan'
handler.cooldown = 5

export default handler
