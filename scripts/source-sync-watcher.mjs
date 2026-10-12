#!/usr/bin/env node
/** Watch source folders and publish a sanitized Git commit after updates. */
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(process.env.UMI_RUNTIME_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
const watched = ['core', 'integrations', 'lib', 'plugins', 'scripts', 'src', 'tests', 'handler.js', 'main.js', 'index.js', 'package.json', 'package-lock.json']
const ignored = name => /(?:^|\/)(?:node_modules|data|sessions|tmp|\.cache|\.git)(?:\/|$)|(?:^|\/)\.env|config\.js$|database\.json$/.test(name)
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
console.log('[source-sync] Watcher aktif. Perubahan source akan dipublish setelah 45 detik tenang.')
