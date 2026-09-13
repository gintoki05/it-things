/**
 * Kalkulasi Waktu Sholat Standar Kemenag RI (Hisab Astronomis Ephemeris)
 * 100% Offline-First, Zero Network Latency, Presisi Tinggi.
 * Standar Kemenag:
 * - Subuh: Sudut matahari -20° di bawah ufuk
 * - Terbit (Sunrise): -1° (termasuk refraksi udara & radius matahari)
 * - Dhuha: Saat matahari naik ~4.5° di atas ufuk
 * - Dzuhur: Zawwal (Transit matahari) + 2 menit ihtiyath
 * - Ashar: Madzhab Syafi'i (bayangan = 1x tinggi benda + bayangan saat dzuhur)
 * - Maghrib: -1° + 2 menit ihtiyath
 * - Isya: Sudut matahari -18° di bawah ufuk + 2 menit ihtiyath
 * - Imsak: Subuh - 10 menit
 */

export interface CityLocation {
  id: string
  name: string
  province: string
  lat: number
  lng: number
  timezone: 7 | 8 | 9 // WIB (7), WITA (8), WIT (9)
  tzLabel: "WIB" | "WITA" | "WIT"
}

export interface PrayerSchedule {
  imsak: string
  subuh: string
  terbit: string
  dhuha: string
  dzuhur: string
  ashar: string
  maghrib: string
  isya: string
  date: string // YYYY-MM-DD
  cityName: string
  tzLabel: "WIB" | "WITA" | "WIT"
}

export interface NextPrayerInfo {
  name: "Imsak" | "Subuh" | "Terbit" | "Dhuha" | "Dzuhur" | "Ashar" | "Maghrib" | "Isya"
  time: string
  remainingMinutes: number
  isDueNow: boolean // tepat saat ini (+/- 2 menit)
  formattedCountdown: string
}

export const INDONESIA_CITIES: CityLocation[] = [
  { id: "jakarta", name: "DKI Jakarta", province: "DKI Jakarta", lat: -6.2088, lng: 106.8456, timezone: 7, tzLabel: "WIB" },
  { id: "surabaya", name: "Surabaya", province: "Jawa Timur", lat: -7.2575, lng: 112.7521, timezone: 7, tzLabel: "WIB" },
  { id: "bandung", name: "Bandung", province: "Jawa Barat", lat: -6.9175, lng: 107.6191, timezone: 7, tzLabel: "WIB" },
  { id: "medan", name: "Medan", province: "Sumatera Utara", lat: 3.5952, lng: 98.6722, timezone: 7, tzLabel: "WIB" },
  { id: "semarang", name: "Semarang", province: "Jawa Tengah", lat: -6.9667, lng: 110.4167, timezone: 7, tzLabel: "WIB" },
  { id: "palembang", name: "Palembang", province: "Sumatera Selatan", lat: -2.9761, lng: 104.7754, timezone: 7, tzLabel: "WIB" },
  { id: "makassar", name: "Makassar", province: "Sulawesi Selatan", lat: -5.1477, lng: 119.4327, timezone: 8, tzLabel: "WITA" },
  { id: "yogyakarta", name: "Yogyakarta", province: "DI Yogyakarta", lat: -7.7956, lng: 110.3695, timezone: 7, tzLabel: "WIB" },
  { id: "denpasar", name: "Denpasar", province: "Bali", lat: -8.6705, lng: 115.2126, timezone: 8, tzLabel: "WITA" },
  { id: "malang", name: "Malang", province: "Jawa Timur", lat: -7.9666, lng: 112.6326, timezone: 7, tzLabel: "WIB" },
  { id: "balikpapan", name: "Balikpapan", province: "Kalimantan Timur", lat: -1.2379, lng: 116.8289, timezone: 8, tzLabel: "WITA" },
  { id: "samarinda", name: "Samarinda", province: "Kalimantan Timur", lat: -0.5022, lng: 117.1536, timezone: 8, tzLabel: "WITA" },
  { id: "banjarmasin", name: "Banjarmasin", province: "Kalimantan Selatan", lat: -3.3167, lng: 114.59, timezone: 8, tzLabel: "WITA" },
  { id: "pontianak", name: "Pontianak", province: "Kalimantan Barat", lat: -0.0263, lng: 109.3425, timezone: 7, tzLabel: "WIB" },
  { id: "padang", name: "Padang", province: "Sumatera Barat", lat: -0.9471, lng: 100.4172, timezone: 7, tzLabel: "WIB" },
  { id: "pekanbaru", name: "Pekanbaru", province: "Riau", lat: 0.5071, lng: 101.4478, timezone: 7, tzLabel: "WIB" },
  { id: "bandar-lampung", name: "Bandar Lampung", province: "Lampung", lat: -5.4292, lng: 105.2625, timezone: 7, tzLabel: "WIB" },
  { id: "batam", name: "Batam", province: "Kepulauan Riau", lat: 1.1301, lng: 104.0529, timezone: 7, tzLabel: "WIB" },
  { id: "aceh", name: "Banda Aceh", province: "Aceh", lat: 5.5483, lng: 95.3238, timezone: 7, tzLabel: "WIB" },
  { id: "bogor", name: "Bogor", province: "Jawa Barat", lat: -6.5971, lng: 106.806, timezone: 7, tzLabel: "WIB" },
  { id: "depok", name: "Depok", province: "Jawa Barat", lat: -6.4025, lng: 106.7942, timezone: 7, tzLabel: "WIB" },
  { id: "tangerang", name: "Tangerang", province: "Banten", lat: -6.1783, lng: 106.6319, timezone: 7, tzLabel: "WIB" },
  { id: "bekasi", name: "Bekasi", province: "Jawa Barat", lat: -6.2383, lng: 106.9756, timezone: 7, tzLabel: "WIB" },
  { id: "solo", name: "Surakarta (Solo)", province: "Jawa Tengah", lat: -7.5755, lng: 110.8243, timezone: 7, tzLabel: "WIB" },
  { id: "mataram", name: "Mataram (Lombok)", province: "Nusa Tenggara Barat", lat: -8.5833, lng: 116.1167, timezone: 8, tzLabel: "WITA" },
  { id: "kupang", name: "Kupang", province: "Nusa Tenggara Timur", lat: -10.1772, lng: 123.607, timezone: 8, tzLabel: "WITA" },
  { id: "manado", name: "Manado", province: "Sulawesi Utara", lat: 1.4748, lng: 124.8428, timezone: 8, tzLabel: "WITA" },
  { id: "ambon", name: "Ambon", province: "Maluku", lat: -3.6547, lng: 128.1906, timezone: 9, tzLabel: "WIT" },
  { id: "jayapura", name: "Jayapura", province: "Papua", lat: -2.5916, lng: 140.669, timezone: 9, tzLabel: "WIT" },
]

export const DEFAULT_CITY = INDONESIA_CITIES.find((c) => c.id === "palembang") || INDONESIA_CITIES[0] // Palembang (Sumatera Selatan)

/**
 * Hitung jadwal sholat astronomis presisi untuk suatu tanggal dan kota
 */
export function calculatePrayerTimes(date: Date = new Date(), city: CityLocation = DEFAULT_CITY): PrayerSchedule {
  const d = new Date(date)
  const startOfYear = new Date(Date.UTC(d.getFullYear(), 0, 1))
  const dayOfYear =
    Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - startOfYear.getTime()) / 86400000) + 1

  // Fractional year (radians)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (12 - city.timezone) / 24)

  // Equation of Time (menit)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))

  // Deklinasi Matahari (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const rad = Math.PI / 180
  const phi = city.lat * rad

  // Dzuhur / Solar Transit (jam desimal)
  const solarNoon = 12 + (city.timezone * 15 - city.lng) / 15 - eqtime / 60

  function hourAngle(altitudeDeg: number): number {
    const h = altitudeDeg * rad
    const cosHA = (Math.sin(h) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl))
    if (cosHA > 1) return 0
    if (cosHA < -1) return 12
    return Math.acos(cosHA) / rad / 15
  }

  // Sudut posisi matahari standar Kemenag
  const haFajr = hourAngle(-20.0) // Subuh
  const haSunrise = hourAngle(-1.0) // Terbit
  const haDhuha = hourAngle(4.5) // Dhuha (+4.5°)
  const haIsha = hourAngle(-18.0) // Isya

  // Ashar: cot(h) = 1 + tan|phi - decl|
  const asrAltRad = Math.atan(1 / (1 + Math.tan(Math.abs(phi - decl))))
  const haAsr = hourAngle(asrAltRad / rad)

  const toTimeString = (hours: number): string => {
    let totalMinutes = Math.round(hours * 60)
    if (totalMinutes < 0) totalMinutes += 1440
    totalMinutes = totalMinutes % 1440
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }

  // Faktor kehati-hatian Kemenag RI (+2 s.d. +3 menit pengaman waktu sholat)
  const ihtiyath = 2.8 / 60


  const subuhH = solarNoon - haFajr + ihtiyath
  const terbitH = solarNoon - haSunrise
  const dhuhaH = solarNoon - haDhuha + ihtiyath
  const dzuhurH = solarNoon + ihtiyath
  const asrH = solarNoon + haAsr + ihtiyath
  const maghribH = solarNoon + haSunrise + ihtiyath
  const isyaH = solarNoon + haIsha + ihtiyath
  const imsakH = subuhH - 10 / 60

  const yearStr = d.getFullYear()
  const monthStr = String(d.getMonth() + 1).padStart(2, "0")
  const dayStr = String(d.getDate()).padStart(2, "0")

  return {
    imsak: toTimeString(imsakH),
    subuh: toTimeString(subuhH),
    terbit: toTimeString(terbitH),
    dhuha: toTimeString(dhuhaH),
    dzuhur: toTimeString(dzuhurH),
    ashar: toTimeString(asrH),
    maghrib: toTimeString(maghribH),
    isya: toTimeString(isyaH),
    date: `${yearStr}-${monthStr}-${dayStr}`,
    cityName: city.name,
    tzLabel: city.tzLabel,
  }
}

/**
 * Mendapatkan informasi waktu sholat berikutnya beserta sisa waktu menit
 */
export function getNextPrayer(schedule: PrayerSchedule, now: Date = new Date()): NextPrayerInfo {
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentTotal = currentHours * 60 + currentMinutes

  const parseMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map((v) => parseInt(v, 10))
    return h * 60 + m
  }

  const prayers: { name: NextPrayerInfo["name"]; time: string; minutes: number }[] = [
    { name: "Imsak", time: schedule.imsak, minutes: parseMinutes(schedule.imsak) },
    { name: "Subuh", time: schedule.subuh, minutes: parseMinutes(schedule.subuh) },
    { name: "Terbit", time: schedule.terbit, minutes: parseMinutes(schedule.terbit) },
    { name: "Dhuha", time: schedule.dhuha, minutes: parseMinutes(schedule.dhuha) },
    { name: "Dzuhur", time: schedule.dzuhur, minutes: parseMinutes(schedule.dzuhur) },
    { name: "Ashar", time: schedule.ashar, minutes: parseMinutes(schedule.ashar) },
    { name: "Maghrib", time: schedule.maghrib, minutes: parseMinutes(schedule.maghrib) },
    { name: "Isya", time: schedule.isya, minutes: parseMinutes(schedule.isya) },
  ]

  // Cari sholat terdekat setelah waktu saat ini
  let next = prayers.find((p) => p.minutes > currentTotal)
  let diffMinutes = 0

  if (next) {
    diffMinutes = next.minutes - currentTotal
  } else {
    // Jika sudah lewat Isya, target berikutnya adalah Imsak/Subuh besok
    next = prayers[0] // Imsak besok
    diffMinutes = 1440 - currentTotal + next.minutes
  }

  // Cek apakah waktu pas tiba (toleransi 0 s.d. 1 menit)
  const isDueNow = diffMinutes <= 1 && diffMinutes >= 0

  let formattedCountdown = ""
  if (diffMinutes <= 0) {
    formattedCountdown = "Waktu sholat tiba!"
  } else if (diffMinutes < 60) {
    formattedCountdown = `${diffMinutes} menit lagi`
  } else {
    const hrs = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    formattedCountdown = mins > 0 ? `${hrs} jam ${mins} mnt lagi` : `${hrs} jam lagi`
  }

  return {
    name: next.name,
    time: next.time,
    remainingMinutes: diffMinutes,
    isDueNow,
    formattedCountdown,
  }
}
