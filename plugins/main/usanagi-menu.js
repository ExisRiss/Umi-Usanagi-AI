/* By AlzRiss - Usanagi Umi AI */

import fs from 'fs'
import { prepareWAMessageMedia } from '@rexxhayanasi/elaina-baileys'
import { settings } from '../../config/settings.js'
import { buildMenuFooter, buildCategoryList, getGreeting, resolveMenuMention } from '../../lib/awang-menu.js'
import { ButtonV2 } from '../../lib/awang-tombol.js'
import { isOwner, resolvePhoneNumber } from '../../lib/awang-cekakses.js'
import { getUser } from '../../core/awang-userdb.js'
import { creatorWatermark } from '../../core/awang-identitas.js'
import { getMenuStyle } from '../../core/awang-menu-config.js'
import { sendModernMenu } from '../../lib/awang-menu.js'
import { readMenuMedia } from '../../lib/menu-media.js'

const handler = async (m, { conn, usedPrefix }) => {
  if (getMenuStyle() === 'modern') {
    await sendModernMenu(conn, m, usedPrefix)
    return
  }
  const mention = await resolveMenuMention(m, conn)
  const subtitle = `${getGreeting()} ${mention.text}`
  const isOwnerUser = await isOwner(m.sender, conn)
  const user = await getUser(m.sender)
  const contactNumber = await resolvePhoneNumber(m.sender, conn)


  const footerLong = buildMenuFooter({
    prefix: usedPrefix,
    pushName: m.pushName,
    contactNumber,
    isOwnerUser,
    registeredAt: user?.registeredAt,
  }) + '\n\n' + creatorWatermark()


  const rawSections = buildCategoryList({ prefix: usedPrefix }).sections
  const sections = rawSections.map((section) => ({
    title: section.title,
    highlight_label: section.highlightLabel || '',
    rows: section.rows.map((row) => ({
      header: row.header || '',
      title: row.title,
      description: row.description || '',
      id: row.command,
    })),
  }))

  const button = new ButtonV2(conn)
    .setTitle(settings.botName)
    .setSubtitle(subtitle)
    .setContextInfo({ mentionedJid: mention.jid ? [mention.jid] : [] })
    .setBody(' ') .setFooter(footerLong)

  const menuMedia = readMenuMedia(conn)
  const preparedMedia = await prepareWAMessageMedia(
    menuMedia.type === 'image'
      ? { image: menuMedia.data, mimetype: menuMedia.mimetype }
      : { video: menuMedia.data, mimetype: menuMedia.mimetype },
    { upload: conn.waUploadToServer }
  )
  if (preparedMedia.imageMessage) button.setMedia({ headerType: 4, imageMessage: preparedMedia.imageMessage })
  if (preparedMedia.videoMessage) button.setMedia({ headerType: 5, videoMessage: preparedMedia.videoMessage })

  button.addButton('♕ OWNER BOT', `${usedPrefix}owner`)

  button.addRawButton({
    buttonText: { displayText: '☰ LIST MENU' },
    buttonId: 'menu',
    type: 1,
    nativeFlowInfo: {
      name: 'single_select',
      paramsJson: JSON.stringify({
        title: `${settings.botName} Menu`,
        sections: sections,
      }),
    },
  })

  await button.send(m.chat, { quoted: m.raw })
}

handler.command = /^menu$/i
handler.help = ['menu']
handler.tags = ['main']
handler.description = 'Menampilkan menu utama bot'

export default handler