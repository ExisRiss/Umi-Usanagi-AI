/* By AlzRiss - Usanagi Umi AI */

import { transcodeBuffer } from '../../lib/awang-ffmpeg.js'
import { downloadMediaBuffer, getMediaSource, react } from '../../lib/awang-media.js'

const handler = async (m, { rawConn, usedPrefix }) => {
  const source = getMediaSource(m, ['video', 'document'])
  const isDocumentVideo = source?.type === 'document' && String(source.message?.mimetype || '').startsWith('video/')
  const isVideo = source?.type === 'video'

  if (!source || (!isVideo && !isDocumentVideo)) {
    await m.reply(`💬 Reply atau kirim video lalu ketik *${usedPrefix}hdvid*.\nMaksimal: *50 MB*.`)
    return
  }

  await react(rawConn, m, '🕕')
  try {
    const input = await downloadMediaBuffer(source)
    if (input.length > 50 * 1024 * 1024) throw new Error('Ukuran video melebihi batas 50 MB')

    await m.reply('🕕 Meningkatkan video ke resolusi 2×...')
    const output = await transcodeBuffer(input, isDocumentVideo ? 'mp4' : 'mp4', 'mp4', {
      videoFilters: ['scale=iw*2:ih*2:flags=lanczos', 'unsharp=5:5:1.0:5:5:0.0'],
      outputOptions: ['-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'copy', '-movflags', 'faststart'],
      timeoutMs: 300000,
    })

    await rawConn.sendMessage(m.chat, {
      video: output,
      mimetype: 'video/mp4',
      fileName: `HDVID-${Date.now()}.mp4`,
      caption: '✅ *HDVID SELESAI*',
    }, { quoted: m.raw })
    await react(rawConn, m, '✅')
    return { status: true }
  } catch (error) {
    await react(rawConn, m, '❌')
    throw new Error(`HDVid gagal: ${error?.message || 'proses tidak tersedia'}`)
  }
}

handler.command = /^(hdvid|hdvideo|enhancevid|hdv)$/i
handler.help = ['hdvid', 'hdvideo', 'enhancevid', 'hdv']
handler.tags = ['tools']
handler.category = 'tools'
handler.description = 'Meningkatkan resolusi video 2× dengan FFmpeg.'
handler.usage = '.hdvid (reply video)'
handler.example = '.hdvid'
handler.limit = false
handler.premiumOnly = true

export default handler
