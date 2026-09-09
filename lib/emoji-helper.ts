/**
 * Helper cerdas untuk mendeteksi emoji retro yang cocok berdasarkan nama makanan/minuman
 */
export function detectEmoji(name: string): string {
  const lower = name.toLowerCase()

  if (
    lower.includes("mie") || 
    lower.includes("pop mie") || 
    lower.includes("indomie") || 
    lower.includes("ramen") || 
    lower.includes("bihun") || 
    lower.includes("bakso") || 
    lower.includes("soto")
  ) {
    return "🍜"
  }

  if (
    lower.includes("sosis") || 
    lower.includes("kanzler") || 
    lower.includes("champ") || 
    lower.includes("daging") || 
    lower.includes("kornet")
  ) {
    return "🌭"
  }

  if (
    lower.includes("kopi") || 
    lower.includes("coffee") || 
    lower.includes("espresso") || 
    lower.includes("latte") || 
    lower.includes("cappuccino") || 
    lower.includes("indocafe") || 
    lower.includes("good day") || 
    lower.includes("caffeine")
  ) {
    return "☕"
  }

  if (
    lower.includes("teh") || 
    lower.includes("tea") || 
    lower.includes("tong tji") || 
    lower.includes("sariwangi") || 
    lower.includes("matcha")
  ) {
    return "🍵"
  }

  if (
    lower.includes("susu") || 
    lower.includes("milk") || 
    lower.includes("uht") || 
    lower.includes("ultra") || 
    lower.includes("bear brand")
  ) {
    return "🥛"
  }

  if (
    lower.includes("biskuit") || 
    lower.includes("oreo") || 
    lower.includes("malkist") || 
    lower.includes("cookies") || 
    lower.includes("wafer") || 
    lower.includes("tango") || 
    lower.includes("chitato") || 
    lower.includes("snack") || 
    lower.includes("keripik") || 
    lower.includes("jajan")
  ) {
    return "🍪"
  }

  if (
    lower.includes("saos") || 
    lower.includes("saus") || 
    lower.includes("sambal") || 
    lower.includes("chili") || 
    lower.includes("pedas")
  ) {
    return "🌶️"
  }

  if (
    lower.includes("kecap") || 
    lower.includes("bango") || 
    lower.includes("bumbu") || 
    lower.includes("garam") || 
    lower.includes("minyak")
  ) {
    return "🥢"
  }

  if (
    lower.includes("roti") || 
    lower.includes("bread") || 
    lower.includes("sandwich") || 
    lower.includes("selai")
  ) {
    return "🥪"
  }

  if (
    lower.includes("permen") || 
    lower.includes("candy") || 
    lower.includes("cokelat") || 
    lower.includes("chocolate")
  ) {
    return "🍬"
  }

  if (
    lower.includes("cola") || 
    lower.includes("soda") || 
    lower.includes("sprite") || 
    lower.includes("fanta") || 
    lower.includes("jus") || 
    lower.includes("air mineral") || 
    lower.includes("aqua")
  ) {
    return "🥤"
  }

  return "📦"
}
