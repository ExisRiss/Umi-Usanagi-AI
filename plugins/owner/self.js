/* By AlzRiss - Usanagi Umi AI */

import { saveJadibotConfig } from '../../lib/bot-config.js'

let handler = async (m, { command, conn }) => {
  const profile = conn?.botConfig

  if (profile?.type === 'jadibot') {
    const nextPublic = command === 'public'
    if (profile.public === nextPublic) {
      return m.reply(`Bot sudah mode ${nextPublic ? 'PUBLIC' : 'SELF'}`)
    }
    profile.public = nextPublic
    saveJadibotConfig(profile)
    return m.reply(nextPublic
      ? '✅ Bot masuk mode PUBLIC dan dapat dipakai semua orang.'
      : '✅ Bot masuk mode SELF. Hanya owner bot, developer terkunci, dan bot sendiri yang dapat memakai command.')
  }

  if (!global.db.data.settings) global.db.data.settings = {}
  if (!global.db.data.settings[m.conn.user.jid]) global.db.data.settings[m.conn.user.jid] = { public: true }
  const settings = global.db.data.settings[m.conn.user.jid]

  if (command === 'self') {
    if (!settings.public) return m.reply('Bot sudah mode SELF')
    settings.public = false
    return m.reply('✅ Bot masuk mode SELF')
  }

  if (settings.public) return m.reply('Bot sudah mode PUBLIC')
  settings.public = true
  return m.reply('✅ Bot masuk mode PUBLIC')
}

handler.help = ['self', 'public']
handler.tags = ['owner']
handler.command = /^(self|public)$/i
handler.owner = true

export default handler
