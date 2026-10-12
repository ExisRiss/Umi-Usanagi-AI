import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto
} from '@rexxhayanasi/elaina-baileys'
import fs from 'fs'
import sharp from 'sharp'

const THUMB_PATH = './media/menu.png'

let handler = async (m, { conn }) => {
  const scriptUrl = global.scriptUrl || ''
  if (!scriptUrl) {
    return m.reply('URL script belum diatur. Isi `global.scriptUrl` di config.js.')
  }

  const text = `⚡ *INFO SCRIPT USANAGI UMI AI*

Usanagi Umi AI adalah bot WhatsApp multi-device dengan sistem plugin dinamis.

• Menu modern dengan beberapa gaya
• Plugin AI, downloader, game, RPG, grup, maker, dan tools
• Sistem level, limit, premium, jadibot, dan database
• Dukungan bahasa Indonesia dan Inggris

Tekan tombol di bawah untuk membuka halaman script.`

  const rawThumb = fs.existsSync(THUMB_PATH)
    ? fs.readFileSync(THUMB_PATH)
    : Buffer.alloc(0)
  const thumb = await sharp(rawThumb)
    .resize(1280, 720, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 90 })
    .toBuffer()
  const hdImage = await createHighQualityThumbnail(conn, thumb)

  if (!hdImage) return m.reply('Gagal menyiapkan thumbnail script.')

  const msg = generateWAMessageFromContent(
    m.chat,
    proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: '「 𝐔𝐬𝐚𝐧𝐚𝐠𝐢 𝐔𝐦𝐢 𝐀𝐈 • 𝐒𝐜𝐫𝐢𝐩𝐭 」\n',
              hasMediaAttachment: true,
              imageMessage: hdImage
            },
            body: { text },
            footer: { text: `⚡ ${global.namebot || 'Usanagi Umi AI'}` },
            nativeFlowMessage: {
              buttons: [{
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: 'Buka Script',
                  url: scriptUrl,
                  merchant_url: scriptUrl
                })
              }]
            }
          }
        }
      }
    }),
    { userJid: m.sender, quoted: m }
  )

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.help = ['sc', 'script']
handler.tags = ['info']
handler.command = /^(sc|script)$/i

export default handler

async function createHighQualityThumbnail(conn, thumb) {
  try {
    if (!thumb.length) return null
    const { imageMessage } = await prepareWAMessageMedia(
      { image: thumb },
      { upload: conn.waUploadToServer }
    )
    imageMessage.width = 1280
    imageMessage.height = 720
    return imageMessage
  } catch {
    return null
  }
}
