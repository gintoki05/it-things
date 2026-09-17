"use server"

import { google } from "googleapis"

export interface KasMemberRow {
  no: string
  name: string
  payments: { [month: string]: string }
  totalPaidCount: number
}

export interface KasSheetData {
  title: string
  sheetTabs: string[]
  currentTab: string
  monthColumns: string[]
  rows: KasMemberRow[]
  totalMembers: number
  lastUpdated: string
}

export interface KasActionResult {
  success: boolean
  isConfigured: boolean
  data?: KasSheetData
  error?: string
}

const DEFAULT_SPREADSHEET_ID = "1vjrtn0Z1fLbDr4trQpdMbGecKW8WIEf3KJjXt0Sc9v4"
const DEFAULT_SHEET_TAB = "Laporan Uang Masuk"

/**
 * Normalizes private key formatting from env vars
 * (handles escaped newlines \n, quotes, and whitespace)
 */
function cleanPrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined
  let key = rawKey.trim()
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1)
  }
  return key.replace(/\\n/g, "\n")
}

export async function fetchKasSheetDataAction(
  targetTab: string = DEFAULT_SHEET_TAB
): Promise<KasActionResult> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SPREADSHEET_ID

  // Check if credentials are provided
  if (!clientEmail || !rawPrivateKey) {
    return {
      success: false,
      isConfigured: false,
      error:
        "Kredensial Service Account belum dikonfigurasi di .env.local (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).",
    }
  }

  const privateKey = cleanPrivateKey(rawPrivateKey)

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    // 1. Get spreadsheet metadata (title & list of sheet tabs)
    const metaResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties.title,sheets.properties.title",
    })

    const sheetTitle = metaResponse.data.properties?.title || "Laporan Keuangan Dept. TI"
    const sheetTabs =
      metaResponse.data.sheets
        ?.map((s) => s.properties?.title)
        .filter((t): t is string => Boolean(t)) || [DEFAULT_SHEET_TAB]

    // Determine actual tab to fetch (fallback to default or first tab)
    const activeTab = sheetTabs.includes(targetTab) ? targetTab : sheetTabs[0] || DEFAULT_SHEET_TAB

    // 2. Fetch all values in the active sheet tab
    // We read a wide range up to row 100 and column AZ
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${activeTab}'!A1:AZ100`,
      valueRenderOption: "FORMATTED_VALUE",
    })

    const rawRows = valuesResponse.data.values || []

    if (rawRows.length === 0) {
      return {
        success: true,
        isConfigured: true,
        data: {
          title: sheetTitle,
          sheetTabs,
          currentTab: activeTab,
          monthColumns: [],
          rows: [],
          totalMembers: 0,
          lastUpdated: new Date().toISOString(),
        },
      }
    }

    // 3. Find the Header Row (contains "No" and "Nama")
    let headerRowIndex = -1
    let nameColIndex = 1
    let noColIndex = 0

    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i]
      const nameIndex = row.findIndex(
        (cell) => typeof cell === "string" && cell.trim().toLowerCase() === "nama"
      )
      if (nameIndex !== -1) {
        headerRowIndex = i
        nameColIndex = nameIndex
        const foundNo = row.findIndex(
          (cell) => typeof cell === "string" && cell.trim().toLowerCase() === "no"
        )
        if (foundNo !== -1) noColIndex = foundNo
        break
      }
    }

    // If no explicit "Nama" row found, default to row index 4 (5th row)
    if (headerRowIndex === -1) {
      headerRowIndex = Math.min(4, rawRows.length - 1)
    }

    const headerRow = rawRows[headerRowIndex] || []

    // 4. Identify Month/Column Headers after name column
    const monthColumns: { name: string; colIndex: number }[] = []
    for (let c = nameColIndex + 1; c < headerRow.length; c++) {
      const val = String(headerRow[c] || "").trim()
      if (val && val !== "No" && val !== "Nama") {
        monthColumns.push({ name: val, colIndex: c })
      }
    }

    // 5. Parse Member Rows (Rows after headerRowIndex)
    const members: KasMemberRow[] = []

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r]
      if (!row || row.length === 0) continue

      const name = String(row[nameColIndex] || "").trim()
      const no = String(row[noColIndex] || "").trim()

      // Skip empty or total rows (e.g., "TOTAL", "JUMLAH", or blank names)
      if (!name || /^(total|jumlah|subtotal|saldo)$/i.test(name)) {
        continue
      }

      const payments: { [month: string]: string } = {}
      let paidCount = 0

      for (const col of monthColumns) {
        const paymentVal = String(row[col.colIndex] || "").trim()
        payments[col.name] = paymentVal
        // If has value and not just "-" or "0"
        if (paymentVal && paymentVal !== "-" && paymentVal !== "0") {
          paidCount++
        }
      }

      members.push({
        no: no || String(members.length + 1),
        name,
        payments,
        totalPaidCount: paidCount,
      })
    }

    return {
      success: true,
      isConfigured: true,
      data: {
        title: sheetTitle,
        sheetTabs,
        currentTab: activeTab,
        monthColumns: monthColumns.map((m) => m.name),
        rows: members,
        totalMembers: members.length,
        lastUpdated: new Date().toISOString(),
      },
    }
  } catch (error: unknown) {
    console.error("Error fetching Google Sheet data:", error)
    return {
      success: false,
      isConfigured: true,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengambil data dari Google Sheets API.",
    }
  }
}
