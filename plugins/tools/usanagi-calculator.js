/* Clean-room safe calculator addition from the Luna feature checklist. */

const OPERATORS = {
  '+': { precedence: 1, assoc: 'left', operands: 2, apply: (a, b) => a + b },
  '-': { precedence: 1, assoc: 'left', operands: 2, apply: (a, b) => a - b },
  '*': { precedence: 2, assoc: 'left', operands: 2, apply: (a, b) => a * b },
  '/': { precedence: 2, assoc: 'left', operands: 2, apply: (a, b) => { if (b === 0) throw new Error('Tidak dapat membagi dengan nol.') ; return a / b } },
  '%': { precedence: 2, assoc: 'left', operands: 2, apply: (a, b) => { if (b === 0) throw new Error('Tidak dapat modulo dengan nol.') ; return a % b } },
  '^': { precedence: 3, assoc: 'right', operands: 2, apply: (a, b) => a ** b },
  'u+': { precedence: 4, assoc: 'right', operands: 1, apply: a => a },
  'u-': { precedence: 4, assoc: 'right', operands: 1, apply: a => -a },
}

function tokenize(input) {
  const source = String(input || '').trim().replace(/,/g, '.')
  if (!source || source.length > 200) throw new Error('Masukkan rumus maksimal 200 karakter.')
  if (!/^[\d+\-*/%^().\s]+$/.test(source)) throw new Error('Rumus hanya boleh berisi angka, +, -, ×, ÷, %, ^, dan tanda kurung.')
  const tokens = []
  const matcher = /\s*(\d+(?:\.\d+)?|[+\-*/%^()])\s*/gy
  let index = 0
  while (index < source.length) {
    matcher.lastIndex = index
    const match = matcher.exec(source)
    if (!match) throw new Error('Format rumus tidak valid.')
    tokens.push(match[1])
    index = matcher.lastIndex
  }
  return tokens
}

function toRpn(tokens) {
  const output = []
  const stack = []
  let previous = 'start'
  for (const raw of tokens) {
    if (/^\d/.test(raw)) {
      output.push(raw)
      previous = 'number'
      continue
    }
    if (raw === '(') {
      stack.push(raw)
      previous = 'open'
      continue
    }
    if (raw === ')') {
      let closed = false
      while (stack.length) {
        const top = stack.pop()
        if (top === '(') { closed = true; break }
        output.push(top)
      }
      if (!closed) throw new Error('Tanda kurung tidak seimbang.')
      previous = 'close'
      continue
    }
    let operator = raw
    if ((raw === '+' || raw === '-') && ['start', 'open', 'operator'].includes(previous)) operator = `u${raw}`
    const current = OPERATORS[operator]
    if (!current || previous === 'start' && !['u+', 'u-'].includes(operator)) throw new Error('Operator tidak pada posisi yang valid.')
    while (stack.length) {
      const top = OPERATORS[stack.at(-1)]
      if (!top || (current.assoc === 'left' ? current.precedence > top.precedence : current.precedence >= top.precedence)) break
      output.push(stack.pop())
    }
    stack.push(operator)
    previous = 'operator'
  }
  if (['start', 'open', 'operator'].includes(previous)) throw new Error('Rumus belum lengkap.')
  while (stack.length) {
    const top = stack.pop()
    if (top === '(') throw new Error('Tanda kurung tidak seimbang.')
    output.push(top)
  }
  return output
}

function calculate(input) {
  const stack = []
  for (const item of toRpn(tokenize(input))) {
    if (/^\d/.test(item)) { stack.push(Number(item)); continue }
    const operator = OPERATORS[item]
    if (!operator || stack.length < operator.operands) throw new Error('Rumus tidak valid.')
    const args = stack.splice(-operator.operands)
    const value = operator.apply(...args)
    if (!Number.isFinite(value) || Math.abs(value) > 1e100) throw new Error('Hasil berada di luar batas aman.')
    stack.push(value)
  }
  if (stack.length !== 1) throw new Error('Rumus tidak valid.')
  return stack[0]
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 12 }).format(value)
}

const handler = async (m, { text, usedPrefix, command }) => {
  const formula = String(text || '').trim()
  if (!formula) return m.reply(`Contoh: *${usedPrefix + command} (12 + 8) × 3 ^ 2*`)
  try {
    const normalized = formula.replace(/[×x]/gi, '*').replace(/[÷:]/g, '/')
    const result = calculate(normalized)
    return m.reply(`🧮 *KALKULATOR AMAN*\n\n• Rumus: \`${formula}\`\n• Hasil: *${formatNumber(result)}*`)
  } catch (error) {
    return m.reply(`❌ ${error.message}`)
  }
}

handler.help = ['calculator <rumus>', 'kalkulator <rumus>']
handler.tags = ['tools']
handler.command = /^(calculator|kalkulator|calc|hitung)$/i
handler.category = 'tools'
handler.description = 'Kalkulator ekspresi tanpa eval atau eksekusi kode'
handler.limit = false

export { calculate, tokenize, toRpn }
export default handler
