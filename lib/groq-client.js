/* Shared, server-only Groq client. Never export keys in status responses. */
import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'
const URL = 'https://api.groq.com/openai/v1/chat/completions'
let fileCache = { expires: 0, values: {} }
function privateEnvironment() {
  if (fileCache.expires > Date.now()) return fileCache.values
  const values = {}
  try {
    const file = fs.readFileSync(path.join(process.cwd(), '.env.groq'), 'utf8')
    for (const line of file.split(/\r?\n/)) {
      const match = line.match(/^\s*(GROQ_API_KEY|GROQ_MODEL|UMI_AUTO_AI_ENABLED)\s*=\s*(.*?)\s*$/)
      if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  } catch {}
  fileCache = { expires: Date.now() + 15_000, values }
  return values
}
export function resetGroqConfigCache() { fileCache.expires = 0 }
export function getGroqSettings() {
  const file = privateEnvironment()
  const apiKey = String(process.env.GROQ_API_KEY || file.GROQ_API_KEY || global.umiAutoAI?.apiKey || global.usanagiAI?.groqApiKey || '').trim()
  const model = String(process.env.GROQ_MODEL || file.GROQ_MODEL || global.umiAutoAI?.model || DEFAULT_GROQ_MODEL).trim()
  const enabled = String(process.env.UMI_AUTO_AI_ENABLED || file.UMI_AUTO_AI_ENABLED || 'true') !== 'false'
  return { apiKey, model, configured: Boolean(apiKey), enabled }
}
export function redactProviderSecrets(value) {
  return String(value ?? '').replace(/(?:gsk_|vcp_|ptl[ac]_|gh[pousr]_)[A-Za-z0-9_-]{16,}|sk-or-v1-[A-Za-z0-9_-]{16,}|github_pat_[A-Za-z0-9_]{16,}/g, '<redacted-key>')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer <redacted>')
}
export async function chatGroq(messages, options = {}) {
  const settings = getGroqSettings()
  const apiKey = options.apiKey || settings.apiKey
  const model = options.model || settings.model
  if (!apiKey) throw Object.assign(new Error('Groq belum dikonfigurasi oleh owner.'), { status: 503 })
  const timeout = Math.max(1, Math.min(Number(options.timeoutMs) || 20_000, 40_000))
  const body = { model, messages, max_completion_tokens: options.maxTokens || 1600, temperature: 0.25 }
  if (model.startsWith('openai/gpt-oss-')) body.reasoning_effort = 'low'
  if (options.tools?.length) Object.assign(body, { tools: options.tools, tool_choice: options.toolChoice || 'auto', parallel_tool_calls: false })
  const fetcher = options.fetchImpl || globalThis.fetch
  let response
  try {
    response = await fetcher(URL, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) })
  } catch (error) {
    const timedOut = ['TimeoutError', 'AbortError'].includes(error?.name)
    throw Object.assign(new Error(timedOut ? 'Groq melewati batas waktu. Coba lagi.' : 'Koneksi Groq tidak tersedia. Coba lagi.'), { status: timedOut ? 504 : 502 })
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = response.status === 429 ? 'Batas penggunaan Groq tercapai. Tunggu sebentar lalu coba lagi.'
      : [401, 403].includes(response.status) ? 'Key Groq tidak valid atau akses model ditolak; hubungi owner.'
      : response.status === 400 ? 'Permintaan/model Groq tidak didukung. Hubungi owner.' : 'Groq sedang tidak dapat merespons.'
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : response.status })
  }
  const result = payload.choices?.[0]?.message
  if (!result || (!result.content && !result.tool_calls?.length)) throw Object.assign(new Error('Groq mengembalikan jawaban kosong. Coba lagi.'), { status: 502 })
  return { role: 'assistant', content: result.content || null, ...(result.tool_calls?.length ? { tool_calls: result.tool_calls } : {}) }
}

export function persistGroqRuntimeConfig({apiKey,model}) {
  if(!/^gsk_[A-Za-z0-9_-]{20,200}$/.test(String(apiKey||''))) throw Object.assign(new Error('Format key Groq tidak valid.'),{status:400})
  if(!/^[A-Za-z0-9._:/-]{1,160}$/.test(String(model||''))) throw Object.assign(new Error('Format model tidak valid.'),{status:400})
  const enabled=getGroqSettings().enabled
  const file=path.join(process.cwd(),'.env.groq'),temp=file+'.tmp'
  fs.writeFileSync(temp,`GROQ_API_KEY=${apiKey}\nGROQ_MODEL=${model}\nUMI_AUTO_AI_ENABLED=${enabled}\n`,{mode:0o600})
  fs.renameSync(temp,file);try{fs.chmodSync(file,0o600)}catch{}
  resetGroqConfigCache()
}
