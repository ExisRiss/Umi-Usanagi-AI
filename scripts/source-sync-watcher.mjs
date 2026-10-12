#!/usr/bin/env node
/** Watch source folders and publish a sanitized Git commit after updates. */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(process.env.UMI_RUNTIME_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const watched = ['assets', 'config', 'core', 'font', 'integrations', 'json', 'lib', 'media', 'plugins', 'scripts', 'src', 'tests', 'AUTO-TRANSLATE.md', 'AUTO_AI_GROQ.md', 'CREDITS.md', 'CREDITS_PELENGKAP.md', 'FEATURE_MIGRATION_REPORT.json', 'README.md', 'SOURCE_PLUGIN_MANIFEST.md', 'bg-template.jpg', 'eslint.config.js', 'handler.js', 'index.js', 'main.js', 'package.json', 'package-lock.json', 'run.js']
const ignored = name => {
  const parts = String(name).split(path.sep)
  const base = parts.at(-1)
  return parts[0] === 'data' || parts.some(part => ['node_modules', 'sessions', 'tmp', '.cache', '.git'].includes(part)) || base.startsWith('.env') || ['config.js', 'database.json'].includes(base)
}
let timer = null, running = false, queued = false
function publish() {
  if (running) { queued = true; return }
  running = true
  const child = spawn(process.execPath, [path.join(root, 'scripts/publish-source.mjs')], { cwd: root, stdio: 'inherit', env: process.env })
  child.on('exit', () => { running = false; if (queued) { queued = false; schedule() } })
}
function schedule() { clearTimeout(timer); timer = setTimeout(publish, 45_000) }
for (const relative of watched) {
  const target = path.join(root, relative)
  if (!fs.existsSync(target)) continue
  fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, (_event, filename = '') => { if (!ignored(path.join(relative, filename))) schedule() })
}
console.log('[source-sync] Watcher aktif. Source awal dan setiap perubahan akan dipublish setelah 45 detik tenang.')
publish()
