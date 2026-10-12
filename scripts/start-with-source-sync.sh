#!/bin/sh
# Starts the bot command and, when configured, the sanitized source watcher.
set -u
watcher_pid=''
if [ -n "${UMI_SOURCE_REPO_DIR:-}" ]; then
  node scripts/source-sync-watcher.mjs &
  watcher_pid=$!
  echo "[source-sync] Watcher dijalankan (pid $watcher_pid)."
else
  echo '[source-sync] Tidak aktif: UMI_SOURCE_REPO_DIR belum disetel.'
fi
"$@" &
app_pid=$!
cleanup() {
  [ -z "$watcher_pid" ] || kill "$watcher_pid" 2>/dev/null || true
  kill "$app_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
wait "$app_pid"
