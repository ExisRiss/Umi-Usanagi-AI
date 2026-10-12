/* By AlzRiss - Usanagi Umi AI */

const afkState = new Map()

export function setAfk(jid, reason) {
  if (!jid) return null
  const entry = { reason: String(reason || '').trim() || 'Tidak ada alasan', since: Date.now() }
  afkState.set(jid, entry)
  return entry
}

export function getAfk(jid) {
  if (!jid) return null
  return afkState.get(jid) || null
}

export function removeAfk(jid) {
  if (!jid) return false
  return afkState.delete(jid)
}

export function isAfk(jid) {
  return Boolean(jid && afkState.has(jid))
}

export function formatAfkDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours} jam ${minutes} menit`
  if (minutes > 0) return `${minutes} menit ${seconds} detik`
  return `${seconds} detik`
}

export default { setAfk, getAfk, removeAfk, isAfk, formatAfkDuration }
