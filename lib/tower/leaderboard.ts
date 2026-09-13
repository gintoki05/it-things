export interface TowerEntry {
  userId: string
  name: string
  score: number
  floors: number
}

export function isValidTowerScore(score: number, floors: number) {
  return Number.isSafeInteger(score) && Number.isSafeInteger(floors)
    && floors >= 1 && floors <= 1000
    && score >= floors * 100 && score <= floors * 350 && score % 50 === 0
}

export function towerDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date())
}
