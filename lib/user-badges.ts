export interface UserBadgeItem {
  id: string
  label: string
  icon: string
  description: string
  color: string
  priority: number // 1 is highest priority
}

export interface ComputeBadgesParams {
  userId?: string
  userRole?: string
  picTags?: Array<{ module: string; label: string; icon: string; color: string }>
  topWordleUserId?: string | null
  isLapakSeller?: boolean
}

/**
 * Menghitung badge aktif untuk user tertentu berdasarkan peran & aktivitas di aplikasi
 */
export function computeUserBadges({
  userId,
  userRole,
  picTags = [],
  topWordleUserId,
  isLapakSeller,
}: ComputeBadgesParams): UserBadgeItem[] {
  const badges: UserBadgeItem[] = []

  // 1. PIC Kas & Pantry
  picTags.forEach((tag) => {
    if (tag.module === "kas") {
      badges.push({
        id: "pic-kas",
        label: "PIC Kas",
        icon: "💰",
        description: "Penanggung Jawab Buku Kas & Iuran Tim",
        color: "bg-amber-100 text-amber-900 border-amber-300",
        priority: 2,
      })
    } else if (tag.module === "pantry") {
      badges.push({
        id: "pic-pantry",
        label: "PIC Pantry",
        icon: "☕",
        description: "Penanggung Jawab Snack & Minuman Kantor",
        color: "bg-sky-100 text-sky-900 border-sky-300",
        priority: 2,
      })
    }
  })

  // 3. Juara Wordle Hari Ini (Rank #1)
  if (userId && topWordleUserId && userId === topWordleUserId) {
    badges.push({
      id: "wordle-top1",
      label: "Wordle #1",
      icon: "🏆",
      description: "Juara 1 Pemecah Wordle 98 Hari Ini!",
      color: "bg-yellow-100 text-yellow-950 border-yellow-400 font-bold",
      priority: 3,
    })
  }

  // 4. Juragan Lapak (Punya produk aktif di Lapak Teman)
  if (isLapakSeller) {
    badges.push({
      id: "lapak-juragan",
      label: "Juragan",
      icon: "🛍️",
      description: "Penjual Aktif di Etalase Lapak Teman",
      color: "bg-rose-100 text-rose-900 border-rose-300",
      priority: 4,
    })
  }

  // Urutkan berdasarkan prioritas (priority terkecil = paling penting)
  return badges.sort((a, b) => a.priority - b.priority)
}
