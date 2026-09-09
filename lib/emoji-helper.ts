/**
 * Helper cerdas untuk mendeteksi icon retro yang cocok berdasarkan nama makanan/minuman
 */
export function detectEmoji(name: string): string {
  const lower = name.toLowerCase()

  if (
    lower.includes("kopi") || 
    lower.includes("coffee") || 
    lower.includes("espresso") || 
    lower.includes("latte") || 
    lower.includes("cappuccino") || 
    lower.includes("indocafe") || 
    lower.includes("good day") || 
    lower.includes("caffeine") ||
    lower.includes("teh") || 
    lower.includes("tea") || 
    lower.includes("tong tji") || 
    lower.includes("sariwangi") || 
    lower.includes("matcha") ||
    lower.includes("susu") || 
    lower.includes("milk") || 
    lower.includes("uht") || 
    lower.includes("ultra") || 
    lower.includes("bear brand") ||
    lower.includes("cola") || 
    lower.includes("soda") || 
    lower.includes("sprite") || 
    lower.includes("fanta") || 
    lower.includes("jus") || 
    lower.includes("air mineral") || 
    lower.includes("aqua")
  ) {
    return "coffee"
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
    lower.includes("jajan") ||
    lower.includes("permen") || 
    lower.includes("candy") || 
    lower.includes("cokelat") || 
    lower.includes("chocolate")
  ) {
    return "gift"
  }

  return "pantry"
}
