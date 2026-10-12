#!/usr/bin/env node
/**
 * Sanitized source publisher for Umi Usanagi AI.
 *
 * Run this only on the bot server after configuring a private Git remote.
 * It copies allow-listed source paths into a local Git checkout, blocks common
 * credentials/runtime state, commits only a real change, then pushes the branch.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const runtime = path.resolve(process.env.UMI_RUNTIME_ROOT || path.resolve(here, '..'))
const repository = path.resolve(process.env.UMI_SOURCE_REPO_DIR || runtime)
const branch = String(process.env.UMI_SOURCE_REPO_BRANCH || 'main')
const sourcePaths = ['assets', 'config', 'core', 'font', 'integrations', 'json', 'lib', 'media', 'plugins', 'scripts', 'src', 'tests', 'AUTO-TRANSLATE.md', 'AUTO_AI_GROQ.md', 'CREDITS.md', 'CREDITS_PELENGKAP.md', 'FEATURE_MIGRATION_REPORT.json', 'README.md', 'SOURCE_PLUGIN_MANIFEST.md', 'bg-template.jpg', 'eslint.config.js', 'handler.js', 'index.js', 'main.js', 'package.json', 'package-lock.json', 'run.js']
const blockedParts = new Set(['node_modules', 'sessions', 'tmp', '.cache', '.git'])
const blockedNames = new Set(['config.js', 'database.json', '.tunnel.env', '.backup-export.env', '.owner-console-relay.env', '.source-publish.env'])
const blockedSuffixes = ['.enc', '.pem', '.key', '.p12', '.session', '.sqlite', '.sqlite3']
const secretPattern = /(?:AIza[\w-]{15,}|(?:gsk|sk-or-v1|ptl[ac]|ghp|github_pat)_[\w-]{16,}|xox[abprs]-[\w-]{16,}|Bearer\s+(?!\$\{)[A-Za-z0-9._~+\/=:-]{20,}|CLOUDFLARE_TUNNEL_TOKEN\s*=\s*[^\s]+)/

function fail(message) { console.error(`[source-publish] ${message}`); process.exitCode = 1 }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} gagal: ${(result.stderr || result.stdout || '').trim()}`)
  return String(result.stdout || '').trim()
}
function allowed(relative) {
  const parts = relative.split(path.sep)
  const base = parts.at(-1)
  if (parts[0] === 'data' || parts.some(part => blockedParts.has(part)) || blockedNames.has(base) || base.startsWith('.env') || blockedSuffixes.some(suffix => base.endsWith(suffix))) return false
  return true
}
function copySafe(source, destination, relative = '') {
  const stat = fs.lstatSync(source)
  if (!allowed(relative || path.basename(source))) return
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true })
    for (const item of fs.readdirSync(source)) copySafe(path.join(source, item), path.join(destination, item), path.join(relative, item))
    return
  }
  if (!stat.isFile()) return
  const content = fs.readFileSync(source)
  if (content.length < 4 * 1024 * 1024 && secretPattern.test(content.toString('utf8'))) throw new Error(`Secret terdeteksi pada ${relative}; bersihkan sebelum publikasi.`)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.copyFileSync(source, destination)
}

try {
  if (!fs.existsSync(path.join(repository, '.git'))) throw new Error(`Repo Git tidak ditemukan: ${repository}`)
  for (const relative of sourcePaths) {
    const source = path.join(runtime, relative)
    if (!fs.existsSync(source)) continue
    copySafe(source, path.join(repository, relative), relative)
  }
  const status = run('git', ['status', '--porcelain'])
  if (!status) { console.log('[source-publish] Tidak ada perubahan source.'); process.exit(0) }
  run('git', ['add', '--all'])
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  run('git', ['commit', '-m', `chore(source): sync runtime ${stamp}`])
  run('git', ['push', 'origin', branch])
  console.log('[source-publish] Source aman berhasil dipush.')
} catch (error) {
  fail(error.message)
}
