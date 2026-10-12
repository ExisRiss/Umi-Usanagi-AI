/* By AlzRiss - Usanagi Umi AI */

import axios from 'axios'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { getFfmpegBinPath } from '../../lib/awang-ytdlp.js'

const BRAND = global.brandCredit || 'By AlzRiss - Usanagi Umi AI'
const CFG = global.rinAPI || {}
const BASE = String(CFG.baseUrl || 'https://apiii-xrina.vercel.app').replace(/\/+$/, '')
const PRIMARY_PATH = String(CFG.bratvid2Path || '/maker/bratvid2')
const FALLBACK_URL = String(CFG.bratvid2FallbackUrl || '')
const TIMEOUT = Number(CFG.timeoutMs) || 180000
const MAX_BYTES = Number(CFG.maxResponseBytes) || 100 * 1024 * 1024

function apiError(data, status) {
  const raw = Buffer.from(data || '').toString('utf8').trim()
  if (!raw) return `API bratvid2 gagal (HTTP ${status}).`

  try {
    const parsed = JSON.parse(raw)
    return String(parsed?.message || parsed?.error || parsed?.reason || `API bratvid2 gagal (HTTP ${status}).`)
  } catch {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
      || `API bratvid2 gagal (HTTP ${status}).`
  }
}

async function fetchBinary(url, input, expected = 'video') {
  const response = await axios.get(url, {
    params: { text: input },
    responseType: 'arraybuffer',
    timeout: TIMEOUT,
    validateStatus: () => true,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    headers: {
      Accept: expected === 'video'
        ? 'video/mp4,video/*,application/octet-stream,application/json'
        : 'image/gif,image/*,application/octet-stream,application/json',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/140 Mobile',
    },
  })

  const type = String(response.headers['content-type'] || '').toLowerCase()
  const data = Buffer.from(response.data || '')
  if (response.status < 200 || response.status >= 300 || type.includes('json')) {
    throw new Error(apiError(data, response.status))
  }
  if (!data.length) throw new Error(`API bratvid2 mengembalikan ${expected} kosong.`)
  return { data, type }
}

function run(command, args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true })
    let stderr = ''
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      error ? reject(error) : resolve()
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(new Error('Konversi bratvid2 timeout.'))
    }, timeoutMs)
    child.stderr?.on('data', chunk => { stderr += chunk.toString() })
    child.on('error', finish)
    child.on('close', code => finish(code === 0 ? null : new Error(stderr.trim().slice(-500) || `ffmpeg keluar dengan kode ${code}`)))
  })
}

async function gifToMp4(gif) {
  const ffmpeg = await getFfmpegBinPath()
  if (!ffmpeg) throw new Error('Binary ffmpeg tidak tersedia.')
  await fs.chmod(ffmpeg, 0o755).catch(() => {})

  const id = crypto.randomBytes(6).toString('hex')
  const input = path.join(os.tmpdir(), `bratvid2-${id}.gif`)
  const output = path.join(os.tmpdir(), `bratvid2-${id}.mp4`)

  try {
    await fs.writeFile(input, gif)
    await run(ffmpeg, [
      '-y', '-i', input,
      '-vf', 'fps=15,scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      output,
    ])
    const video = await fs.readFile(output)
    if (!video.length) throw new Error('Hasil konversi bratvid2 kosong.')
    return video
  } finally {
    await Promise.all([fs.remove(input).catch(() => {}), fs.remove(output).catch(() => {})])
  }
}

async function createBratMedia(input) {
  let primaryError = null
  try {
    const primary = await fetchBinary(`${BASE}${PRIMARY_PATH.startsWith('/') ? '' : '/'}${PRIMARY_PATH}`, input, 'video')
    const kind = primary.type.includes('image/') ? 'image' : 'video'
    return {
      data: primary.data,
      kind,
      mimetype: primary.type.split(';')[0] || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      provider: 'utama',
    }
  } catch (error) {
    primaryError = error
    console.warn(`[BRATVID2] Provider utama gagal: ${error?.message || error}`)
  }

  if (!FALLBACK_URL) throw primaryError

  try {
    const fallback = await fetchBinary(FALLBACK_URL, input, 'gif')
    return {
      data: await gifToMp4(fallback.data),
      kind: 'video',
      mimetype: 'video/mp4',
      provider: 'fallback',
    }
  } catch (fallbackError) {
    throw new Error(`Provider utama: ${primaryError?.message || primaryError}; fallback: ${fallbackError?.message || fallbackError}`)
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const input = String(text || m.quoted?.text || '').trim()
  const prefix = usedPrefix || '.'

  if (!input) {
    await m.reply(`Contoh:\n${prefix}${command || 'bratvid2'} Halo dunia 🤩`)
    return { success: false }
  }

  try {
    await m.react('⏳').catch(() => {})
    const result = await createBratMedia(input)
    const caption = `Bratvid2: ${input}\n\n${BRAND}`
    const payload = result.kind === 'image'
      ? {
          image: result.data,
          mimetype: result.mimetype,
          caption,
        }
      : {
          video: result.data,
          mimetype: result.mimetype,
          fileName: `bratvid2-${Date.now()}.mp4`,
          gifPlayback: true,
          caption,
        }

    await conn.sendMessage(m.chat, payload, { quoted: m.raw || m })

    if (result.provider === 'fallback') console.log('[BRATVID2] Video berhasil dikirim melalui fallback GIF → MP4.')
    await m.react('✅').catch(() => {})
    return { success: true }
  } catch (error) {
    console.error('[BRATVID2]', error?.message || error)
    await m.react('❌').catch(() => {})
    await m.reply(`❌ Gagal membuat bratvid2.\n\n${error?.message || error}\n\n${BRAND}`)
    return { success: false }
  }
}

handler.help = ['bratvid2 <teks>', 'brat2 <teks>']
handler.tags = ['maker']
handler.command = /^(bratvid2|brat2)$/i
handler.limit = true
handler.description = 'Membuat video Brat dengan fallback otomatis ketika API utama bermasalah'

export default handler
