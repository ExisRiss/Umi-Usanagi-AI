import fs from 'node:fs'
/* Audited compatibility boundary for Usanagi Umi feature bridges. No vendor accounts/keys. */
import { AsyncLocalStorage } from 'node:async_hooks'
import path from 'node:path'
const scope = new AsyncLocalStorage(), modules = new Map(), cooldowns = new Map()
export function createVendorConfig(source) {
  const emptyKeys = new Proxy({}, { get: () => '' })
  return new Proxy({}, { get(_target, key) {
    const ctx = scope.getStore() || {}, cfg = ctx.extra?.botConfig?.values || {}
    const botName = cfg.nameBot || cfg.botName || global.namebot || 'Usanagi Umi AI'
    const prefix = ctx.extra?.usedPrefix || '/'
    const objects = {
      bot: { name:botName, prefix, version:'10.1.0', developer:global.developer || 'AlzRiss', public:true },
      owner: { name:'Owner', number:String(global.owner?.[0]?.[0] || '').replace(/\D/g,''), numbers:(global.owner || []).map(v=>v[0]) },
      sticker: { packname:global.packname || botName, author:global.author || 'By AlzRiss - Usanagi Umi AI' },
      info: { website:'https://website-jadibot-by-alzriss.vercel.app' },
      saluran: { name:botName, id:global.newsletter?.jid || '', link:cfg.links?.channel || global.saluran || '' },
      APIkey:emptyKeys, apiKey:emptyKeys, apikey:emptyKeys,
      limits: { defaultLimit:50, maxFileSize:50*1024*1024 },
      energi: { default:50, max:100 },
      assets: { thumbnail:'./media/thumbnail.jpg', menu:'./media/menu.png', games:'./media/menu.png', rpg:'./media/menu.png', winner:'./media/menu.png' },
      features: { registration:false, autoRead:false }, mode:{public:true}, groupProtection:{},
      registration:{enabled:false}, bannedUsers:[], ui:{}, db:{}, donasi:{},
    }
    if (key in objects) return objects[key]
    if (key==='prefix') return prefix
    if (key==='name') return botName
    if (key==='version') return '10.1.0'
    if (key==='timezone') return 'Asia/Makassar'
    return undefined
  } })
}
function currentData() { return global.db?.data || {users:{},chats:{},settings:{},stats:{}} }
// Rebrand text at the outbound compatibility boundary. Source code can retain
// audited implementation details, while users never receive legacy branding.
function umiBrandText(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/\b(?:rimuru|ourin)-/gi, 'umi-')
    .replace(/(?<=\.)\b(?:rimuru|ourin)\b/gi, 'umi')
    .replace(/\b(?:rimuru|ourin)\b/gi, 'Usanagi Umi')
    .replace(/𝑹𝑰𝑴𝑼𝑹𝑼|𝑶𝑼𝑹𝑰𝑵/g, 'USANAGI UMI')
}
function umiBrandPayload(payload) {
  if (!payload || typeof payload !== 'object' || Buffer.isBuffer(payload)) return payload
  if (Array.isArray(payload)) return payload.map(umiBrandPayload)
  const result = { ...payload }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string' && ['text','caption','title','body','footer','fileName'].includes(key)) result[key] = umiBrandText(value)
    else if (value && typeof value === 'object') result[key] = umiBrandPayload(value)
  }
  return result
}
function userDefaults(jid) {
  const data = currentData(); data.users ||= {}; const user = data.users[jid] ||= {}
  for (const [k,v] of Object.entries({exp:0,level:0,money:0,limit:50,registered:false,health:100,stamina:100,hunger:100})) user[k] ??= v
  return new Proxy(user, { get(t,k) {
    if (k==='koin'||k==='balance') return t.money
    if (k==='energi'||k==='energy') return t.importedEnergy ??= 100
    if (k==='name') return t.name || jid.split('@')[0]
    if (k==='premium') return Number(t.premiumTime || 0)>Date.now()
    return t[k]
  }, set(t,k,v) { if(k==='koin'||k==='balance') k='money';if(k==='energi'||k==='energy') k='importedEnergy';t[k]=v;return true } })
}
const dbBridge = {
  getUser: userDefaults,
  setUser(jid, patch) { const user=userDefaults(jid);Object.assign(user,patch||{});return user },
  getGroup(jid) { const d=currentData();d.chats ||= {};return d.chats[jid] ||= {} },
  setGroup(jid,patch) { return Object.assign(this.getGroup(jid),patch||{}) },
  getAllUsers() { return currentData().users || {} },getAllGroups() { return currentData().chats || {} },
  getUserCount() { return Object.keys(this.getAllUsers()).length },
  setting(key,value) { const d=currentData();d.importedSettings ||= {};const ctx=scope.getStore();const bucket=d.importedSettings[ctx?.extra?.botConfig?.scope || 'main'] ||= {};if(arguments.length>1) bucket[key]=value;return bucket[key] },
  getSettings() { const d=currentData();d.importedSettings ||= {};return d.importedSettings[scope.getStore()?.extra?.botConfig?.scope || 'main'] ||= {} },
  updateKoin(jid,amount) { const u=userDefaults(jid);u.koin=Math.max(0,Number(u.koin||0)+Number(amount||0));return u.koin },
  updateSaldo(jid,amount) { const u=userDefaults(jid);u.saldo=Math.max(0,Number(u.saldo||0)+Number(amount||0));return u.saldo },
  updateExp(jid,amount) { const u=userDefaults(jid);u.exp=Math.max(0,Number(u.exp||0)+Number(amount||0));return u.exp },
  updateEnergi(jid,amount) { const u=userDefaults(jid);u.energi=Math.max(0,Number(u.energi||0)+Number(amount||0));return u.energi },
  checkCooldown(jid,key,seconds=0) { return Math.max(0,(cooldowns.get(jid+':'+key)||0)+Number(seconds)*1000-Date.now()) },
  setCooldown(jid,key) { cooldowns.set(jid+':'+key,Date.now()) },
  getTopUsers(field='exp',limit=10) {return Object.entries(this.getAllUsers()).sort((a,b)=>Number(b[1][field]||0)-Number(a[1][field]||0)).slice(0,limit).map(([jid,u])=>({jid,...u}))},
  incrementStat(key) { const d=currentData();d.importedStats ||= {};d.importedStats[key]=(d.importedStats[key]||0)+1 },
  getStats() {return currentData().importedStats || {}},
  save() { global.db?.write?.()?.catch?.(()=>{});return true },write() {return this.save()},markDirty() {return true},flushAll() {return this.save()},readAll() {return true},
  deleteUser() {throw new Error('Penghapusan database melalui pelengkap diblokir.')},resetToDefaults() {throw new Error('Reset database melalui pelengkap diblokir.')},
  get users(){return currentData().users},get groups(){return currentData().chats},get settings(){return this.getSettings()},get stats(){return this.getStats()},
  get data(){const d=currentData();return {...d,groups:d.chats}},get db(){return {data:this.data}},
}
export function getImportedDatabase() { return dbBridge }
export class ImportedDatabase { constructor(){return dbBridge} }
export async function initImportedDatabase(){return dbBridge}
function sockAdapter(conn) {
  const sendMessage = (jid, payload, options = {}) => conn.sendMessage(jid, umiBrandPayload(payload), options)
  const media = async(jid,input,caption,quoted,options={}) => {
    if (caption && typeof caption==='object') {options=quoted||{};quoted=caption;caption=''}
    const type=options.type || (/\.(?:mp3|ogg|wav|m4a)(?:\?|$)/i.test(String(input))?'audio':/\.(?:mp4|webm)(?:\?|$)/i.test(String(input))?'video':'image')
    const data=Buffer.isBuffer(input)?input:{url:String(input)}
    const payload={ [type]:data,...(caption?{caption:String(caption)}:{}),...(type==='audio'?{mimetype:options.mimetype||'audio/mpeg',ptt:Boolean(options.ptt)}:{}),...(options.fileName?{fileName:options.fileName}:{}),...(options.contextInfo?{contextInfo:options.contextInfo}:{}),...(options.mentions?{mentions:options.mentions}:{}) }
    return sendMessage(jid,payload,{quoted:quoted||undefined})
  }
  const fallback={
    sendMessage,
    reply:(jid,text,quoted,options={})=>conn.reply(jid,umiBrandText(text),quoted,options),
    sendMedia:media,
    sendText:(jid,text,quoted,opts={})=>sendMessage(jid,{text:String(text),...opts},{quoted}),
    sendTextWithMentions:(jid,text,quoted,opts={})=>sendMessage(jid,{text:String(text),mentions:[...String(text).matchAll(/@(\d{6,16})/g)].map(m=>m[1]+'@s.whatsapp.net'),...opts},{quoted}),
    sendPreview:(jid,opts,options={})=>sendMessage(jid,{text:String(opts.caption||opts.description||opts.title||''),...(opts.jpegThumbnail?{contextInfo:{externalAdReply:{title:opts.title||'',body:opts.description||'',thumbnail:opts.jpegThumbnail,sourceUrl:opts.url||'',mediaType:1}}}:{})},options),
    decodeJid:jid=>String(jid||'').replace(/:\d+(?=@)/,''),
    sendImage:(jid,image,caption,quoted,opts)=>media(jid,image,caption,quoted,{...opts,type:'image'}),
    sendVideo:(jid,video,caption,quoted,opts)=>media(jid,video,caption,quoted,{...opts,type:'video'}),
    sendAudio:(jid,audio,quoted,opts)=>media(jid,audio,'',quoted,{...opts,type:'audio'}),
  }
  return new Proxy(conn,{get(t,k){if(k in fallback)return fallback[k];const value=t[k];return typeof value==='function'?value.bind(t):value}})
}
export async function runImportedFeature(source,file,meta,m,extra) {
  if(/^(?:spam|bomb|crash|bugwa)/i.test(path.basename(file)))return {success:false}
  const key=`${extra.botScope || extra.conn.user?.id}:${source}:${file}`
  const coolKey=`${key}:${m.chat}:${m.sender}`
  const remaining=Number(meta.cooldown||0)*1000-(Date.now()-(cooldowns.get(coolKey)||0))
  if(remaining>0) {await m.reply(`Tunggu ${Math.ceil(remaining/1000)} detik sebelum memakai fitur ini lagi.`);return {success:false}}
  const context={m,extra,source}
  return scope.run(context,async()=>{
    let failed=false
    const message=Object.create(m)
    const command=meta.aliasMap?.[extra.command]||String(extra.command||'').replace(new RegExp('^'+source+'-'),'')
    const mutableFields={text:extra.text||'',body:m.text,command,args:extra.args||[],prefix:extra.usedPrefix,isOwner:Boolean(extra.isOwner),isAdmin:Boolean(extra.isAdmin),isBotAdmin:Boolean(extra.isBotAdmin),isPremium:Boolean(extra.isPrems),pushName:m.pushName||m.name||'User'}
    // Baileys serializes several message helpers as inherited getter-only
    // properties. Define own properties on the compatibility facade instead of
    // assigning through the prototype chain, which is illegal in strict ESM.
    for(const [key,value] of Object.entries(mutableFields)) Object.defineProperty(message,key,{value,writable:true,configurable:true,enumerable:true})
    Object.defineProperties(message,{
      reply:{value:async(text,opts)=>{if(typeof text==='string'&&/^(?:❌|☢|Error:|Gagal)/i.test(text.trim()))failed=true;return extra.conn.reply(m.chat,umiBrandText(text),opts?.quoted===false?null:m,opts||{})},writable:true,configurable:true,enumerable:true},
      react:{value:async emoji=>{if(/[❌☢⚠]/u.test(String(emoji)))failed=true;try{return await extra.conn.sendMessage(m.chat,{react:{text:String(emoji),key:m.key}})}catch{return null}},writable:true,configurable:true,enumerable:true},
      limit:{value:{active:Number(meta.energi||meta.limit||0)>0,success(){return true},fail(){failed=true;return true}},writable:true,configurable:true,enumerable:true}
    })
    try {
      let loaded=modules.get(key)
      if(!loaded){const url=new URL(`../integrations/${source}/${file}`,import.meta.url);url.searchParams.set('scope',String(extra.botScope||extra.conn.user?.id));loaded=await import(url.href);modules.set(key,loaded)}
      const handler=loaded.handler||loaded.default?.handler||(typeof loaded.default==='function'?loaded.default:null)
      if(typeof handler!=='function')throw new Error('Format handler pelengkap tidak didukung.')
      const adaptedConn=sockAdapter(extra.conn)
      const result=await handler(message,{...extra,sock:adaptedConn,conn:adaptedConn,store:extra.conn.store||{},config:createVendorConfig(source),plugins:global.plugins,db:dbBridge,isOwner:Boolean(extra.isOwner),isAdmin:Boolean(extra.isAdmin),isBotAdmin:Boolean(extra.isBotAdmin),isPremium:Boolean(extra.isPrems)})
      if(!failed&&result?.success!==false)cooldowns.set(coolKey,Date.now())
      return {success:!failed&&result?.success!==false}
    }catch(error){await m.reply(`Fitur Usanagi Umi/${meta.name}: ${String(error?.message||'gagal').replace(/(?:gsk_|ptlc_|vcp_|ghp_)[\w-]{16,}/g,'<redacted>').slice(0,180)}. Beberapa fitur memerlukan API pihak ketiga milik owner.`);return {success:false}}
  })
}

export function getImportedAssetBuffer() {
  for(const file of ['./media/thumbnail.jpg','./media/menu.png','./assets/image/menu.png']) {
    try {const target=path.resolve(process.cwd(),file);if(fs.statSync(target).size<4*1024*1024)return fs.readFileSync(target)}catch{}
  }
  return null
}
export async function preloadImportedAssets() { return true }
export function rejectImportedAssetUpdate() { throw new Error('Gunakan Settings/media native untuk mengubah aset bot; konfigurasi global dilindungi.') }

export function isImportedOwner(jid) {const ctx=scope.getStore();return Boolean(ctx?.extra?.isOwner && (!jid || String(jid).replace(/:\d+(?=@)/,'').split('@')[0]===String(ctx.m?.sender||'').replace(/:\d+(?=@)/,'').split('@')[0]))}
export function isImportedPremium(jid) {const ctx=scope.getStore();return Boolean(ctx?.extra?.isPrems && (!jid || String(jid).replace(/:\d+(?=@)/,'').split('@')[0]===String(ctx.m?.sender||'').replace(/:\d+(?=@)/,'').split('@')[0]))}
