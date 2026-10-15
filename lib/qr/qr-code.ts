/**
 * Pure TypeScript Zero-Dependency SVG QR Code Generator
 * Conforms to ISO/IEC 18004 (Model 2 QR Code)
 * Safe for SSR and client-side rendering (no DOM / canvas dependency)
 */

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H"

export interface QrCodeOptions {
  /** Output SVG width & height in pixels (default: 256) */
  size?: number
  /** Quiet zone margin in modules (default: 2) */
  margin?: number
  /** Error correction level (default: "M") */
  ecc?: ErrorCorrectionLevel
  /** Color of dark modules (default: "#000000") */
  color?: string
  /** Background color (default: "#ffffff", pass null or "transparent" for transparent) */
  bgColor?: string | null
  /** Optional title for accessibility */
  title?: string
}

export interface QrMatrix {
  version: number
  size: number
  modules: boolean[][]
}

interface EcBlockSpec {
  numEcWords: number
  group1Blocks: number
  group1DataWords: number
  group2Blocks: number
  group2DataWords: number
}

// ---------------------------------------------------------------------------
// 1. Galois Field GF(256) Arithmetic (Primitive polynomial: 0x11D / 285)
// ---------------------------------------------------------------------------
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    LOG_TABLE[x] = i
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0)
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]
  }
})()

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
}

function getGeneratorPoly(numEcWords: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < numEcWords; i++) {
    const next = new Uint8Array(poly.length + 1)
    const factor = EXP_TABLE[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function computeErrorCorrection(data: Uint8Array, numEcWords: number): Uint8Array {
  const gen = getGeneratorPoly(numEcWords)
  const remainder = new Uint8Array(data.length + numEcWords)
  remainder.set(data)
  for (let i = 0; i < data.length; i++) {
    const coef = remainder[i]
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        remainder[i + j] ^= gfMul(gen[j], coef)
      }
    }
  }
  return remainder.slice(data.length)
}

// ---------------------------------------------------------------------------
// 2. QR Code Specifications (Versions 1-10)
// ---------------------------------------------------------------------------
const QR_SPECS: Record<number, Record<ErrorCorrectionLevel, EcBlockSpec>> = {
  1: {
    L: { numEcWords: 7, group1Blocks: 1, group1DataWords: 19, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 10, group1Blocks: 1, group1DataWords: 16, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 13, group1Blocks: 1, group1DataWords: 13, group2Blocks: 0, group2DataWords: 0 },
    H: { numEcWords: 17, group1Blocks: 1, group1DataWords: 9, group2Blocks: 0, group2DataWords: 0 },
  },
  2: {
    L: { numEcWords: 10, group1Blocks: 1, group1DataWords: 34, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 16, group1Blocks: 1, group1DataWords: 28, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 22, group1Blocks: 1, group1DataWords: 22, group2Blocks: 0, group2DataWords: 0 },
    H: { numEcWords: 28, group1Blocks: 1, group1DataWords: 16, group2Blocks: 0, group2DataWords: 0 },
  },
  3: {
    L: { numEcWords: 15, group1Blocks: 1, group1DataWords: 55, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 26, group1Blocks: 1, group1DataWords: 44, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 18, group1Blocks: 2, group1DataWords: 17, group2Blocks: 0, group2DataWords: 0 },
    H: { numEcWords: 22, group1Blocks: 2, group1DataWords: 13, group2Blocks: 0, group2DataWords: 0 },
  },
  4: {
    L: { numEcWords: 20, group1Blocks: 1, group1DataWords: 80, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 18, group1Blocks: 2, group1DataWords: 32, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 26, group1Blocks: 2, group1DataWords: 24, group2Blocks: 0, group2DataWords: 0 },
    H: { numEcWords: 16, group1Blocks: 4, group1DataWords: 9, group2Blocks: 0, group2DataWords: 0 },
  },
  5: {
    L: { numEcWords: 26, group1Blocks: 1, group1DataWords: 108, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 24, group1Blocks: 2, group1DataWords: 43, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 18, group1Blocks: 2, group1DataWords: 15, group2Blocks: 2, group2DataWords: 16 },
    H: { numEcWords: 22, group1Blocks: 2, group1DataWords: 11, group2Blocks: 2, group2DataWords: 12 },
  },
  6: {
    L: { numEcWords: 18, group1Blocks: 2, group1DataWords: 68, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 16, group1Blocks: 4, group1DataWords: 27, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 24, group1Blocks: 4, group1DataWords: 19, group2Blocks: 0, group2DataWords: 0 },
    H: { numEcWords: 28, group1Blocks: 4, group1DataWords: 15, group2Blocks: 0, group2DataWords: 0 },
  },
  7: {
    L: { numEcWords: 20, group1Blocks: 2, group1DataWords: 78, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 18, group1Blocks: 4, group1DataWords: 31, group2Blocks: 0, group2DataWords: 0 },
    Q: { numEcWords: 18, group1Blocks: 2, group1DataWords: 14, group2Blocks: 4, group2DataWords: 15 },
    H: { numEcWords: 26, group1Blocks: 4, group1DataWords: 13, group2Blocks: 1, group2DataWords: 14 },
  },
  8: {
    L: { numEcWords: 24, group1Blocks: 2, group1DataWords: 97, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 22, group1Blocks: 2, group1DataWords: 38, group2Blocks: 2, group2DataWords: 39 },
    Q: { numEcWords: 22, group1Blocks: 4, group1DataWords: 18, group2Blocks: 2, group2DataWords: 19 },
    H: { numEcWords: 26, group1Blocks: 4, group1DataWords: 14, group2Blocks: 2, group2DataWords: 15 },
  },
  9: {
    L: { numEcWords: 30, group1Blocks: 2, group1DataWords: 116, group2Blocks: 0, group2DataWords: 0 },
    M: { numEcWords: 22, group1Blocks: 3, group1DataWords: 36, group2Blocks: 2, group2DataWords: 37 },
    Q: { numEcWords: 20, group1Blocks: 4, group1DataWords: 16, group2Blocks: 4, group2DataWords: 17 },
    H: { numEcWords: 24, group1Blocks: 4, group1DataWords: 12, group2Blocks: 4, group2DataWords: 13 },
  },
  10: {
    L: { numEcWords: 18, group1Blocks: 2, group1DataWords: 68, group2Blocks: 2, group2DataWords: 69 },
    M: { numEcWords: 26, group1Blocks: 4, group1DataWords: 43, group2Blocks: 1, group2DataWords: 44 },
    Q: { numEcWords: 24, group1Blocks: 6, group1DataWords: 19, group2Blocks: 2, group2DataWords: 20 },
    H: { numEcWords: 28, group1Blocks: 6, group1DataWords: 15, group2Blocks: 2, group2DataWords: 16 },
  },
}

const REMAINDER_BITS: Record<number, number> = {
  1: 0,
  2: 7,
  3: 7,
  4: 7,
  5: 7,
  6: 7,
  7: 0,
  8: 0,
  9: 0,
  10: 0,
}

const ALIGNMENT_PATTERN_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
}

const VERSION_INFO_BITS: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
}

function getTotalDataWords(spec: EcBlockSpec): number {
  return spec.group1Blocks * spec.group1DataWords + spec.group2Blocks * spec.group2DataWords
}

function chooseVersion(byteCount: number, ecc: ErrorCorrectionLevel): number {
  for (let v = 1; v <= 10; v++) {
    const spec = QR_SPECS[v][ecc]
    const capacity = getTotalDataWords(spec)
    const headerBits = 4 + (v < 10 ? 8 : 16)
    const totalBits = headerBits + byteCount * 8
    const requiredCodewords = Math.ceil(totalBits / 8)
    if (requiredCodewords <= capacity) {
      return v
    }
  }
  throw new Error(`Text too long for QR Code generator (maximum capacity exceeded for ${byteCount} bytes with ECC ${ecc})`)
}

// ---------------------------------------------------------------------------
// 3. Bitstream Encoding (8-bit Byte Mode)
// ---------------------------------------------------------------------------
class BitBuffer {
  private bits: number[] = []

  put(val: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((val >>> i) & 1)
    }
  }

  get length(): number {
    return this.bits.length
  }

  getBit(index: number): number {
    return this.bits[index]
  }

  toUint8Array(): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8))
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) {
        bytes[Math.floor(i / 8)] |= 1 << (7 - (i % 8))
      }
    }
    return bytes
  }
}

function encodeData(text: string, version: number, ecc: ErrorCorrectionLevel): Uint8Array {
  const spec = QR_SPECS[version][ecc]
  const totalDataCodewords = getTotalDataWords(spec)
  const rawBytes = new TextEncoder().encode(text)

  const buffer = new BitBuffer()
  // 1. Mode indicator (0100 for Byte mode)
  buffer.put(0b0100, 4)

  // 2. Character count indicator
  const charCountBits = version < 10 ? 8 : 16
  buffer.put(rawBytes.length, charCountBits)

  // 3. Data payload
  for (let i = 0; i < rawBytes.length; i++) {
    buffer.put(rawBytes[i], 8)
  }

  // 4. Terminator (up to 4 '0' bits)
  const targetBits = totalDataCodewords * 8
  const termLength = Math.min(4, targetBits - buffer.length)
  if (termLength > 0) {
    buffer.put(0, termLength)
  }

  // 5. Pad to multiple of 8
  while (buffer.length % 8 !== 0) {
    buffer.put(0, 1)
  }

  // 6. Pad bytes 0xEC and 0x11
  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (buffer.length < targetBits) {
    buffer.put(padBytes[padIdx % 2], 8)
    padIdx++
  }

  const dataCodewords = buffer.toUint8Array()

  // 7. Divide into blocks and compute error correction
  const totalBlocks = spec.group1Blocks + spec.group2Blocks
  const blocks: { data: Uint8Array; ec: Uint8Array }[] = []
  let offset = 0

  for (let b = 0; b < spec.group1Blocks; b++) {
    const slice = dataCodewords.slice(offset, offset + spec.group1DataWords)
    offset += spec.group1DataWords
    blocks.push({
      data: slice,
      ec: computeErrorCorrection(slice, spec.numEcWords),
    })
  }

  for (let b = 0; b < spec.group2Blocks; b++) {
    const slice = dataCodewords.slice(offset, offset + spec.group2DataWords)
    offset += spec.group2DataWords
    blocks.push({
      data: slice,
      ec: computeErrorCorrection(slice, spec.numEcWords),
    })
  }

  // 8. Interleave data codewords
  const result: number[] = []
  const maxDataWords = Math.max(spec.group1DataWords, spec.group2DataWords)
  for (let i = 0; i < maxDataWords; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      if (i < blocks[b].data.length) {
        result.push(blocks[b].data[i])
      }
    }
  }

  // 9. Interleave error correction codewords
  for (let i = 0; i < spec.numEcWords; i++) {
    for (let b = 0; b < totalBlocks; b++) {
      result.push(blocks[b].ec[i])
    }
  }

  return new Uint8Array(result)
}

// ---------------------------------------------------------------------------
// 4. Matrix Construction & Formatting
// ---------------------------------------------------------------------------
function getFormatInfo(ecc: ErrorCorrectionLevel, mask: number): number {
  const ecBitsMap: Record<ErrorCorrectionLevel, number> = {
    M: 0,
    L: 1,
    H: 2,
    Q: 3,
  }
  const data = (ecBitsMap[ecc] << 3) | mask
  let d = data << 10
  for (let i = 4; i >= 0; i--) {
    if ((d & (1 << (i + 10))) !== 0) {
      d ^= 0x537 << i
    }
  }
  return ((data << 10) | d) ^ 0x5412
}

const MASK_PATTERNS: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

function calculatePenalty(modules: boolean[][], size: number): number {
  let penalty = 0

  // 1. N1: 5 or more consecutive modules of same color
  for (let r = 0; r < size; r++) {
    let runColor = modules[r][0]
    let runLen = 1
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === runColor) {
        runLen++
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5)
        runColor = modules[r][c]
        runLen = 1
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5)
  }

  for (let c = 0; c < size; c++) {
    let runColor = modules[0][c]
    let runLen = 1
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === runColor) {
        runLen++
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5)
        runColor = modules[r][c]
        runLen = 1
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5)
  }

  // 2. N2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const color = modules[r][c]
      if (
        modules[r + 1][c] === color &&
        modules[r][c + 1] === color &&
        modules[r + 1][c + 1] === color
      ) {
        penalty += 3
      }
    }
  }

  // 3. N3: 1:1:3:1:1 pattern (finder-like)
  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false]
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true]

  function matchesPattern(seq: boolean[], pat: boolean[]): boolean {
    for (let i = 0; i < 11; i++) {
      if (seq[i] !== pat[i]) return false
    }
    return true
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      const slice = modules[r].slice(c, c + 11)
      if (matchesPattern(slice, pattern1) || matchesPattern(slice, pattern2)) {
        penalty += 40
      }
    }
  }

  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - 11; r++) {
      const slice = [
        modules[r][c], modules[r + 1][c], modules[r + 2][c], modules[r + 3][c],
        modules[r + 4][c], modules[r + 5][c], modules[r + 6][c], modules[r + 7][c],
        modules[r + 8][c], modules[r + 9][c], modules[r + 10][c],
      ]
      if (matchesPattern(slice, pattern1) || matchesPattern(slice, pattern2)) {
        penalty += 40
      }
    }
  }

  // 4. N4: Dark module ratio
  let darkCount = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++
    }
  }
  const ratio = (darkCount * 100) / (size * size)
  const k = Math.floor(Math.abs(ratio - 50) / 5)
  penalty += k * 10

  return penalty
}

// ---------------------------------------------------------------------------
// 5. Public API: Generate QR Matrix
// ---------------------------------------------------------------------------
export function generateQrMatrix(
  text: string,
  ecc: ErrorCorrectionLevel = "M"
): QrMatrix {
  const version = chooseVersion(new TextEncoder().encode(text).length, ecc)
  const size = version * 4 + 17

  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )

  function setModule(r: number, c: number, value: boolean, isFunc = false): void {
    modules[r][c] = value
    if (isFunc) isFunction[r][c] = true
  }

  // 1. Finder patterns & separators
  function addFinder(top: number, left: number): void {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = top + r
        const nc = left + c
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        const isFinderBorder = r === 0 || r === 6 || c === 0 || c === 6
        const isFinderCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
        const isFinder = (r >= 0 && r <= 6 && c >= 0 && c <= 6) && (isFinderBorder || isFinderCore)
        setModule(nr, nc, isFinder, true)
      }
    }
  }

  addFinder(0, 0)
  addFinder(0, size - 7)
  addFinder(size - 7, 0)

  // 2. Alignment patterns
  const alignPos = ALIGNMENT_PATTERN_POSITIONS[version] || []
  for (let i = 0; i < alignPos.length; i++) {
    for (let j = 0; j < alignPos.length; j++) {
      const r = alignPos[i]
      const c = alignPos[j]
      // Skip if overlaps finder
      if (r <= 8 && c <= 8) continue
      if (r <= 8 && c >= size - 9) continue
      if (r >= size - 9 && c <= 8) continue

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2
          const isCenter = dr === 0 && dc === 0
          setModule(r + dr, c + dc, isBorder || isCenter, true)
        }
      }
    }
  }

  // 3. Timing patterns
  for (let c = 8; c < size - 8; c++) {
    if (!isFunction[6][c]) {
      setModule(6, c, c % 2 === 0, true)
    }
  }
  for (let r = 8; r < size - 8; r++) {
    if (!isFunction[r][6]) {
      setModule(r, 6, r % 2 === 0, true)
    }
  }

  // 4. Dark module
  setModule(size - 8, 8, true, true)

  // 5. Reserve format information areas
  for (let c = 0; c <= 8; c++) isFunction[8][c] = true
  for (let c = size - 8; c < size; c++) isFunction[8][c] = true
  for (let r = 0; r <= 8; r++) isFunction[r][8] = true
  for (let r = size - 7; r < size; r++) isFunction[r][8] = true

  // 6. Reserve version information areas (Version >= 7)
  if (version >= 7) {
    for (let r = 0; r < 6; r++) {
      for (let c = size - 11; c < size - 8; c++) {
        isFunction[r][c] = true
        isFunction[c][r] = true
      }
    }
  }

  // 7. Place data bits
  const codewords = encodeData(text, version, ecc)
  const bitArray: boolean[] = []
  for (let i = 0; i < codewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      bitArray.push(((codewords[i] >>> b) & 1) === 1)
    }
  }
  // Append remainder bits
  const remBits = REMAINDER_BITS[version] || 0
  for (let i = 0; i < remBits; i++) {
    bitArray.push(false)
  }

  let bitIdx = 0
  let upward = true
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    // Skip vertical timing pattern column
    const colPair = rightCol === 6 ? rightCol - 1 : rightCol
    if (rightCol === 6) {
      rightCol--
    }

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const r of rows) {
      for (let cOffset = 0; cOffset < 2; cOffset++) {
        const c = colPair - cOffset
        if (!isFunction[r][c]) {
          const bitVal = bitIdx < bitArray.length ? bitArray[bitIdx++] : false
          modules[r][c] = bitVal
        }
      }
    }
    upward = !upward
  }

  // 8. Find best mask
  let bestMask = 0
  let minPenalty = Infinity
  let bestMatrix: boolean[][] = modules

  for (let mask = 0; mask < 8; mask++) {
    const candidate: boolean[][] = modules.map((row) => [...row])
    const maskFn = MASK_PATTERNS[mask]

    // Apply mask to data modules
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunction[r][c]) {
          candidate[r][c] = candidate[r][c] !== maskFn(r, c)
        }
      }
    }

    // Apply format information
    const fmt = getFormatInfo(ecc, mask)
    for (let i = 0; i < 15; i++) {
      const bit = ((fmt >>> (14 - i)) & 1) === 1

      // Top-left finder surroundings
      let r1: number, c1: number
      if (i <= 5) {
        r1 = 8
        c1 = i
      } else if (i === 6) {
        r1 = 8
        c1 = 7
      } else if (i === 7) {
        r1 = 8
        c1 = 8
      } else if (i === 8) {
        r1 = 7
        c1 = 8
      } else {
        r1 = 14 - i
        c1 = 8
      }
      candidate[r1][c1] = bit

      // Bottom-left / Top-right surroundings
      let r2: number, c2: number
      if (i < 7) {
        r2 = size - 1 - i
        c2 = 8
      } else {
        r2 = 8
        c2 = size - 15 + i
      }
      candidate[r2][c2] = bit
    }

    // Apply version information (Version >= 7)
    if (version >= 7) {
      const vInfo = VERSION_INFO_BITS[version]
      for (let i = 0; i < 18; i++) {
        const bit = ((vInfo >>> (17 - i)) & 1) === 1
        const r = Math.floor(i / 3)
        const c = (i % 3) + size - 11
        candidate[r][c] = bit
        candidate[c][r] = bit
      }
    }

    const penalty = calculatePenalty(candidate, size)
    if (penalty < minPenalty) {
      minPenalty = penalty
      bestMask = mask
      bestMatrix = candidate
    }
  }

  return {
    version,
    size,
    modules: bestMatrix,
  }
}

// ---------------------------------------------------------------------------
// 6. Public API: Generate SVG
// ---------------------------------------------------------------------------
export function generateQrCodeSvg(text: string, options: QrCodeOptions = {}): string {
  const {
    size = 256,
    margin = 2,
    ecc = "M",
    color = "#000000",
    bgColor = "#ffffff",
    title,
  } = options

  const qr = generateQrMatrix(text, ecc)
  const totalModules = qr.size + margin * 2

  let pathData = ""
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.modules[r][c]) {
        const x = c + margin
        const y = r + margin
        pathData += `M${x},${y}h1v1h-1z `
      }
    }
  }

  const bgRect =
    bgColor && bgColor !== "transparent"
      ? `<rect width="${totalModules}" height="${totalModules}" fill="${bgColor}"/>`
      : ""

  const titleTag = title ? `<title>${title}</title>` : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR Code">${titleTag}${bgRect}<path fill="${color}" fill-rule="evenodd" d="${pathData.trim()}"/></svg>`
}

export function getQrCodeDataUrl(text: string, options: QrCodeOptions = {}): string {
  const svg = generateQrCodeSvg(text, options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function generateTennisRoomCode(prefix: "T98" | "WII" = "T98"): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
  let suffix = ""
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${suffix}`
}

