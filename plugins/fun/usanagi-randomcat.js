/* Clean-room random-cat feature from the Luna command checklist. */

const CAT_API = 'https://cataas.com/cat?json=true'
const MAX_IMAGE_BYTES = 7 * 1024 * 1024

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'error' })
  } finally {
    clearTimeout(timer)
  }
}

async function randomCatImage() {
  const metadataResponse = await fetchWithTimeout(CAT_API, { headers: { Accept: 'application/json' } }, 10000)
  if (!metadataResponse.ok) throw new Error(`Layanan gambar merespons HTTP ${metadataResponse.status}.`)
  const metadata = await metadataResponse.json()
  const relativePath = String(metadata?.url || '')
  const imageUrl = new URL(relativePath, 'https://cataas.com')
  if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'cataas.com' || !/^\/cat(?:\/|$)/.test(imageUrl.pathname)) {
    throw new Error('Layanan gambar memberikan alamat yang tidak valid.')
  }

  const imageResponse = await fetchWithTimeout(imageUrl, { headers: { Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8' } })
  if (!imageResponse.ok) throw new Error(`Gambar tidak tersedia (HTTP ${imageResponse.status}).`)
  const contentType = String(imageResponse.headers.get('content-type') || '').toLowerCase()
  const declaredLength = Number(imageResponse.headers.get('content-length') || 0)
  if (!contentType.startsWith('image/') || (declaredLength && declaredLength > MAX_IMAGE_BYTES)) throw new Error('Ukuran atau format gambar tidak aman.')
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar tidak aman.')
  return { buffer, contentType: contentType.split(';')[0] || 'image/jpeg' }
}

const handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, { react: { text: '🐾', key: m.raw?.key || m.key } }).catch(() => {})
    const image = await randomCatImage()
    await conn.sendMessage(m.chat, {
      image: image.buffer,
      mimetype: image.contentType,
      caption: '🐱 *KUCING ACAK*',
    }, { quoted: m.raw || m })
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.raw?.key || m.key } }).catch(() => {})
  } catch {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.raw?.key || m.key } }).catch(() => {})
    await m.reply('❌ Gambar kucing sedang tidak tersedia. Coba lagi nanti.')
  }
}

handler.help = ['cat', 'randomkucing']
handler.tags = ['fun']
handler.command = /^(cat|randomkucing|kucing)$/i
handler.category = 'fun'
handler.description = 'Mengirim gambar kucing acak dari sumber gambar tetap yang tervalidasi'
handler.limit = true

export { randomCatImage }
export default handler
