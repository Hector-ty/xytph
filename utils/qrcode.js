const GF_EXP = []
const GF_LOG = []
const QR_SIZE = 25
const DATA_CODEWORDS = 34
const ERROR_CODEWORDS = 10
const QUIET_ZONE = 4

let value = 1
for (let index = 0; index < 255; index += 1) {
  GF_EXP[index] = value
  GF_LOG[value] = index
  value <<= 1
  if (value & 0x100) value ^= 0x11d
}
for (let index = 255; index < 512; index += 1) {
  GF_EXP[index] = GF_EXP[index - 255]
}

function gfMul(a, b) {
  if (!a || !b) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function polyMul(a, b) {
  const result = new Array(a.length + b.length - 1).fill(0)
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] ^= gfMul(a[i], b[j])
    }
  }
  return result
}

function rsGenerator(degree) {
  let result = [1]
  for (let index = 0; index < degree; index += 1) {
    result = polyMul(result, [1, GF_EXP[index]])
  }
  return result
}

function rsRemainder(data, degree) {
  const generator = rsGenerator(degree)
  const result = data.concat(new Array(degree).fill(0))
  for (let index = 0; index < data.length; index += 1) {
    const factor = result[index]
    if (!factor) continue
    for (let offset = 0; offset < generator.length; offset += 1) {
      result[index + offset] ^= gfMul(generator[offset], factor)
    }
  }
  return result.slice(data.length)
}

function appendBits(bits, value, length) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1)
  }
}

function buildDataCodewords(text) {
  const bytes = Array.from(String(text || '')).map(char => char.charCodeAt(0))
  const dataBitCapacity = DATA_CODEWORDS * 8
  const bits = []
  appendBits(bits, 4, 4)
  appendBits(bits, bytes.length, 8)
  bytes.forEach(byte => appendBits(bits, byte, 8))
  if (bits.length > dataBitCapacity) {
    throw new Error('QR payload is too long')
  }
  appendBits(bits, 0, Math.min(4, dataBitCapacity - bits.length))
  while (bits.length % 8) bits.push(0)

  const codewords = []
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(bits.slice(index, index + 8).reduce((sum, bit) => (sum << 1) | bit, 0))
  }
  const pads = [0xec, 0x11]
  let padIndex = 0
  while (codewords.length < DATA_CODEWORDS) {
    codewords.push(pads[padIndex % 2])
    padIndex += 1
  }
  return codewords
}

function makeMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null))
}

function setModule(matrix, reserved, x, y, dark) {
  if (x < 0 || y < 0 || y >= matrix.length || x >= matrix.length) return
  matrix[y][x] = Boolean(dark)
  reserved[y][x] = true
}

function drawFinder(matrix, reserved, x, y) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx
      const yy = y + dy
      const dark = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6
        && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4))
      setModule(matrix, reserved, xx, yy, dark)
    }
  }
}

function drawAlignment(matrix, reserved, x, y) {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy))
      setModule(matrix, reserved, x + dx, y + dy, distance === 2 || distance === 0)
    }
  }
}

function drawPatterns(matrix, reserved) {
  const size = matrix.length
  drawFinder(matrix, reserved, 0, 0)
  drawFinder(matrix, reserved, size - 7, 0)
  drawFinder(matrix, reserved, 0, size - 7)
  drawAlignment(matrix, reserved, 18, 18)

  for (let index = 8; index < size - 8; index += 1) {
    setModule(matrix, reserved, index, 6, index % 2 === 0)
    setModule(matrix, reserved, 6, index, index % 2 === 0)
  }

  const firstFormat = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ]
  firstFormat.forEach(([x, y]) => setModule(matrix, reserved, x, y, false))
  for (let index = 0; index < 8; index += 1) {
    setModule(matrix, reserved, size - 1 - index, 8, false)
  }
  for (let index = 8; index < 15; index += 1) {
    setModule(matrix, reserved, 8, size - 15 + index, false)
  }
  setModule(matrix, reserved, 8, size - 8, true)
}

function applyData(matrix, reserved, bits) {
  const size = matrix.length
  let bitIndex = 0
  let upward = true
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical
      for (let column = 0; column < 2; column += 1) {
        const x = right - column
        if (reserved[y][x]) continue
        const dark = bitIndex < bits.length ? bits[bitIndex] === 1 : false
        matrix[y][x] = ((x + y) % 2 === 0) ? !dark : dark
        bitIndex += 1
      }
    }
    upward = !upward
  }
}

function drawFormat(matrix, reserved) {
  const size = matrix.length
  const format = 0x77c4
  for (let index = 0; index < 15; index += 1) {
    const dark = ((format >> index) & 1) === 1
    const first = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
    ][index]
    const second = index < 8
      ? [size - 1 - index, 8]
      : [8, size - 15 + index]
    setModule(matrix, reserved, first[0], first[1], dark)
    setModule(matrix, reserved, second[0], second[1], dark)
  }
}

function createMatrix(text) {
  const data = buildDataCodewords(text)
  const error = rsRemainder(data, ERROR_CODEWORDS)
  const codewords = data.concat(error)
  const bits = []
  codewords.forEach(byte => appendBits(bits, byte, 8))

  const matrix = makeMatrix(QR_SIZE)
  const reserved = makeMatrix(QR_SIZE)
  drawPatterns(matrix, reserved)
  applyData(matrix, reserved, bits)
  drawFormat(matrix, reserved)
  return matrix
}

function createGrid(text) {
  const matrix = createMatrix(text)
  const size = matrix.length + QUIET_ZONE * 2
  const rows = []
  for (let y = 0; y < size; y += 1) {
    const cells = []
    for (let x = 0; x < size; x += 1) {
      const moduleY = y - QUIET_ZONE
      const moduleX = x - QUIET_ZONE
      const dark = moduleY >= 0
        && moduleY < matrix.length
        && moduleX >= 0
        && moduleX < matrix.length
        && matrix[moduleY][moduleX]
      cells.push({
        id: `${y}-${x}`,
        dark
      })
    }
    rows.push({
      id: `row-${y}`,
      cells
    })
  }
  return {
    size,
    rows
  }
}

module.exports = {
  createGrid
}
