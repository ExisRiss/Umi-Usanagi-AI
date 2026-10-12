// plugins/downloader/spotify.js
import fetch from 'node-fetch'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `*Contoh:* ${usedPrefix + command} https://open.spotify.com/track/...`

  try {
    let res
    if (text.includes('track')) {
      res = await spotSaverTrackDownload(text)
    } else if (text.includes('playlist')) {
      res = await spotSaverPlaylistDownload(text)
    } else if (text.includes('album')) {
      res = await spotSaverAlbumDownload(text)
    } else if (text.includes('artist')) {
      res = await spotSaverArtistDownload(text)
    } else {
      res = await spotSaverSearch(text)
    }

    if (!res || !res.success) throw 'Tidak dapat menemukan hasil untuk tautan tersebut'

    const { data } = res
    if (Array.isArray(data)) {
      // Hasil pencarian
      let teks = `*Hasil Pencarian:*\n\n`
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        teks += `*${i + 1}.* ${data[i].title}\n`
        teks += `🎵 ${data[i].artists}\n`
        teks += `🔗 ${data[i].url}\n\n`
      }
      teks += `*Contoh:* ${usedPrefix + command} ${data[0].url}`
      m.reply(teks)
    } else {
      // Hasil unduhan
      const { title, artists, cover, url } = data
      const caption = `*Judul:* ${title}\n*Artis:* ${artists}\n*URL:* ${url}`

      if (cover) {
        await conn.sendFile(m.chat, cover, 'cover.jpg', caption, m)
      } else {
        m.reply(caption)
      }

      if (url) {
        await conn.sendFile(m.chat, url, 'audio.mp3', '', m, null, { mimetype: 'audio/mpeg' })
      }
    }
  } catch (e) {
    console.error(e)
    throw `Terjadi kesalahan: ${e.message}`
  }
}

handler.help = ['spotify'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(spotify|spotdl|spdl)$/i

export default handler

async function spotSaverSearch(query) {
  if (!query) throw new Error('Query diperlukan')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://spotsaver.net/',
    'Origin': 'https://spotsaver.net'
  }

  try {
    const searchUrl = new URL('https://spotsaver.net/api/search')
    searchUrl.searchParams.append('q', query)
    const res = await fetch(searchUrl.toString(), { headers })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    const data = await res.json()
    return data
  } catch (error) {
    throw new Error(`SpotSaver search error: ${error.message}`)
  }
}

async function spotSaverTrackDownload(trackUrl) {
  if (!trackUrl) throw new Error('Track URL diperlukan')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://spotsaver.net/',
    'Origin': 'https://spotsaver.net'
  }

  try {
    const res = await fetch('https://spotsaver.net/api/spotify-track-downloader', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: trackUrl })
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    const data = await res.json()
    return data
  } catch (error) {
    throw new Error(`SpotSaver track download error: ${error.message}`)
  }
}

async function spotSaverPlaylistDownload(playlistUrl) {
  if (!playlistUrl) throw new Error('Playlist URL diperlukan')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://spotsaver.net/',
    'Origin': 'https://spotsaver.net'
  }

  try {
    const res = await fetch('https://spotsaver.net/api/spotify-playlist-downloader', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: playlistUrl })
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    const data = await res.json()
    return data
  } catch (error) {
    throw new Error(`SpotSaver playlist download error: ${error.message}`)
  }
}

async function spotSaverAlbumDownload(albumUrl) {
  if (!albumUrl) throw new Error('Album URL diperlukan')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://spotsaver.net/',
    'Origin': 'https://spotsaver.net'
  }

  try {
    const res = await fetch('https://spotsaver.net/api/spotify-album-downloader', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: albumUrl })
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    const data = await res.json()
    return data
  } catch (error) {
    throw new Error(`SpotSaver album download error: ${error.message}`)
  }
}

async function spotSaverArtistDownload(artistUrl) {
  if (!artistUrl) throw new Error('Artist URL diperlukan')
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://spotsaver.net/',
    'Origin': 'https://spotsaver.net'
  }

  try {
    const res = await fetch('https://spotsaver.net/api/spotify-artist-downloader', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: artistUrl })
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    const data = await res.json()
    return data
  } catch (error) {
    throw new Error(`SpotSaver artist download error: ${error.message}`)
  }
}