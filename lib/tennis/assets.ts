import * as THREE from "three"
import { COURT_CONFIG, MiiAvatarObject, PlayerVisualConfig } from "./types"
import {
  createWiiSportsGrassCourtTexture,
  createTennisBallTexture,
  createRacketStringsTexture,
  createMiiHeadTexture,
  createStadiumLogoTexture,
  createTennisNetTexture,
} from "./textures"

/**
 * 1. Membuat Lapangan Tenis 3D Persis Wii Sports (Gambar Referensi 2)
 */
export function createTennisCourt(): THREE.Group {
  const courtGroup = new THREE.Group()

  // --- A. Lantai Lapangan Rumput ---
  const courtTexture = createWiiSportsGrassCourtTexture()
  courtTexture.anisotropy = 8

  const groundGeo = new THREE.PlaneGeometry(COURT_CONFIG.width * 1.7, COURT_CONFIG.length * 1.35)
  const groundMat = new THREE.MeshStandardMaterial({
    map: courtTexture,
    roughness: 0.7,
    metalness: 0.0,
  })
  const courtMesh = new THREE.Mesh(groundGeo, groundMat)
  courtMesh.rotation.x = -Math.PI / 2
  courtMesh.receiveShadow = true
  courtGroup.add(courtMesh)

  // --- B. Dinding Pembatas Stadion Hijau Tua ---
  const wallHeight = 1.35
  const wallColor = 0x225c2b
  const wallMat = new THREE.MeshStandardMaterial({
    color: wallColor,
    roughness: 0.5,
    metalness: 0.05,
  })

  const wallThickness = 0.4
  const courtBoundX = COURT_CONFIG.width * 0.78
  const courtBoundZ = (COURT_CONFIG.length * 1.35) / 2

  // Dinding Belakang Sisi Lawan
  const backWallGeo = new THREE.BoxGeometry(courtBoundX * 2 + wallThickness * 2, wallHeight, wallThickness)
  const backWall = new THREE.Mesh(backWallGeo, wallMat)
  backWall.position.set(0, wallHeight / 2, -courtBoundZ)
  backWall.castShadow = true
  backWall.receiveShadow = true
  courtGroup.add(backWall)

  // Logo Oval Putih "IT THINGS" di Dinding Belakang
  const logoTexture = createStadiumLogoTexture()
  const logoGeo = new THREE.PlaneGeometry(3.6, 0.9)
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
  })
  const logoMesh = new THREE.Mesh(logoGeo, logoMat)
  logoMesh.position.set(0, wallHeight * 0.7, -courtBoundZ + wallThickness / 2 + 0.02)
  courtGroup.add(logoMesh)

  // Dinding Belakang Sisi Player
  const nearWall = backWall.clone()
  nearWall.position.z = courtBoundZ
  courtGroup.add(nearWall)

  // Dinding Samping Kiri & Kanan
  const sideWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, courtBoundZ * 2)
  const leftWall = new THREE.Mesh(sideWallGeo, wallMat)
  leftWall.position.set(-courtBoundX, wallHeight / 2, 0)
  leftWall.castShadow = true
  leftWall.receiveShadow = true
  courtGroup.add(leftWall)

  const rightWall = leftWall.clone()
  rightWall.position.x = courtBoundX
  courtGroup.add(rightWall)

  // Plakat Logo di Dinding Samping
  const sideLogoMeshL = logoMesh.clone()
  sideLogoMeshL.rotation.y = Math.PI / 2
  sideLogoMeshL.position.set(-courtBoundX + wallThickness / 2 + 0.02, wallHeight * 0.7, 0)
  courtGroup.add(sideLogoMeshL)

  const sideLogoMeshR = logoMesh.clone()
  sideLogoMeshR.rotation.y = -Math.PI / 2
  sideLogoMeshR.position.set(courtBoundX - wallThickness / 2 - 0.02, wallHeight * 0.7, 0)
  courtGroup.add(sideLogoMeshR)

  // --- C. Deretan Pepohonan Rimbun di Belakang Stadion ---
  const treesGroup = createBackgroundTrees(courtBoundX, -courtBoundZ - 1.2)
  courtGroup.add(treesGroup)

  // --- D. Tribun Penonton Tertutup ---
  const grandstandL = createWiiGrandstand(-courtBoundX - 0.2, courtBoundZ * 1.8, -1)
  courtGroup.add(grandstandL)

  const grandstandR = createWiiGrandstand(courtBoundX + 0.2, courtBoundZ * 1.8, 1)
  courtGroup.add(grandstandR)

  // --- E. Jaring Net Tenis & Center Strap ---
  const netHeight = COURT_CONFIG.netHeight
  const netWidth = COURT_CONFIG.netWidth

  const postRadius = 0.09
  const postHeight = netHeight * 1.15
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16)
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2e6b36, roughness: 0.3 })

  const leftPost = new THREE.Mesh(postGeo, postMat)
  leftPost.position.set(-netWidth / 2, postHeight / 2, 0)
  leftPost.castShadow = true
  courtGroup.add(leftPost)

  const rightPost = leftPost.clone()
  rightPost.position.x = netWidth / 2
  courtGroup.add(rightPost)

  const netTexture = createTennisNetTexture()
  netTexture.wrapS = THREE.RepeatWrapping
  netTexture.wrapT = THREE.ClampToEdgeWrapping
  netTexture.repeat.set(6, 1)

  const netGeo = new THREE.PlaneGeometry(netWidth, netHeight)
  const netMat = new THREE.MeshStandardMaterial({
    map: netTexture,
    transparent: true,
    opacity: 0.85,
    roughness: 0.8,
    side: THREE.DoubleSide,
  })
  const netMesh = new THREE.Mesh(netGeo, netMat)
  netMesh.position.set(0, netHeight / 2, 0)
  courtGroup.add(netMesh)

  const strapGeo = new THREE.BoxGeometry(0.12, netHeight, 0.04)
  const strapMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  const strapMesh = new THREE.Mesh(strapGeo, strapMat)
  strapMesh.position.set(0, netHeight / 2, 0)
  courtGroup.add(strapMesh)

  return courtGroup
}

function createBackgroundTrees(width: number, zPos: number): THREE.Group {
  const group = new THREE.Group()
  const treeColors = [0x2d6a4f, 0x40916c, 0x52b788, 0x1b4332]
  const numTrees = 16

  for (let i = 0; i < numTrees; i++) {
    const x = -width * 1.2 + (i / (numTrees - 1)) * (width * 2.4) + (Math.random() - 0.5) * 0.8
    const height = 3.2 + Math.random() * 1.4
    const radius = 1.1 + Math.random() * 0.5
    const color = treeColors[i % treeColors.length]

    const canopyGeo = new THREE.SphereGeometry(radius, 12, 12)
    const canopyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
    const canopy = new THREE.Mesh(canopyGeo, canopyMat)
    canopy.position.set(x, height, zPos - 0.8 + Math.random() * 0.5)
    canopy.scale.set(1.2, 1.4, 1.0)
    group.add(canopy)
  }

  return group
}

function createWiiGrandstand(xPos: number, length: number, direction: 1 | -1): THREE.Group {
  const group = new THREE.Group()
  const frameColor = 0x225c2b
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.6 })

  const tierWidth = 1.4
  const tierHeight = 0.5
  const numTiers = 2

  for (let t = 0; t < numTiers; t++) {
    const tierGeo = new THREE.BoxGeometry(tierWidth, tierHeight, length)
    const tierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 })
    const tier = new THREE.Mesh(tierGeo, tierMat)
    tier.position.set(
      xPos + direction * (t * tierWidth + tierWidth / 2),
      (t + 0.5) * tierHeight,
      0
    )
    group.add(tier)

    const railGeo = new THREE.BoxGeometry(0.08, 0.45, length)
    const rail = new THREE.Mesh(railGeo, frameMat)
    rail.position.set(
      xPos + direction * (t * tierWidth + 0.05),
      (t + 1) * tierHeight + 0.22,
      0
    )
    group.add(rail)

    const numSpectators = 12
    const shirtColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x8b5cf6, 0x10b981, 0xec4899, 0xffffff]
    const hairColors = [0x3e2723, 0x1f2937, 0xd97706, 0x78350f]

    for (let s = 0; s < numSpectators; s++) {
      const specGroup = new THREE.Group()

      const shirtGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 12)
      const shirtMat = new THREE.MeshStandardMaterial({
        color: shirtColors[(t * 5 + s) % shirtColors.length],
        roughness: 0.6,
      })
      const shirt = new THREE.Mesh(shirtGeo, shirtMat)
      shirt.position.y = 0.22
      specGroup.add(shirt)

      const headGeo = new THREE.SphereGeometry(0.2, 12, 12)
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.5 })
      const head = new THREE.Mesh(headGeo, headMat)
      head.position.y = 0.55
      specGroup.add(head)

      const hairGeo = new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5)
      const hairMat = new THREE.MeshStandardMaterial({
        color: hairColors[(t * 3 + s) % hairColors.length],
        roughness: 0.7,
      })
      const hair = new THREE.Mesh(hairGeo, hairMat)
      hair.position.y = 0.58
      specGroup.add(hair)

      const z = -length / 2 + (s + 0.5) * (length / numSpectators) + (Math.random() - 0.5) * 0.2
      specGroup.position.set(
        xPos + direction * (t * tierWidth + tierWidth * 0.55),
        (t + 1) * tierHeight,
        z
      )
      group.add(specGroup)
    }
  }

  const roofGeo = new THREE.BoxGeometry(tierWidth * 2.4, 0.2, length * 1.05)
  const roof = new THREE.Mesh(roofGeo, frameMat)
  roof.position.set(xPos + direction * (tierWidth * 1.2), 3.2, 0)
  roof.rotation.z = -direction * 0.15
  group.add(roof)

  return group
}

/**
 * 2. Membuat Bola Tenis 3D
 */
export function createTennisBall(): {
  ballMesh: THREE.Mesh
  shadowMesh: THREE.Mesh
  group: THREE.Group
} {
  const group = new THREE.Group()

  const radius = 0.24
  const ballGeo = new THREE.SphereGeometry(radius, 32, 32)
  const ballTexture = createTennisBallTexture()
  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTexture,
    roughness: 0.65,
    metalness: 0.0,
  })
  const ballMesh = new THREE.Mesh(ballGeo, ballMat)
  ballMesh.castShadow = true
  group.add(ballMesh)

  const shadowGeo = new THREE.PlaneGeometry(radius * 2.6, radius * 2.6)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
  shadowMesh.rotation.x = -Math.PI / 2
  shadowMesh.position.y = 0.015
  group.add(shadowMesh)

  return { ballMesh, shadowMesh, group }
}

/**
 * 3. Membuat Raket Tenis 3D Khas Wii Sports
 */
export function createTennisRacket(accentColor = 0x84cc16): THREE.Group {
  const racketGroup = new THREE.Group()

  // Frame Kepala Raket (Oval Torus)
  const frameGeo = new THREE.TorusGeometry(0.38, 0.025, 16, 32)
  const frameMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.4,
    roughness: 0.25,
  })
  const frameMesh = new THREE.Mesh(frameGeo, frameMat)
  frameMesh.scale.set(0.85, 1.2, 1.0)
  frameMesh.position.y = 0.75
  racketGroup.add(frameMesh)

  // Senar Raket
  const stringsGeo = new THREE.PlaneGeometry(0.38 * 2 * 0.85, 0.38 * 2 * 1.2)
  const stringsTexture = createRacketStringsTexture()
  const stringsMat = new THREE.MeshStandardMaterial({
    map: stringsTexture,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    roughness: 0.3,
  })
  const stringsMesh = new THREE.Mesh(stringsGeo, stringsMat)
  stringsMesh.position.y = 0.75
  racketGroup.add(stringsMesh)

  // Leher Raket
  const neckGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.22, 12)
  const neckMesh = new THREE.Mesh(neckGeo, frameMat)
  neckMesh.position.y = 0.25
  racketGroup.add(neckMesh)

  // Gagang Pegangan Grip Tape Putih
  const gripGeo = new THREE.CylinderGeometry(0.03, 0.032, 0.35, 12)
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
  })
  const gripMesh = new THREE.Mesh(gripGeo, gripMat)
  gripMesh.position.y = -0.04
  racketGroup.add(gripMesh)

  return racketGroup
}

/**
 * 4. MEMBUAT KARAKTER MII 3D ANATOMI MANUSIA REALISTIS (WII SPORTS CHIBI)
 * Menghilangkan bentuk kerucut/lampu meja! 
 * Menggunakan proporsi tubuh atletis berbusana tenis:
 * - Kepala Mii dengan wajah 360° & rambut halus
 * - Leher & kerah kaos putih
 * - Badan torso atletis dengan bahu melengkung
 * - Celana pendek tenis putih (athletic shorts) dengan pinggul melengkung
 * - Kaki proporsional dengan kaus kaki
 * - Sepatu tenis olahraga 3D bertumit dan bersol karet
 * - Tangan melayang menggenggam raket tenis
 */
export function createMiiCharacter(config: PlayerVisualConfig): MiiAvatarObject {
  const group = new THREE.Group()

  // Material Palette
  const skinMat = new THREE.MeshStandardMaterial({ color: config.skinTone, roughness: 0.55 })
  const shirtMat = new THREE.MeshStandardMaterial({ color: config.shirtColor, roughness: 0.55 })
  const shortsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
  const soleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 })
  const hairMat = new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.7 })

  // ==========================================
  // A. KAKI & SEPATU OLAHRAGA 3D (BAWAH)
  // Sepatu berdiri kokoh di atas lantai y = 0
  // ==========================================
  const legLeft = new THREE.Group()
  const legRight = new THREE.Group()

  // Builder Sepatu Tenis 3D
  const createShoe = () => {
    const shoeGroup = new THREE.Group()

    // 1. Sol Sepatu Karet (Sole Base)
    const soleGeo = new THREE.BoxGeometry(0.18, 0.05, 0.32)
    const sole = new THREE.Mesh(soleGeo, soleMat)
    sole.position.set(0, 0.025, 0)
    sole.castShadow = true
    shoeGroup.add(sole)

    // 2. Badan Sepatu Putih (Upper Shoe)
    const upperGeo = new THREE.BoxGeometry(0.17, 0.1, 0.3)
    const upper = new THREE.Mesh(upperGeo, shoeMat)
    upper.position.set(0, 0.09, 0)
    upper.castShadow = true
    shoeGroup.add(upper)

    // 3. Moncong Sepatu Melengkung Depan (Toe Box)
    const toeGeo = new THREE.SphereGeometry(0.085, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)
    const toe = new THREE.Mesh(toeGeo, shoeMat)
    toe.position.set(0, 0.06, config.isOpponent ? 0.12 : -0.12)
    toe.scale.set(0.98, 0.8, 1.2)
    toe.castShadow = true
    shoeGroup.add(toe)

    // 4. Lidah & Kerah Tumit Sepatu (Heel Collar)
    const collarGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 14)
    const heelCollar = new THREE.Mesh(collarGeo, shoeMat)
    heelCollar.position.set(0, 0.14, config.isOpponent ? -0.04 : 0.04)
    shoeGroup.add(heelCollar)

    return shoeGroup
  }

  // Pasang Sepatu di Kaki Kiri & Kanan
  const shoeL = createShoe()
  legLeft.add(shoeL)

  const shoeR = createShoe()
  legRight.add(shoeR)

  // Batang Kaki / Kaus Kaki Putih Tenis (Leg & Socks)
  const legGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.32, 14)
  const legMeshL = new THREE.Mesh(legGeo, shortsMat)
  legMeshL.position.set(0, 0.31, 0)
  legMeshL.castShadow = true
  legLeft.add(legMeshL)

  const legMeshR = new THREE.Mesh(legGeo, shortsMat)
  legMeshR.position.set(0, 0.31, 0)
  legMeshR.castShadow = true
  legRight.add(legMeshR)

  legLeft.position.set(-0.16, 0, 0)
  legRight.position.set(0.16, 0, 0)
  group.add(legLeft)
  group.add(legRight)

  // ==========================================
  // B. PINGGUL & CELANA PENDEK OLAHRAGA (SHORTS)
  // Menghubungkan kaki ke torso secara natural
  // ==========================================
  const shortsGroup = new THREE.Group()
  shortsGroup.position.set(0, 0.58, 0)

  // Pinggul Celana Pendek (Pelvis / Waistband)
  const pelvisGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.22, 18)
  const pelvis = new THREE.Mesh(pelvisGeo, shortsMat)
  pelvis.castShadow = true
  shortsGroup.add(pelvis)

  // Pangkal Paha Kiri & Kanan (Shorts Leg Openings)
  const cuffGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.12, 16)
  const cuffL = new THREE.Mesh(cuffGeo, shortsMat)
  cuffL.position.set(-0.16, -0.1, 0)
  shortsGroup.add(cuffL)

  const cuffR = new THREE.Mesh(cuffGeo, shortsMat)
  cuffR.position.set(0.16, -0.1, 0)
  shortsGroup.add(cuffR)

  group.add(shortsGroup)

  // ==========================================
  // C. TORSO / KAOS OLAHRAGA BERKERAH (ATASAN)
  // Bentuk atletis melengkung halus (bukan kerucut datar!)
  // ==========================================
  const torsoGroup = new THREE.Group()
  torsoGroup.position.set(0, 0.96, 0)

  // Badan Kaos Melengkung Halus (Curved Athletic Torso)
  // Lebar di dada/bahu (0.32), ramping di pinggang (0.24)
  const torsoGeo = new THREE.CylinderGeometry(0.28, 0.25, 0.54, 20)
  const torso = new THREE.Mesh(torsoGeo, shirtMat)
  torso.castShadow = true
  torsoGroup.add(torso)

  // Bahu Melengkung (Rounded Shoulders)
  const shoulderGeo = new THREE.SphereGeometry(0.29, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)
  const shoulders = new THREE.Mesh(shoulderGeo, shirtMat)
  shoulders.position.set(0, 0.26, 0)
  shoulders.scale.set(1.05, 0.7, 0.85)
  torsoGroup.add(shoulders)

  // Kerah Kaos Putih Sporty
  const collarGeo = new THREE.TorusGeometry(0.16, 0.035, 12, 24)
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
  const collar = new THREE.Mesh(collarGeo, collarMat)
  collar.rotation.x = Math.PI / 2
  collar.position.set(0, 0.35, 0)
  torsoGroup.add(collar)

  // Leher Karakter
  const neckGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.14, 14)
  const neck = new THREE.Mesh(neckGeo, skinMat)
  neck.position.set(0, 0.38, 0)
  torsoGroup.add(neck)

  group.add(torsoGroup)

  // ==========================================
  // D. KEPALA, WAJAH 360°, & RAMBUT BERKONTUR
  // ==========================================
  const headRadius = 0.42
  const headGeo = new THREE.SphereGeometry(headRadius, 32, 32)
  headGeo.scale(1.0, 1.04, 0.98) // Proporsi wajah sedikit oval alami

  const hexSkin = `#${config.skinTone.toString(16).padStart(6, "0")}`
  const hexHair = `#${config.hairColor.toString(16).padStart(6, "0")}`
  const headTexture = createMiiHeadTexture(hexSkin, config.isOpponent, "#111111", hexHair)

  const headMat = new THREE.MeshStandardMaterial({
    map: headTexture,
    roughness: 0.55,
    metalness: 0.0,
  })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.set(0, 1.76, 0)
  head.castShadow = true
  group.add(head)

  // Telinga 3D Kiri & Kanan
  const earGeo = new THREE.SphereGeometry(0.1, 14, 14)
  const earL = new THREE.Mesh(earGeo, skinMat)
  earL.scale.set(0.55, 0.95, 0.8)
  earL.position.set(-headRadius * 0.94, -0.02, 0)
  head.add(earL)

  const earR = earL.clone()
  earR.position.x = headRadius * 0.94
  head.add(earR)

  // Rambut 3D Halus (Smooth Contoured Hair Cap)
  const hairCapGeo = new THREE.SphereGeometry(headRadius * 1.05, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6)
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat)
  hairCap.position.y = 0.04
  hairCap.scale.set(1.02, 1.02, 1.04)
  head.add(hairCap)

  // Tengkuk Belakang Rambut (Back Hair Nape)
  const backNapeAngle = config.isOpponent ? Math.PI * 0.75 : -Math.PI * 0.25
  const backNapeGeo = new THREE.SphereGeometry(headRadius * 1.04, 24, 16, backNapeAngle, Math.PI * 1.5, Math.PI * 0.35, Math.PI * 0.45)
  const backNape = new THREE.Mesh(backNapeGeo, hairMat)
  head.add(backNape)

  // ==========================================
  // E. TANGAN & RAKET MELAYANG (FLOATING HANDS)
  // ==========================================
  const handRadius = 0.12
  const handGeo = new THREE.SphereGeometry(handRadius, 16, 16)

  // Tangan Kiri
  const leftHand = new THREE.Mesh(handGeo, skinMat)
  leftHand.position.set(-0.46, 1.02, 0)
  leftHand.castShadow = true
  group.add(leftHand)

  // Tangan Kanan Memegang Raket
  const rightHand = new THREE.Group()
  rightHand.position.set(0.46, 1.02, 0)

  const rightHandMesh = new THREE.Mesh(handGeo, skinMat)
  rightHandMesh.castShadow = true
  rightHand.add(rightHandMesh)

  // Raket Tenis Berdiri Tegak Siap Pukul
  const racket = createTennisRacket(config.shirtColor)
  racket.position.set(0.08, 0.18, -0.08)
  racket.rotation.x = Math.PI * 0.08
  racket.rotation.z = -Math.PI * 0.05
  rightHand.add(racket)
  group.add(rightHand)

  // Bayangan Lembut di Lantai
  const shadowGeo = new THREE.PlaneGeometry(0.9, 0.9)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  })
  const shadow = new THREE.Mesh(shadowGeo, shadowMat)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.015
  group.add(shadow)

  // ==========================================
  // F. SISTEM ANIMASI AYUNAN & BERLARI
  // ==========================================
  const setSwingAnimation = (progress: number, isForehand: boolean) => {
    const sideSign = isForehand ? 1 : -1
    if (progress <= 0 || progress >= 1) {
      resetPose()
      return
    }

    if (progress < 0.3) {
      // Backswing: Tarik raket ke belakang
      const t = progress / 0.3
      rightHand.rotation.y = sideSign * t * (Math.PI * 0.65)
      rightHand.rotation.x = -t * (Math.PI * 0.35)
      torsoGroup.rotation.y = sideSign * t * 0.35
      head.rotation.y = sideSign * t * 0.15
    } else if (progress < 0.65) {
      // Forward Strike: Ayunan kencang melintasi tubuh
      const t = (progress - 0.3) / 0.35
      rightHand.rotation.y = sideSign * (Math.PI * 0.65 - t * Math.PI * 1.35)
      rightHand.rotation.x = -Math.PI * 0.35 + t * Math.PI * 0.55
      torsoGroup.rotation.y = sideSign * (0.35 - t * 0.75)
      head.rotation.y = sideSign * (0.15 - t * 0.3)
    } else {
      // Follow-Through
      const t = (progress - 0.65) / 0.35
      rightHand.rotation.y = sideSign * (-Math.PI * 0.7 + t * Math.PI * 0.7)
      rightHand.rotation.x = Math.PI * 0.2 - t * Math.PI * 0.2
      torsoGroup.rotation.y = sideSign * (-0.4 + t * 0.4)
      head.rotation.y = sideSign * (-0.15 + t * 0.15)
    }
  }

  const setRunningAnimation = (time: number, isMoving: boolean) => {
    if (!isMoving) {
      // Idle breathing gentle bobbing
      const idleBob = Math.sin(time * 3.5) * 0.02
      torsoGroup.position.y = 0.96 + idleBob
      head.position.y = 1.76 + idleBob * 1.15
      leftHand.position.y = 1.02 + idleBob
      rightHand.position.y = 1.02 + idleBob
      legLeft.position.y = 0
      legRight.position.y = 0
      legLeft.rotation.x = 0
      legRight.rotation.x = 0
      return
    }

    // Gerak lari kecil berirama (running step)
    const runWobble = Math.sin(time * 14)
    torsoGroup.position.y = 0.96 + Math.abs(runWobble) * 0.06
    torsoGroup.rotation.z = runWobble * 0.05
    head.position.y = 1.76 + Math.abs(runWobble) * 0.07

    // Kaki melangkah maju mundur bergantian
    legLeft.position.y = Math.max(0, runWobble * 0.1)
    legLeft.rotation.x = runWobble * 0.45

    legRight.position.y = Math.max(0, -runWobble * 0.1)
    legRight.rotation.x = -runWobble * 0.45

    leftHand.position.y = 1.02 + Math.cos(time * 14) * 0.12
    rightHand.position.y = 1.02 - Math.cos(time * 14) * 0.09
  }

  const resetPose = () => {
    rightHand.rotation.set(0, 0, 0)
    torsoGroup.rotation.set(0, 0, 0)
    head.rotation.set(0, 0, 0)
    legLeft.rotation.set(0, 0, 0)
    legRight.rotation.set(0, 0, 0)
    legLeft.position.set(-0.16, 0, 0)
    legRight.position.set(0.16, 0, 0)
  }

  return {
    group,
    head,
    body: torsoGroup as any,
    rightHand,
    leftHand,
    racket,
    setSwingAnimation,
    setRunningAnimation,
    resetPose,
  }
}
