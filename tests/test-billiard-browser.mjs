import puppeteer from "puppeteer"

async function runTest() {
  console.log("Launching puppeteer browser...")
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1280, height: 800 },
  })

  const page = await browser.newPage()

  // Collect console logs and errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error("[Browser Console Error]:", msg.text())
    }
  })

  // Bypass security passcode gate and welcome dialogs for testing
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("it_things_passcode_verified", "true")
    sessionStorage.setItem("it_things_passcode_verified", "true")
    localStorage.setItem("it_things_whatsnew_seen", "true")
    localStorage.setItem("it_things_readme_seen", "true")
  })

  console.log("Navigating to http://localhost:3002/?app=billiard...")
  await page.goto("http://localhost:3002/?app=billiard", {
    waitUntil: "networkidle2",
    timeout: 30000,
  })

  console.log("Waiting 3s for hydration...")
  await new Promise((r) => setTimeout(r, 3000))

  // Dismiss auth modal if present (click Mode Peninjauan / Tamu Internal)
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const guestBtn = btns.find((b) => b.innerText.includes("Mode Peninjauan") || b.innerText.includes("Tamu Internal"))
    if (guestBtn) guestBtn.click()

    const pahamBtn = btns.find((b) => b.innerText.includes("Paham & Mulai Eksplorasi"))
    if (pahamBtn) pahamBtn.click()
  })

  await new Promise((r) => setTimeout(r, 1000))

  // 1. Check if POOL98.EXE window is open
  const poolWindow = await page.evaluate(() => {
    const win = document.querySelector('[role="dialog"], .retro-window-frame')
    const allWins = Array.from(document.querySelectorAll('.retro-window-frame'))
    const poolWin = allWins.find((w) => w.innerText.includes("POOL98.EXE") || w.innerText.includes("Billiard 98"))
    if (!poolWin) return null
    return {
      title: poolWin.querySelector('.window-title, .title-bar-text, [class*="title"]')?.innerText,
      hasLobby: poolWin.innerText.includes("BILLIARD 98 — MULTIPLAYER ROOMS") || poolWin.innerText.includes("POOL LOUNGE"),
      buttons: Array.from(poolWin.querySelectorAll("button")).map((b) => b.innerText.trim()),
    }
  })

  console.log("Pool Window Status:", JSON.stringify(poolWindow, null, 2))

  // Screenshot 1: Lobby Screen
  await page.screenshot({ path: "tests/screenshot-billiard-lobby.png" })
  console.log("Saved tests/screenshot-billiard-lobby.png")

  // 1.5 Test Opening Klasemen Modal
  console.log("Clicking 'Buka Klasemen' button in lobby...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const klasemenBtn = btns.find((b) => b.innerText.includes("Buka Klasemen") || b.innerText.includes("Klasemen"))
    if (klasemenBtn) klasemenBtn.click()
  })

  await new Promise((r) => setTimeout(r, 1200))
  await page.screenshot({ path: "tests/screenshot-billiard-leaderboard.png" })
  console.log("Saved tests/screenshot-billiard-leaderboard.png")

  // Close Klasemen Modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const closeBtn = btns.find((b) => b.innerText === "✕" || b.innerText.includes("Tutup") || b.title?.includes("Tutup"))
    if (closeBtn) closeBtn.click()
  })
  await new Promise((r) => setTimeout(r, 400))

  // 2. Click 'Mulai Main Lokal' button to enter Game view
  console.log("Clicking 'Mulai Main Lokal' button...")
  const clickedLocal = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const localBtn = btns.find((b) => b.innerText.includes("Mulai Main Lokal"))
    if (localBtn) {
      localBtn.click()
      return true
    }
    return false
  })
  console.log("Clicked local button:", clickedLocal)

  await new Promise((r) => setTimeout(r, 1500))

  // 3. Inspect Game View & Canvas
  const gameState = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")
    const allWins = Array.from(document.querySelectorAll('.retro-window-frame'))
    const poolWin = allWins.find((w) => w.innerText.includes("POOL98.EXE") || w.innerText.includes("Billiard 98"))
    return {
      hasCanvas: Boolean(canvas),
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      hasPowerBar: Boolean(document.querySelector('[title*="kekuatan pukulan"]')),
      scoreBoardText: poolWin?.innerText.slice(0, 300),
    }
  })

  console.log("Game State in Table View:", JSON.stringify(gameState, null, 2))

  // Screenshot 2: Table & Balls view
  await page.screenshot({ path: "tests/screenshot-billiard-game.png" })
  console.log("Saved tests/screenshot-billiard-game.png")

  // 4. Test Sending Emoji Reaction from Spectator Dock
  console.log("Testing Spectator Emoji Reaction...")
  const clickedEmoji = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const fireBtn = btns.find((b) => b.innerText.includes("🔥") || b.title?.includes("🔥"))
    if (fireBtn) {
      fireBtn.click()
      return true
    }
    return false
  })
  console.log("Clicked Fire Emoji Reaction:", clickedEmoji)

  // Wait 400ms for floating reaction animation to rise
  await new Promise((r) => setTimeout(r, 400))
  await page.screenshot({ path: "tests/screenshot-billiard-reaction.png" })
  console.log("Saved tests/screenshot-billiard-reaction.png")

  // 5. Test Opening Emoji / Quick Chat Menu
  console.log("Testing Chat / Emoji Menu...")
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const chatBtn = btns.find((b) => b.title?.includes("Quick Chat"))
    if (chatBtn) chatBtn.click()
  })
  await new Promise((r) => setTimeout(r, 500))
  await page.screenshot({ path: "tests/screenshot-billiard-chatmenu.png" })
  console.log("Saved tests/screenshot-billiard-chatmenu.png")

  // Close menu and shoot
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"))
    const chatBtn = btns.find((b) => b.title?.includes("Quick Chat"))
    if (chatBtn) chatBtn.click()
  })
  await new Promise((r) => setTimeout(r, 300))

  // 6. Test Shooting on Canvas!
  console.log("Testing drag shot on Canvas...")
  const canvasBox = await page.evaluate(() => {
    const canvas = document.querySelector("canvas")
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  if (canvasBox) {
    // Cue ball is roughly at 25% X, 50% Y of table
    const startX = canvasBox.x + canvasBox.width * 0.25
    const startY = canvasBox.y + canvasBox.height * 0.5

    // Mouse down at cue ball, pull back to the left (15% X) and release
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX - 60, startY, { steps: 5 })
    await new Promise((r) => setTimeout(r, 300))
    await page.mouse.up()

    console.log("Shot executed! Waiting 2s for balls to roll and collide...")
    await new Promise((r) => setTimeout(r, 2000))

    // Screenshot 4: After shot / balls rolling
    await page.screenshot({ path: "tests/screenshot-billiard-shot.png" })
    console.log("Saved tests/screenshot-billiard-shot.png")
  }

  await browser.close()
  console.log("Test completed successfully!")
}

runTest().catch((err) => {
  console.error("Test failed with error:", err)
  process.exit(1)
})
