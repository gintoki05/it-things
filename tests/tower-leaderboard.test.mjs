import test from "node:test"
import assert from "node:assert/strict"
import { isValidTowerScore, towerDate } from "../lib/tower/leaderboard.ts"

test("leaderboard rejects malformed and impossible scores", () => {
  for (const [score, floors] of [[NaN, 1], [Infinity, 1], [-100, 1], [150, 0], [99, 1], [351, 1], [150.5, 1], [150, 1.5], [150, 1001], [150, 10], ["150", 1]]) {
    assert.equal(isValidTowerScore(score, floors), false, `${score}/${floors}`)
  }
  assert.equal(isValidTowerScore(150, 1), true)
  assert.equal(isValidTowerScore(3500, 10), true)
})

test("daily leaderboard date uses Jakarta rather than the browser timezone", () => {
  const expected = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  assert.equal(towerDate(), expected)
})
