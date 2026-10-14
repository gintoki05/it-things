import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MiiAvatarObject } from "./types"
import { createStadiumLogoTexture } from "./textures"

const loader = new GLTFLoader()

export interface LoadedMiiActor extends MiiAvatarObject {
  rawModel: THREE.Group
  parts: {
    head?: THREE.Object3D
    torso?: THREE.Object3D
    handL?: THREE.Object3D
    handR?: THREE.Object3D
    footL?: THREE.Object3D
    footR?: THREE.Object3D
  }
}

/**
 * Memuat Mii Player asli dari file .glb (Blender-Authored Wii Sports Assets)
 */
export async function loadMiiPlayerGLB(isOpponent = false): Promise<LoadedMiiActor> {
  const modelFile = isOpponent ? "/models/tennis/mii_opponent.glb" : "/models/tennis/mii_player.glb"

  // 1. Load Mii Character GLB
  const miiGltf = await new Promise<any>((resolve, reject) => {
    loader.load(
      modelFile,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    )
  })

  // 2. Load Tennis Racket GLB
  const racketGltf = await new Promise<any>((resolve, reject) => {
    loader.load(
      "/models/tennis/tennis_racket.glb",
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    )
  })

  const rootGroup = new THREE.Group()
  const miiScene = miiGltf.scene as THREE.Group
  const racketScene = racketGltf.scene as THREE.Group

  // Setup Shadows & Material Tuning
  miiScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.roughness = 0.55
        mat.metalness = 0.05
        mat.needsUpdate = true
      }
    }
  })

  // Identifikasi part tubuh Mii (Head, Torso, Hand_L, Hand_R, Foot_L, Foot_R)
  const parts: LoadedMiiActor["parts"] = {}
  miiScene.traverse((child) => {
    const n = (child.name || "").trim().toLowerCase()
    if (/^head/i.test(n) && !parts.head) parts.head = child
    else if (/^torso/i.test(n) && !parts.torso) parts.torso = child
    else if (/^hand_l/i.test(n) && !parts.handL) parts.handL = child
    else if (/^hand_r/i.test(n) && !parts.handR) parts.handR = child
    else if (/^foot_l/i.test(n) && !parts.footL) parts.footL = child
    else if (/^foot_r/i.test(n) && !parts.footR) parts.footR = child
  })

  // Simpan posisi dasar masing-masing part (Pose atletis Ready Stance Wii Sports)
  const basePos = {
    head: parts.head ? parts.head.position.clone() : new THREE.Vector3(0, 1.22, 0),
    torso: parts.torso ? parts.torso.position.clone() : new THREE.Vector3(0, 0.55, 0),
    handL: parts.handL ? new THREE.Vector3(-0.25, 0.76, 0.18) : new THREE.Vector3(-0.25, 0.76, 0.18),
    handR: parts.handR ? new THREE.Vector3(0.25, 0.78, 0.20) : new THREE.Vector3(0.25, 0.78, 0.20),
    footL: parts.footL ? parts.footL.position.clone() : new THREE.Vector3(-0.105, 0.13, 0.01),
    footR: parts.footR ? parts.footR.position.clone() : new THREE.Vector3(0.105, 0.13, 0.01),
  }

  // Setel posisi awal part ke basePos
  if (parts.handL) parts.handL.position.copy(basePos.handL)
  if (parts.handR) parts.handR.position.copy(basePos.handR)

  // Ambil material Player_Skin langsung dari model agar warna & shading kulit 100% identik
  let skinMaterial: THREE.Material | null = null
  miiScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh
      if (m.material) {
        const mat = m.material as THREE.Material
        if (mat.name === "Player_Skin") {
          skinMaterial = mat
        }
      }
    }
  })
  if (!skinMaterial) {
    skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xed905a,
      roughness: 0.55,
      metalness: 0.05,
    })
  }

  // Sistem Lengan Anatomis Tersambung (Menghubungkan Bahu Torso ke Kepalan Tangan Mii)
  // Mencegah tangan tampak mengambang atau terputus dari tubuh
  const geomUpper = new THREE.CylinderGeometry(0.046, 0.042, 1, 14)
  const geomElbow = new THREE.SphereGeometry(0.043, 14, 12)
  const geomForearm = new THREE.CylinderGeometry(0.042, 0.038, 1, 14)

  const createSingleArmMesh = () => {
    const group = new THREE.Group()
    const upper = new THREE.Mesh(geomUpper, skinMaterial!)
    upper.castShadow = true
    upper.receiveShadow = true

    const elbow = new THREE.Mesh(geomElbow, skinMaterial!)
    elbow.castShadow = true
    elbow.receiveShadow = true

    const forearm = new THREE.Mesh(geomForearm, skinMaterial!)
    forearm.castShadow = true
    forearm.receiveShadow = true

    group.add(upper)
    group.add(elbow)
    group.add(forearm)
    miiScene.add(group)

    return { group, upper, elbow, forearm }
  }

  const armR = createSingleArmMesh()
  const armL = createSingleArmMesh()

  // Titik tengah bukaan lengan baju (shoulder) pada koordinat local Torso
  const shoulderLocalR = new THREE.Vector3(0.28, 0.40, 0.01)
  const shoulderLocalL = new THREE.Vector3(-0.28, 0.40, 0.01)

  const orientCylinderSegment = (mesh: THREE.Mesh, p1: THREE.Vector3, p2: THREE.Vector3) => {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(p2, p1)
    const len = dir.length()
    if (len < 0.005) {
      mesh.visible = false
      return
    }
    mesh.visible = true
    dir.normalize()
    mesh.position.copy(mid)
    mesh.scale.set(1, len, 1)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }

  const updateArmIK = (
    arm: { upper: THREE.Mesh; elbow: THREE.Mesh; forearm: THREE.Mesh },
    shoulderPos: THREE.Vector3,
    handPos: THREE.Vector3,
    isRight: boolean
  ) => {
    const vSW = new THREE.Vector3().subVectors(handPos, shoulderPos)
    const D = vSW.length()
    if (D < 0.01) return

    const dirSW = vSW.clone().normalize()

    let L1 = 0.155
    let L2 = 0.155
    const Lmax = L1 + L2

    if (D >= Lmax) {
      const scale = (D / Lmax) * 1.01
      L1 *= scale
      L2 *= scale
    }

    const x = (L1 * L1 - L2 * L2 + D * D) / (2 * D)
    const h = Math.sqrt(Math.max(0, L1 * L1 - x * x))

    // Arah tekukan siku yang natural: ke samping luar dan sedikit ke belakang
    const bendGuide = new THREE.Vector3(isRight ? 0.9 : -0.9, -0.2, -0.4).normalize()
    const normal = new THREE.Vector3().crossVectors(dirSW, bendGuide)
    const bendDir = new THREE.Vector3()
    if (normal.lengthSq() < 0.001) {
      bendDir.set(isRight ? 1 : -1, 0, 0)
    } else {
      bendDir.crossVectors(normal, dirSW).normalize()
    }

    const elbowPos = new THREE.Vector3()
      .copy(shoulderPos)
      .addScaledVector(dirSW, x)
      .addScaledVector(bendDir, h)

    orientCylinderSegment(arm.upper, shoulderPos, elbowPos)
    arm.elbow.position.copy(elbowPos)
    orientCylinderSegment(arm.forearm, elbowPos, handPos)
  }

  const updateAllArms = () => {
    if (!parts.torso) return

    const sR = shoulderLocalR.clone()
      .applyEuler(parts.torso.rotation)
      .add(parts.torso.position)

    const sL = shoulderLocalL.clone()
      .applyEuler(parts.torso.rotation)
      .add(parts.torso.position)

    if (parts.handR) {
      updateArmIK(armR, sR, parts.handR.position, true)
    }
    if (parts.handL) {
      updateArmIK(armL, sL, parts.handL.position, false)
    }
  }

  // Pasang Raket Tenis ke Tangan Kanan (handR)
  // Grip raket berpusat di Y = 0.11 m. Dengan offset Y = -0.118, kepalan tangan Mii membungkus pas di tengah grip!
  racketScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  racketScene.scale.setScalar(1.08)
  racketScene.position.set(0, -0.118, 0)
  // Kepala raket condong ke depan atas miring 35 derajat khas Wii Sports
  racketScene.rotation.set(0.40, 0.10, -0.22)

  if (parts.handR) {
    parts.handR.add(racketScene)
  }

  // Skala Mii agar proporsional di arena
  miiScene.scale.setScalar(1.16)
  rootGroup.add(miiScene)

  // Inisialisasi lengan awal
  updateAllArms()

  // Sistem Animasi Mii Terkalibrasi Sumbu Otentik Wii Sports
  // (+Z = Depan/Dada, -Z = Belakang/Punggung, +X = Kanan, -X = Kiri, +Y = Atas)
  const setSwingAnimation = (progress: number, swingType: "forehand" | "backhand" | "serve" | boolean) => {
    const isBackhand = swingType === "backhand" || swingType === false
    const isServe = swingType === "serve"
    const isForehand = !isBackhand && !isServe

    if (progress <= 0 || progress >= 1) {
      resetPose()
      return
    }

    if (!parts.handR || !parts.torso || !parts.head) return

    // =============================================================
    // 1. FOREHAND DRIVE (Tarik ke BELAKANG-kanan bawah, mencambuk ke DEPAN-kiri atas)
    // =============================================================
    if (isForehand) {
      if (progress < 0.35) {
        // A. Backswing Unit Turn: Torso putar kanan (+Y), tangan kanan ditarik ke BELAKANG (-Z) kanan bawah
        const t = progress / 0.35
        parts.torso.rotation.y = t * 0.65
        parts.torso.position.y = basePos.torso.y - t * 0.02
        parts.handR.position.set(
          basePos.handR.x + t * 0.18, // Melebar ke kanan
          basePos.handR.y - t * 0.24, // Rendah di pinggul
          basePos.handR.z - t * 0.48  // DITARIK KE BELAKANG (-Z)!
        )
        parts.handR.rotation.set(-t * 0.4, t * 1.5, -t * 0.3)

        // Tangan kiri maju menunjuk bola di DEPAN (+Z)
        if (parts.handL) {
          parts.handL.position.set(
            basePos.handL.x - t * 0.08,
            basePos.handL.y + t * 0.06,
            basePos.handL.z + t * 0.22
          )
          parts.handL.rotation.set(t * 0.3, t * 0.5, 0)
        }
        parts.head.rotation.y = t * 0.15
      } else if (progress < 0.58) {
        // B. Forward Strike & IMPACT: Mencambuk dari belakang (-Z) melesat MAJU KE DEPAN (+Z)!
        const t = (progress - 0.35) / 0.23
        parts.torso.rotation.y = 0.65 - t * 1.15
        parts.torso.position.y = (basePos.torso.y - 0.02) + t * 0.04

        const startX = basePos.handR.x + 0.18
        const startY = basePos.handR.y - 0.24
        const startZ = basePos.handR.z - 0.48 // Mulai dari belakang (-Z)
        const endX = basePos.handR.x - 0.12
        const endY = basePos.handR.y + 0.10
        const endZ = basePos.handR.z + 0.38   // Melesat MAJU KE DEPAN (+Z) menyapu bola!
        parts.handR.position.set(
          startX + t * (endX - startX),
          startY + t * (endY - startY),
          startZ + t * (endZ - startZ)
        )
        parts.handR.rotation.set(-0.4 + t * 1.0, 1.5 - t * 2.5, -0.3 + t * 0.6)

        if (parts.handL) {
          parts.handL.position.set(
            basePos.handL.x - 0.08 + t * 0.08,
            basePos.handL.y + 0.06 - t * 0.06,
            basePos.handL.z + 0.22 - t * 0.22
          )
        }
        parts.head.rotation.y = 0.15 - t * 0.30
      } else {
        // C. Follow-Through: Melingkar naik menyilang dada di atas pundak kiri
        const t = (progress - 0.58) / 0.42
        parts.torso.rotation.y = -0.50 * (1 - t)
        parts.torso.position.y = basePos.torso.y + (1 - t) * 0.02

        const apexY = Math.sin(t * Math.PI) * 0.30
        const curX = THREE.MathUtils.lerp(basePos.handR.x - 0.12, basePos.handR.x, t)
        const curZ = THREE.MathUtils.lerp(basePos.handR.z + 0.38, basePos.handR.z, t)
        parts.handR.position.set(curX - (1 - t) * 0.26, basePos.handR.y + apexY, curZ)
        parts.handR.rotation.set(0.5 * (1 - t), -1.0 * (1 - t), 0.3 * (1 - t))

        if (parts.handL) parts.handL.position.lerp(basePos.handL, t)
        parts.head.rotation.y = -0.15 * (1 - t)
      }
      return
    }

    // =============================================================
    // 2. BACKHAND DRIVE (Tarik ke PINGGUL KIRI bawah, mencambuk ke KANAN-DEPAN atas)
    // =============================================================
    if (isBackhand) {
      if (progress < 0.35) {
        // A. Cross-Body Coil: Torso putar kiri (-Y), tangan kanan menyilang ke pinggul kiri bawah
        const t = progress / 0.35
        parts.torso.rotation.y = -t * 0.75
        parts.torso.position.y = basePos.torso.y - t * 0.03
        parts.handR.position.set(
          basePos.handR.x - t * 0.48, // Pindah ke pinggul kiri (-X)
          basePos.handR.y - t * 0.26, // Rendah di pinggul
          basePos.handR.z - t * 0.18  // Sedikit ditarik ke belakang (-Z)
        )
        // Punggung tangan menghadap ke depan
        parts.handR.rotation.set(-t * 0.35, -t * 1.6, -t * 0.5)

        // Tangan kiri ikut memegang leher raket di pinggul kiri (two-handed prep)
        if (parts.handL) {
          parts.handL.position.set(
            basePos.handL.x + t * 0.15,
            basePos.handL.y - t * 0.22,
            basePos.handL.z - t * 0.12
          )
          parts.handL.rotation.set(-t * 0.2, -t * 0.4, 0)
        }
        parts.head.rotation.y = -t * 0.20
      } else if (progress < 0.58) {
        // B. Explosive Uncoil & IMPACT: Mencambuk dari pinggul kiri melesat ke KANAN-DEPAN (+X, +Z)!
        const t = (progress - 0.35) / 0.23
        parts.torso.rotation.y = -0.75 + t * 1.35
        parts.torso.position.y = (basePos.torso.y - 0.03) + t * 0.05

        const startX = basePos.handR.x - 0.48
        const startY = basePos.handR.y - 0.26
        const startZ = basePos.handR.z - 0.18
        const endX = basePos.handR.x + 0.22
        const endY = basePos.handR.y + 0.12
        const endZ = basePos.handR.z + 0.36   // Maju ke DEPAN (+Z) menyongsong bola!
        parts.handR.position.set(
          startX + t * (endX - startX),
          startY + t * (endY - startY),
          startZ + t * (endZ - startZ)
        )
        parts.handR.rotation.set(-0.35 + t * 0.8, -1.6 + t * 3.1, -0.5 + t * 0.9)

        // Tangan kiri melepaskan raket dan membuka ke belakang untuk keseimbangan
        if (parts.handL) {
          parts.handL.position.set(
            basePos.handL.x - t * 0.20,
            basePos.handL.y + t * 0.12,
            basePos.handL.z - t * 0.15
          )
          parts.handL.rotation.set(t * 0.3, t * 0.6, 0)
        }
        parts.head.rotation.y = -0.20 + t * 0.35
      } else {
        // C. Open-Chest High Finish: Dada terbuka penuh, tangan kanan tinggi menjulang di kanan atas
        const t = (progress - 0.58) / 0.42
        parts.torso.rotation.y = 0.60 * (1 - t)
        parts.torso.position.y = basePos.torso.y + (1 - t) * 0.02

        const apexY = Math.sin(t * Math.PI) * 0.30
        const curX = THREE.MathUtils.lerp(basePos.handR.x + 0.22, basePos.handR.x, t)
        const curZ = THREE.MathUtils.lerp(basePos.handR.z + 0.36, basePos.handR.z, t)
        parts.handR.position.set(curX + (1 - t) * 0.15, basePos.handR.y + apexY, curZ)
        parts.handR.rotation.set(0.45 * (1 - t), 1.4 * (1 - t), 0.4 * (1 - t))

        if (parts.handL) parts.handL.position.lerp(basePos.handL, t)
        parts.head.rotation.y = 0.15 * (1 - t)
      }
      updateAllArms()
      return
    }

    // =============================================================
    // 3. OVERHEAD SERVE & SMASH (Tarik tinggi ke belakang kepala, hantam ke DEPAN bawah)
    // =============================================================
    if (isServe) {
      if (progress < 0.38) {
        // A. Trophy Pose: Tangan kanan naik tinggi ke belakang kepala (-Z), raket drop di belakang
        const t = progress / 0.38
        parts.torso.rotation.x = -t * 0.22
        parts.torso.position.y = basePos.torso.y + t * 0.05
        parts.handR.position.set(
          basePos.handR.x + t * 0.05,
          basePos.handR.y + t * 0.65,
          basePos.handR.z - t * 0.28  // Ditarik ke belakang kepala (-Z)!
        )
        parts.handR.rotation.set(-t * 1.8, t * 0.3, -t * 0.3)

        // Tangan kiri menunjuk bola ke atas
        if (parts.handL) {
          parts.handL.position.set(
            basePos.handL.x + t * 0.08,
            basePos.handL.y + t * 0.52,
            basePos.handL.z + t * 0.12
          )
        }
      } else if (progress < 0.62) {
        // B. Overhead Pronation Strike: Melesat menghantam bola di puncak jangkauan (+Z)
        const t = (progress - 0.38) / 0.24
        parts.torso.rotation.x = -0.22 + t * 0.44
        const startX = basePos.handR.x + 0.05
        const startY = basePos.handR.y + 0.65
        const startZ = basePos.handR.z - 0.28
        const endX = basePos.handR.x - 0.08
        const endY = basePos.handR.y + 0.15
        const endZ = basePos.handR.z + 0.42   // Menghantam ke DEPAN (+Z)!
        parts.handR.position.set(
          startX + t * (endX - startX),
          startY + t * (endY - startY),
          startZ + t * (endZ - startZ)
        )
        parts.handR.rotation.set(-1.8 + t * 2.8, 0.3 - t * 0.6, -0.3 + t * 0.5)

        if (parts.handL) parts.handL.position.lerp(basePos.handL, t)
      } else {
        // C. Follow-Through: Menyapu ke bawah melintasi pinggul kiri
        const t = (progress - 0.62) / 0.38
        parts.torso.rotation.x = 0.22 * (1 - t)
        parts.handR.position.lerp(basePos.handR, t)
        parts.handR.rotation.set(0.85 * (1 - t), -0.4 * (1 - t), 0.2 * (1 - t))
        if (parts.handL) parts.handL.position.lerp(basePos.handL, t)
      }
    }
    updateAllArms()
  }

  const setRunningAnimation = (time: number, isMoving: boolean) => {
    if (!isMoving) {
      // 1. Natural Athletic Ready Stance (Wii Sports Pro Stance):
      // Kaki menapak kokoh di tanah (zero movement), celana pas di atas kaki (position.x stabil)
      // Yang bergerak adalah torsi dada, bahu, dan kepala bergoyang ritmis kanan-kiri
      const swayPulse = Math.sin(time * 3.0)
      const kneeBounce = Math.abs(swayPulse) * 0.015
      const torsoTilt = swayPulse * 0.05 // Rotasi kemiringan dada kiri-kanan
      const torsoTwist = swayPulse * 0.035 // Putaran dada tipis menghadap bola

      if (parts.torso) {
        // Posisi X celana TETAP solid di tengah menancap di atas kedua kaki!
        parts.torso.position.set(basePos.torso.x, basePos.torso.y - kneeBounce, basePos.torso.z)
        // Condong atletis ke depan (rotation.x = 0.06) + goyangan dada kanan-kiri
        parts.torso.rotation.set(0.06, torsoTwist, torsoTilt)
      }
      if (parts.head) {
        // Kepala stabil di atas torso, tetap menatap lurus ke net & lawan
        parts.head.position.set(basePos.head.x, basePos.head.y - kneeBounce, basePos.head.z)
        parts.head.rotation.set(-0.04, -torsoTwist * 0.5, -torsoTilt * 0.4)
      }
      if (parts.handL) {
        // Tangan kiri rileks seirama dada
        parts.handL.position.set(basePos.handL.x, basePos.handL.y - kneeBounce * 0.8, basePos.handL.z)
        parts.handL.rotation.set(0.04, torsoTwist * 0.8, torsoTilt * 0.6)
      }
      if (parts.handR) {
        // Tangan kanan memegang raket di depan badan, siap menyambut bola
        parts.handR.position.set(basePos.handR.x, basePos.handR.y - kneeBounce * 0.8, basePos.handR.z)
        parts.handR.rotation.set(0.04, torsoTwist * 0.8, torsoTilt * 0.6)
      }
      // Kaki MENAPAK MANTAP DI TANAH: 100% diam, tidak ada pergeseran sama sekali
      if (parts.footL) {
        parts.footL.position.copy(basePos.footL)
        parts.footL.rotation.set(0, 0, 0)
      }
      if (parts.footR) {
        parts.footR.position.copy(basePos.footR)
        parts.footR.rotation.set(0, 0, 0)
      }
      updateAllArms()
      return
    }

    // 2. Gerak Lari Lateral Shuffle Tegas Khas Tenis (Kaki mengangkat nyata di rumput)
    const runCycle = Math.sin(time * 11.5)
    const torsoBob = Math.abs(runCycle) * 0.038
    const bodyTilt = runCycle * 0.04

    if (parts.torso) {
      parts.torso.position.set(basePos.torso.x, basePos.torso.y + torsoBob, basePos.torso.z)
      parts.torso.rotation.set(0.08, 0, bodyTilt)
    }

    if (parts.head) {
      parts.head.position.set(basePos.head.x, basePos.head.y + torsoBob, basePos.head.z)
      parts.head.rotation.set(-0.04, 0, bodyTilt * 0.5)
    }

    // Kaki kiri dan kanan melangkah nyata bergantian (mengangkat & menjejak rumput)
    if (parts.footL) {
      const liftL = Math.max(0, runCycle) * 0.11 // Angkat kaki kiri setinggi 11cm
      parts.footL.position.y = basePos.footL.y + liftL
      parts.footL.position.z = basePos.footL.z - runCycle * 0.09
      parts.footL.position.x = basePos.footL.x + Math.sin(time * 11.5) * 0.03
      parts.footL.rotation.x = runCycle * 0.35
    }
    if (parts.footR) {
      const liftR = Math.max(0, -runCycle) * 0.11 // Angkat kaki kanan bergantian
      parts.footR.position.y = basePos.footR.y + liftR
      parts.footR.position.z = basePos.footR.z + runCycle * 0.09
      parts.footR.position.x = basePos.footR.x - Math.sin(time * 11.5) * 0.03
      parts.footR.rotation.x = -runCycle * 0.35
    }

    if (parts.handL) parts.handL.position.y = basePos.handL.y + Math.cos(time * 11.5) * 0.08
    if (parts.handR) parts.handR.position.y = basePos.handR.y - Math.cos(time * 11.5) * 0.07

    updateAllArms()
  }

  // 3. Victory Celebration Jump (Lompatan Gembira & Fist Pump Khas Nintendo Wii Sports)
  const setVictoryAnimation = (time: number) => {
    const jumpSpeed = 5.2
    const cycle = (time * jumpSpeed) % (Math.PI * 2)
    const isAirborne = cycle < Math.PI

    if (isAirborne) {
      // Fase Melayang di Udara (Apex & Leg Kick Back)
      const tAir = Math.sin(cycle) // 0 -> 1 -> 0
      const jumpY = tAir * 0.44

      if (parts.torso) {
        parts.torso.position.set(basePos.torso.x, basePos.torso.y + jumpY, basePos.torso.z)
        // Dada sedikit membusung bangga
        parts.torso.rotation.set(-0.12, Math.sin(time * 5) * 0.1, Math.cos(time * 5) * 0.08)
      }
      if (parts.head) {
        parts.head.position.set(basePos.head.x, basePos.head.y + jumpY, basePos.head.z)
        // Kepala mendongak bahagia ke atas
        parts.head.rotation.set(-0.18, Math.sin(time * 5) * 0.12, -Math.cos(time * 5) * 0.08)
      }

      // Kaki melipat ke belakang dengan ceria (happy hop)
      if (parts.footL) {
        parts.footL.position.set(
          basePos.footL.x,
          basePos.footL.y + jumpY + tAir * 0.14,
          basePos.footL.z - tAir * 0.12
        )
        parts.footL.rotation.set(-tAir * 0.6, 0, 0.1)
      }
      if (parts.footR) {
        parts.footR.position.set(
          basePos.footR.x,
          basePos.footR.y + jumpY + tAir * 0.16,
          basePos.footR.z - tAir * 0.10
        )
        parts.footR.rotation.set(-tAir * 0.65, 0, -0.1)
      }

      // Tangan kanan: Fist pump raket tegak tinggi ke langit merayakan kemenangan!
      if (parts.handR) {
        parts.handR.position.set(
          basePos.handR.x + 0.06,
          basePos.handR.y + jumpY + 0.32 + tAir * 0.22,
          basePos.handR.z - 0.04
        )
        parts.handR.rotation.set(-0.35, 0.2, 0.45 + Math.sin(time * 12) * 0.12)
      }

      // Tangan kiri: Terangkat mengepal bangga di dada
      if (parts.handL) {
        parts.handL.position.set(
          basePos.handL.x - 0.08,
          basePos.handL.y + jumpY + 0.18 + tAir * 0.16,
          basePos.handL.z + 0.06
        )
        parts.handL.rotation.set(0.3, -0.4, -0.4)
      }
    } else {
      // Fase Mendarat (Squash & Cushioning di Tanah)
      const tGround = Math.sin(cycle) // 0 -> -1 -> 0
      const squash = Math.abs(tGround) * 0.06 // Redaman lutut 6cm

      if (parts.torso) {
        parts.torso.position.set(basePos.torso.x, basePos.torso.y - squash, basePos.torso.z)
        parts.torso.rotation.set(0.04, 0, 0)
      }
      if (parts.head) {
        parts.head.position.set(basePos.head.x, basePos.head.y - squash, basePos.head.z)
        parts.head.rotation.set(-0.02, 0, 0)
      }

      // Kaki menjejak mantap di tanah
      if (parts.footL) {
        parts.footL.position.copy(basePos.footL)
        parts.footL.rotation.set(0, 0, 0)
      }
      if (parts.footR) {
        parts.footR.position.copy(basePos.footR)
        parts.footR.rotation.set(0, 0, 0)
      }

      // Tangan turun sesaat bersiap memompa lagi
      if (parts.handR) {
        parts.handR.position.set(
          basePos.handR.x,
          basePos.handR.y + 0.18 - squash,
          basePos.handR.z
        )
        parts.handR.rotation.set(-0.15, 0.1, 0.2)
      }
      if (parts.handL) {
        parts.handL.position.set(
          basePos.handL.x,
          basePos.handL.y + 0.10 - squash,
          basePos.handL.z
        )
        parts.handL.rotation.set(0.1, -0.2, -0.2)
      }
    }

    updateAllArms()
  }

  const resetPose = () => {
    if (parts.head) {
      parts.head.position.copy(basePos.head)
      parts.head.rotation.set(0, 0, 0)
    }
    if (parts.torso) {
      parts.torso.position.copy(basePos.torso)
      parts.torso.rotation.set(0, 0, 0)
    }
    if (parts.handL) {
      parts.handL.position.copy(basePos.handL)
      parts.handL.rotation.set(0, 0, 0)
    }
    if (parts.handR) {
      parts.handR.position.copy(basePos.handR)
      parts.handR.rotation.set(0, 0, 0)
    }
    if (parts.footL) {
      parts.footL.position.copy(basePos.footL)
      parts.footL.rotation.set(0, 0, 0)
    }
    if (parts.footR) {
      parts.footR.position.copy(basePos.footR)
      parts.footR.rotation.set(0, 0, 0)
    }
    updateAllArms()
  }

  return {
    group: rootGroup,
    rawModel: miiScene,
    parts,
    head: (parts.head || miiScene) as any,
    body: (parts.torso || miiScene) as any,
    rightHand: (parts.handR || miiScene) as any,
    leftHand: (parts.handL || miiScene) as any,
    racket: racketScene,
    setSwingAnimation,
    setRunningAnimation,
    setVictoryAnimation,
    resetPose,
  }
}

/**
 * Memuat Lapangan Stadion Lengkap, Net, dan Penonton dari GLB Asli
 */
export async function loadStadiumGLB(): Promise<{
  stadium: THREE.Group
  net: THREE.Group
  crowd: THREE.Group
}> {
  const [stadiumGltf, netGltf, crowdGltf] = await Promise.all([
    new Promise<any>((resolve, reject) => {
      loader.load("/models/tennis/stadium_court.glb", resolve, undefined, reject)
    }),
    new Promise<any>((resolve, reject) => {
      loader.load("/models/tennis/tennis_net.glb", resolve, undefined, reject)
    }),
    new Promise<any>((resolve, reject) => {
      loader.load("/models/tennis/mii_crowd.glb", resolve, undefined, reject)
    }),
  ])

  const stadium = stadiumGltf.scene as THREE.Group
  const net = netGltf.scene as THREE.Group
  const crowd = crowdGltf.scene as THREE.Group

  // Shadow tuning & Hapus seluruh logo/teks "Argon Tennis" bawaan GLB
  stadium.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const mesh = c as THREE.Mesh
      mesh.receiveShadow = true
      if (/Wall|Bleacher|Canopy|Pillar|Tree/i.test(mesh.name)) {
        mesh.castShadow = true
      }

      // Sembunyikan material dan mesh "LogoArgonBanner" / teks Argon
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          if (mat && /argon/i.test(mat.name || "")) {
            mat.visible = false
            mat.opacity = 0
            mat.transparent = true
          }
        })
      } else if (mesh.material) {
        if (/argon/i.test(mesh.material.name || "")) {
          mesh.visible = false
          mesh.material.visible = false
          mesh.material.opacity = 0
          mesh.material.transparent = true
        }
      }

      if (/argon/i.test(mesh.name || "")) {
        mesh.visible = false
      }
    }
  })

  net.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })

  // Plakat Resmi IT-THINGS 98 di Dinding Belakang Lapangan (Menutupi teks lama)
  const logoTexture = createStadiumLogoTexture()
  const logoGeo = new THREE.PlaneGeometry(5.8, 1.45)
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    depthWrite: false,
  })
  const logoMesh = new THREE.Mesh(logoGeo, logoMat)
  logoMesh.position.set(0, 2.48, -13.78)
  stadium.add(logoMesh)

  return { stadium, net, crowd }
}
