import { createHash } from 'crypto'
import moment from 'moment-timezone'

let Reg = /^([\w\s]+)\s*[,.|:\/-]\s*(\d{1,3})$/i

let handler = async (m, { text, usedPrefix, command, conn }) => {
  if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {}
  let user = global.db.data.users[m.sender]
  let sn = createHash('md5').update(m.sender).digest('hex')

  if (user.registered) {
    return m.reply(`🍓 Kamu sudah terdaftar di Usanagi Umi AI\n\nKetik:\n${usedPrefix}unreg ${sn}`)
  }

  if (!Reg.test(text)) {
    return m.reply(`🍰 Format salah

Contoh:
${usedPrefix + command} usanagi,17

Gunakan format yang benar`)
  }

  let [_, name, ageStr] = text.match(Reg)
  name = name.trim()
  let age = parseInt(ageStr)

  if (!name || !age) return m.reply('🍓 Nama atau umur tidak valid')
  if (name.length > 100) return m.reply('🍰 Nama maksimal 100 karakter')
  if (age < 5 || age > 100) return m.reply('🍡 Umur harus 5 - 100')

  let d = new Date()
  let week = d.toLocaleDateString('id', { weekday: 'long' })
  let date = d.toLocaleDateString('id', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  let time = moment.tz('Asia/Jakarta').format('HH:mm:ss')

  user.name = name
  user.age = age
  user.regTime = +new Date()
  user.registered = true

  // Simpan segera agar status daftar tidak hilang ketika bot reconnect/crash
  // sebelum jadwal autosave database berikutnya.
  await global.db.write().catch(error => console.error('[REGISTER SAVE]', error))

  let caption = `
🍓 PENDAFTARAN BERHASIL 🍓

🍰 Nama : ${name}
🍡 Umur : ${age}
🍧 SN   : ${sn}

🍥 Tanggal : ${week}, ${date}
🧃 Waktu   : ${time}

✨ Data berhasil disimpan di Usanagi Umi AI
`.trim()

  // Native-flow media forces extra group metadata lookups in Baileys. A
  // plain text confirmation is reliable under WhatsApp's group IQ limits.
  const confirmation = `${caption}\n\nKetik ${usedPrefix}menu untuk membuka menu.`
  try {
    await conn.sendMessage(m.chat, { text: confirmation })
  } catch (error) {
    const message = String(error?.message || '')
    if (!/rate-overlimit|\b429\b/i.test(message)) throw error
    // Registration is already persisted. Do not turn a temporary WhatsApp
    // delivery throttle into an owner error report or duplicate registration.
    console.warn('[REGISTER DELIVERY THROTTLED]', m.chat)
  }
}

handler.help = ['daftar nama,umur']
handler.tags = ['main']
handler.command = /^(daftar|verify|reg(ister)?)$/i

export default handler