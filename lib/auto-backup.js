/* By AlzRiss - Usanagi Umi AI */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import archiver from 'archiver'

const ROOT = process.cwd()
const state = {
  timer: null,
  running: false,
  nextRetryAt: 0,
  conn: null,
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const normalize = value => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '')

function config() {
  const value = global.autoBackup || {}
  return {
    enabled: value.enabled !== false,
    timezone: value.timezone || 'Asia/Makassar',
    hour: Math.max(0, Math.min(23, Number(value.hour) || 0)),
    minute: Math.max(0, Math.min(59, Number(value.minute) || 0)),
    checkIntervalMs: Math.max(60_000, Number(value.checkIntervalMs) || 60_000),
    retryDelayMs: Math.max(300_000, Number(value.retryDelayMs) || 900_000),
    partTargetBytes: Math.max(5 * 1024 * 1024, Number(value.partTargetBytes) || 30 * 1024 * 1024),
    maxPartBytes: Math.max(10 * 1024 * 1024, Number(value.maxPartBytes) || 45 * 1024 * 1024),
    retentionDays: Math.max(1, Number(value.retentionDays) || 3),
    outputDirectory: path.resolve(ROOT, value.outputDirectory || 'data/auto-backups'),
    exclude: new Set((value.exclude || []).map(normalize).filter(Boolean)),
  }
}

function localDateParts(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return {
    date: `${value.year}-${value.month}-${value.day}`,
    stamp: `${value.year}${value.month}${value.day}-${value.hour}${value.minute}`,
    hour: Number(value.hour),
    minute: Number(value.minute),
  }
}

function excluded(relative, cfg) {
  const key = normalize(relative)
  if (!key) return false
  if (['.env.groq','.groq.env'].includes(path.basename(key)) || key.startsWith('.umi-update-stage-') || key.startsWith('.umi-source-rollback-')) return true
  for (const item of cfg.exclude) {
    if (key === item || key.startsWith(`${item}/`)) return true
  }
  return false
}

async function collectFiles(directory, cfg, base = ROOT, output = []) {
  const entries = await fsp.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    const relative = normalize(path.relative(base, absolute))
    if (excluded(relative, cfg)) continue
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      await collectFiles(absolute, cfg, base, output)
      continue
    }
    if (!entry.isFile()) continue
    const stat = await fsp.stat(absolute)
    output.push({ absolute, relative, size: stat.size, mtime: stat.mtime.toISOString() })
  }
  return output
}

function partitionFiles(files, targetBytes) {
  const groups = []
  let current = [], currentSize = 0
  for (const file of files.sort((a, b) => a.relative.localeCompare(b.relative))) {
    if (current.length && currentSize + file.size > targetBytes) {
      groups.push(current)
      current = []
      currentSize = 0
    }
    current.push(file)
    currentSize += file.size
  }
  if (current.length) groups.push(current)
  return groups
}

function createZip(destination, files, manifest) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destination, { mode: 0o600 })
    const archive = archiver('zip', { zlib: { level: 6 } })
    output.on('close', resolve)
    output.on('error', reject)
    archive.on('warning', error => error.code === 'ENOENT' ? console.warn('[AUTO-BACKUP]', error.message) : reject(error))
    archive.on('error', reject)
    archive.pipe(output)
    archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: 'BACKUP-MANIFEST.json' })
    for (const file of files) archive.file(file.absolute, { name: file.relative })
    archive.finalize()
  })
}

async function checksum(file) {
  const digest = crypto.createHash('sha256')
  await new Promise((resolve, reject) => {
    const input = fs.createReadStream(file)
    input.on('data', chunk => digest.update(chunk))
    input.on('end', resolve)
    input.on('error', reject)
  })
  return digest.digest('hex')
}

async function splitOversizeZip(file, maxBytes) {
  const stat = await fsp.stat(file)
  if (stat.size <= maxBytes) return [file]
  const input = await fsp.open(file, 'r')
  const outputs = []
  try {
    let offset = 0, index = 1
    while (offset < stat.size) {
      const length = Math.min(maxBytes, stat.size - offset)
      const buffer = Buffer.allocUnsafe(length)
      await input.read(buffer, 0, length, offset)
      const part = `${file}.${String(index).padStart(3, '0')}`
      await fsp.writeFile(part, buffer, { mode: 0o600 })
      outputs.push(part)
      offset += length
      index += 1
    }
  } finally {
    await input.close()
  }
  await fsp.unlink(file)
  return outputs
}

function ownerJids() {
  return [...new Set((global.owner || [])
    .map(item => Array.isArray(item) ? item[0] : item)
    .map(value => String(value || '').replace(/\D/g, ''))
    .filter(value => value.length >= 8)
    .map(value => `${value}@s.whatsapp.net`))]
}

async function pruneBackups(cfg) {
  await fsp.mkdir(cfg.outputDirectory, { recursive: true })
  const deadline = Date.now() - cfg.retentionDays * 86_400_000
  for (const entry of await fsp.readdir(cfg.outputDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith('usanagi-full-backup-')) continue
    const file = path.join(cfg.outputDirectory, entry.name)
    const stat = await fsp.stat(file)
    if (stat.mtimeMs < deadline) await fsp.unlink(file).catch(() => {})
  }
}

function stateFile(cfg) {
  return path.join(cfg.outputDirectory, 'state.json')
}

async function readBackupState(cfg) {
  try { return JSON.parse(await fsp.readFile(stateFile(cfg), 'utf8')) } catch { return {} }
}

async function writeBackupState(cfg, value) {
  await fsp.mkdir(cfg.outputDirectory, { recursive: true })
  const target = stateFile(cfg), temp = `${target}.${process.pid}.tmp`
  await fsp.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  await fsp.rename(temp, target)
}

async function sendArchive(conn, owner, file, index, total, backupDate, digest) {
  const name = path.basename(file)
  const multipart = /\.zip\.\d{3}$/.test(name)
  const caption = [
    `📦 *AUTO BACKUP USANAGI UMI AI*`,
    `Tanggal: ${backupDate}`,
    `Bagian: ${index}/${total}`,
    `SHA-256: ${digest}`,
    multipart ? 'File ini adalah pecahan ZIP. Gabungkan semua .001, .002, dst sebelum diekstrak.' : 'Arsip ZIP siap diekstrak.',
    '',
    'By AlzRiss - Usanagi Umi AI',
  ].join('\n')
  await conn.sendMessage(owner, {
    document: { url: file },
    mimetype: multipart ? 'application/octet-stream' : 'application/zip',
    fileName: name,
    caption,
  })
}

export async function runFullBackup({ conn = state.conn || global.conn, force = false, reason = 'daily' } = {}) {
  const cfg = config()
  if (!cfg.enabled && !force) return { skipped: true, reason: 'disabled' }
  if (state.running) return { skipped: true, reason: 'already-running' }
  if (!conn?.sendMessage || !conn?.user) return { skipped: true, reason: 'connection-not-ready' }

  const owners = ownerJids()
  if (!owners.length) throw new Error('Nomor Owner backup tidak tersedia di config.js')
  const local = localDateParts(cfg.timezone)
  const previous = await readBackupState(cfg)
  if (!force && previous.lastSuccessDate === local.date) return { skipped: true, reason: 'already-backed-up' }

  state.running = true
  const startedAt = new Date().toISOString()
  try {
    await pruneBackups(cfg)
    const files = await collectFiles(ROOT, cfg)
    if (!files.length) throw new Error('Tidak ada file yang dapat dibackup')
    const groups = partitionFiles(files, cfg.partTargetBytes)
    const archives = []
    const baseName = `usanagi-full-backup-${local.stamp}`

    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index]
      const zip = path.join(cfg.outputDirectory, `${baseName}-part-${String(index + 1).padStart(2, '0')}-of-${String(groups.length).padStart(2, '0')}.zip`)
      const manifest = {
        product: 'Usanagi Umi AI',
        credit: 'By AlzRiss - Usanagi Umi AI',
        createdAt: new Date().toISOString(),
        timezone: cfg.timezone,
        reason,
        root: path.basename(ROOT),
        part: index + 1,
        totalParts: groups.length,
        files: group.map(file => ({ path: file.relative, size: file.size, modifiedAt: file.mtime })),
      }
      await createZip(zip, group, manifest)
      archives.push(...await splitOversizeZip(zip, cfg.maxPartBytes))
    }

    const records = []
    for (const file of archives) records.push({ file, digest: await checksum(file), size: (await fsp.stat(file)).size })

    for (const owner of owners) {
      await conn.sendMessage(owner, {
        text: `⏳ Backup otomatis ${local.date} selesai dibungkus. Mengirim ${records.length} bagian ZIP...\n\nBy AlzRiss - Usanagi Umi AI`,
      })
      for (let index = 0; index < records.length; index += 1) {
        await sendArchive(conn, owner, records[index].file, index + 1, records.length, local.date, records[index].digest)
        if (index + 1 < records.length) await wait(2000)
      }
      await conn.sendMessage(owner, {
        text: `✅ Backup otomatis terkirim lengkap.\nFile: ${files.length}\nBagian ZIP: ${records.length}\nUkuran: ${(records.reduce((sum, item) => sum + item.size, 0) / 1024 / 1024).toFixed(2)} MB\n\nBy AlzRiss - Usanagi Umi AI`,
      })
    }

    const result = {
      lastSuccessDate: local.date,
      completedAt: new Date().toISOString(),
      startedAt,
      reason,
      fileCount: files.length,
      parts: records.map(item => ({ name: path.basename(item.file), size: item.size, sha256: item.digest })),
      owners,
    }
    await writeBackupState(cfg, result)
    state.nextRetryAt = 0
    console.log(`[AUTO-BACKUP] ${files.length} file, ${records.length} bagian berhasil dikirim ke ${owners.length} Owner.`)
    return result
  } catch (error) {
    state.nextRetryAt = Date.now() + cfg.retryDelayMs
    console.error('[AUTO-BACKUP]', error)
    throw error
  } finally {
    state.running = false
  }
}

async function schedulerTick() {
  const cfg = config()
  if (!cfg.enabled || state.running || Date.now() < state.nextRetryAt) return
  const local = localDateParts(cfg.timezone)
  if (local.hour < cfg.hour || (local.hour === cfg.hour && local.minute < cfg.minute)) return
  const previous = await readBackupState(cfg)
  if (previous.lastSuccessDate === local.date) return
  await runFullBackup({ reason: 'daily' }).catch(() => {})
}

export function installAutoBackup(conn) {
  state.conn = conn
  global.runFullBackup = options => runFullBackup({ conn: state.conn || global.conn, ...(options || {}) })
  if (state.timer) clearInterval(state.timer)
  const cfg = config()
  if (!cfg.enabled) {
    console.log('[AUTO-BACKUP] Dinonaktifkan melalui config.js')
    return
  }
  state.timer = setInterval(schedulerTick, cfg.checkIntervalMs)
  state.timer.unref?.()
  setTimeout(schedulerTick, 15_000).unref?.()
  console.log(`[AUTO-BACKUP] Aktif setiap hari pukul ${String(cfg.hour).padStart(2, '0')}:${String(cfg.minute).padStart(2, '0')} ${cfg.timezone}`)
}

export function updateAutoBackupConnection(conn) {
  state.conn = conn
}

export default { installAutoBackup, updateAutoBackupConnection, runFullBackup }
