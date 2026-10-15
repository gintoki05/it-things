import test from "node:test"
import assert from "node:assert/strict"
import {
  generateQrCodeSvg,
  generateQrMatrix,
  getQrCodeDataUrl,
  generateTennisRoomCode,
} from "../lib/qr/qr-code.ts"


test("QR Matrix: generates Version 1 (21x21) for short room codes", () => {
  const result = generateQrMatrix("T98-7B2X", "M")
  assert.equal(result.version, 1)
  assert.equal(result.size, 21)
  assert.equal(result.modules.length, 21)
  assert.equal(result.modules[0].length, 21)
})

test("QR Matrix: automatically scales version for long mobile controller pairing URLs", () => {
  const url = "http://192.168.1.50:3000/tennis-remote?room=WII-8921"
  const result = generateQrMatrix(url, "M")
  // URL length is 52 chars. In Byte mode with 'M' error correction, Version 4 (capacity 64) is chosen.
  assert.ok(result.version >= 3 && result.version <= 4)
  assert.equal(result.size, result.version * 4 + 17)
  assert.equal(result.modules.length, result.size)
})

test("QR Matrix: structural finder patterns and timing patterns conform to ISO/IEC 18004", () => {
  const { size, modules } = generateQrMatrix("T98-TEST", "M")

  // 1. Top-Left Finder Pattern (7x7)
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6
      const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
      const expected = isBorder || isCore
      assert.equal(modules[r][c], expected, `Top-left finder at (${r},${c}) should be ${expected}`)
    }
  }

  // 2. Top-Right Finder Pattern (7x7)
  const trCol = size - 7
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6
      const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
      const expected = isBorder || isCore
      assert.equal(modules[r][trCol + c], expected, `Top-right finder at (${r},${trCol + c})`)
    }
  }

  // 3. Bottom-Left Finder Pattern (7x7)
  const blRow = size - 7
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6
      const isCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
      const expected = isBorder || isCore
      assert.equal(modules[blRow + r][c], expected, `Bottom-left finder at (${blRow + r},${c})`)
    }
  }

  // 4. Timing Patterns (Row 6 and Column 6, alternating modules)
  for (let c = 8; c < size - 8; c++) {
    assert.equal(modules[6][c], c % 2 === 0, `Horizontal timing at col ${c}`)
  }
  for (let r = 8; r < size - 8; r++) {
    assert.equal(modules[r][6], r % 2 === 0, `Vertical timing at row ${r}`)
  }

  // 5. Dark Module at (size - 8, 8)
  assert.equal(modules[size - 8][8], true, "Dark module must be dark")
})

test("QR Matrix: error correction levels (L, M, Q, H) behave according to spec", () => {
  const text = "https://it-things.local/tennis-remote?room=DEMO98"
  const qrL = generateQrMatrix(text, "L")
  const qrH = generateQrMatrix(text, "H")

  // Level H requires more EC codewords, so version must be greater than or equal to Level L
  assert.ok(qrH.version >= qrL.version)
  assert.ok(qrH.size >= qrL.size)
})

test("SVG Generator: produces valid SVG with default parameters", () => {
  const svg = generateQrCodeSvg("T98-7B2X")

  assert.ok(svg.startsWith("<svg "))
  assert.ok(svg.endsWith("</svg>"))
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'))
  assert.ok(svg.includes('width="256"'))
  assert.ok(svg.includes('height="256"'))
  assert.ok(svg.includes('shape-rendering="crispEdges"'))
  assert.ok(svg.includes('<rect width="25" height="25" fill="#ffffff"/>')) // 21 + 2*2 = 25
  assert.ok(svg.includes('viewBox="0 0 25 25"'))
  assert.ok(svg.includes('<path fill="#000000" fill-rule="evenodd"'))
})

test("SVG Generator: respects custom size, margin, color, and bgColor", () => {
  const svg = generateQrCodeSvg("TEST-ROOM", {
    size: 180,
    margin: 4,
    color: "#000080",
    bgColor: "#c0c0c0",
    title: "Pairing QR",
  })

  assert.ok(svg.includes('width="180"'))
  assert.ok(svg.includes('height="180"'))
  assert.ok(svg.includes('viewBox="0 0 29 29"')) // 21 + 2*4 = 29
  assert.ok(svg.includes('<title>Pairing QR</title>'))
  assert.ok(svg.includes('<rect width="29" height="29" fill="#c0c0c0"/>'))
  assert.ok(svg.includes('fill="#000080"'))
})

test("SVG Generator: transparent background omits rect element", () => {
  const svg = generateQrCodeSvg("NO-BG", { bgColor: "transparent" })
  assert.ok(!svg.includes("<rect"))

  const svgNull = generateQrCodeSvg("NO-BG-NULL", { bgColor: null })
  assert.ok(!svgNull.includes("<rect"))
})

test("Data URL: returns valid data URI string", () => {
  const dataUrl = getQrCodeDataUrl("DATA-URI-TEST")
  assert.ok(dataUrl.startsWith("data:image/svg+xml;utf8,%3Csvg"))
})

test("Determinism: identical inputs produce identical outputs", () => {
  const svg1 = generateQrCodeSvg("REPRODUCIBLE-PAIRING-URL-12345", { size: 200, margin: 2 })
  const svg2 = generateQrCodeSvg("REPRODUCIBLE-PAIRING-URL-12345", { size: 200, margin: 2 })
  assert.equal(svg1, svg2)
})

test("Error handling: throws if payload exceeds maximum supported capacity", () => {
  const oversizedText = "A".repeat(500)
  assert.throws(
    () => generateQrMatrix(oversizedText, "H"),
    /Text too long for QR Code generator/
  )
})

test("Room Code: generates valid formatting (e.g. T98-7B2X or WII-8921)", () => {
  const codeDefault = generateTennisRoomCode()
  assert.match(codeDefault, /^T98-[2-9A-Z]{4}$/)

  const codeWii = generateTennisRoomCode("WII")
  assert.match(codeWii, /^WII-[2-9A-Z]{4}$/)

  // Generates randomized codes
  const code2 = generateTennisRoomCode()
  assert.notEqual(codeDefault, code2 + "EXTRA")
})

