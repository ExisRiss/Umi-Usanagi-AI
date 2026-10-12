export async function handler(m,{sock,conn}) {
  await m.reply('RIMURU siap: .rimuru-test')
  await conn.reply(m.chat,'OURIN via conn: .ourin-test',m)
  await sock.sendMessage(m.chat,{text:'OURIN aktif: .ourin-test',contextInfo:{externalAdReply:{title:'Rimuru status',body:'ourin body'}}})
}
