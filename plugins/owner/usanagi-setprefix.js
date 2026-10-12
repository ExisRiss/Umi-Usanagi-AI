/* By AlzRiss - Usanagi Umi AI */

import { setPrefix, resetPrefix } from '../../core/awang-prefix.js'

const handler = async (m, { conn, usedPrefix, botConfig, prefixStorageKey }) => {
  const newPrefix = m.args[0]
  const storageKey = prefixStorageKey || m.prefixStorageKey || m.chat
  const defaultPrefix = botConfig?.defaultPrefix || '.'

  if (!newPrefix) {
    await conn.sendMessage(
      m.chat,
      { text: `Prefix aktif saat ini: *${usedPrefix}*\n\nCara pakai:\n${usedPrefix}setprefix <prefix_baru>\n${usedPrefix}setprefix default` },
      { quoted: m.raw }
    )
    return
  }

  if (newPrefix.toLowerCase() === 'default') {
    const reverted = await resetPrefix(storageKey, defaultPrefix)
    await conn.sendMessage(m.chat, { text: `Prefix dikembalikan ke default: *${reverted}*` }, { quoted: m.raw })
    return
  }

  if (newPrefix.length > 3) {
    await conn.sendMessage(m.chat, { text: 'Prefix maksimal 3 karakter.' }, { quoted: m.raw })
    return
  }

  await setPrefix(storageKey, newPrefix)
  await conn.sendMessage(
    m.chat,
    { text: `Prefix berhasil diubah menjadi: *${newPrefix}*\n\nContoh: ${newPrefix}menu` },
    { quoted: m.raw }
  )
}

handler.command = /^setprefix$/i
handler.help = ['setprefix']
handler.tags = ['owner']
handler.description = 'Mengubah prefix bot untuk chat ini'
handler.ownerOnly = true

export default handler
