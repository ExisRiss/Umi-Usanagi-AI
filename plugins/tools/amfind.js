/*
# Name : Preset AlightMotion Finder
# Type : ESM
# Url : https://bintangapi.my.id
# By AlzRiss - Usanagi Umi AI
*/

import axios from 'axios'

let handler = async (m, { conn, usedPrefix, command, text }) => {
    try {
        const url = text?.trim()

        if (!url) {
            return m.reply(
                `❌ Masukkan link TikTok.\n\n` +
                `Contoh:\n${usedPrefix + command} https://vt.tiktok.com/ZSb5ce1L7/`
            )
        }

        if (!/tiktok\.com/i.test(url)) {
            return m.reply('❌ URL harus berupa link TikTok yang valid.')
        }

        // Loading reaction
        try {
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
        } catch {}

        const { data } = await axios.get(
            'https://bintangapi.my.id/api/amfind/',
            {
                params: { url },
                headers: {
                    Accept: '*/*',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    Connection: 'keep-alive',
                    Origin: 'https://starlabs.biz.id',
                    Referer: 'https://starlabs.biz.id/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
                },
                timeout: 30000
            }
        )

        if (!data?.success || !data?.data) {
            throw new Error('Preset tidak ditemukan.')
        }

        /*
         * =========================
         * DATA API
         * =========================
         */

        const result = data.data || {}
        const video = result.video || {}
        const user = result.user || {}
        const preset = result.preset || {}

        // Fallback Agresif: Cari data di berbagai properti yang sering dipakai API TikTok
        // Berjaga-jaga jika format API terkadang mengembalikan field yang berbeda
        const rawViews = video.views ?? video.play_count ?? video.playCount ?? result.views ?? result.play_count ?? 0
        const rawLikes = video.likes ?? video.digg_count ?? video.diggCount ?? result.likes ?? result.digg_count ?? 0
        const rawComments = video.comments ?? video.comment_count ?? video.commentCount ?? result.comments ?? result.comment_count ?? 0

        // Parse ke Number agar formatNumber tidak bentrok (Jika NaN/Undefined paksa jadi 0)
        const views = Number(rawViews) || 0
        const likes = Number(rawLikes) || 0
        const comments = Number(rawComments) || 0

        const duration = video.duration ?? 0
        const caption = video.caption ?? '-'

        /*
         * =========================
         * PRESET ITEMS
         * =========================
         */

        const items = Array.isArray(preset.items) ? preset.items : []

        /*
         * =========================
         * TEXT RESULT
         * =========================
         */

        let resultText =
`╭─「 *ALIGHT MOTION PRESET* 」
│
│ 👤 *Creator:* ${user.display_name || '-'}
│ 🔗 *Username:* @${user.username || '-'}
│
│ 🎬 *Caption:*
│ ${caption}
│
│ 👁️ *Views:* ${formatNumber(views)}
│ ❤️ *Likes:* ${formatNumber(likes)}
│ 💬 *Comments:* ${formatNumber(comments)}
│ ⏱️ *Duration:* ${duration}s
│
│ 📦 *Preset:*
│ ${preset.is_reply ? 'Reply Comment' : 'Comment'}
│ ${preset.is_author ? 'Author' : 'User'}
╰─────────────────`

        /*
         * =========================
         * DOWNLOAD LINKS
         * =========================
         */

        if (items.length > 0) {
            resultText += `\n\n╭─「 *DOWNLOAD PRESET* 」`
            for (const item of items) {
                if (!item?.url) continue
                resultText += `\n│ 📁 *${item.label || 'Preset'}*\n│ 🔗 ${item.url}\n`
            }
            resultText += `╰─────────────────`
        }

        /*
         * =========================
         * TIKTOK
         * =========================
         */

        if (video.url) {
            resultText += `\n\n🎥 *TikTok:*\n${video.url}`
        }

        /*
         * =========================
         * SEND THUMBNAIL
         * =========================
         */

        if (result.thumbnail) {
            try {
                await conn.sendMessage(
                    m.chat,
                    { image: { url: result.thumbnail }, caption: resultText },
                    { quoted: m }
                )
            } catch (err) {
                await m.reply(resultText)
            }
        } else {
            await m.reply(resultText)
        }

        // Success reaction
        try {
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        } catch {}

    } catch (e) {
        // Error reaction
        try {
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        } catch {}

        const error = e.response?.data
            ? (typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data, null, 2))
            : e.message

        return m.reply(`❌ Terjadi kesalahan:\n${error}`)
    }
}

function formatNumber(number) {
    // Validasi tambahan agar tidak error saat toLocaleString
    const num = Number(number);
    if (isNaN(num)) return '0';
    return num.toLocaleString('id-ID');
}

handler.help = ['amfind <url>']
handler.tags = ['tools']
handler.command = ['amfind', 'amfinder']

export default handler