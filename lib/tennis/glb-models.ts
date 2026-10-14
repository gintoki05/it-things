import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MiiAvatarObject } from "./types"

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
 * Meratakan dan menghaluskan bagian celana depan (crotch/pelvis)
 * agar tidak menonjol atau menggembung ke depan secara aneh
 */
function smoothPantsBulge(torsoObj: THREE.Object3D) {
  torsoObj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      const geo = mesh.geometry as THREE.BufferGeometry
      if (!geo || !geo.attributes || !geo.attributes.position) return

      const pos = geo.attributes.position
      let modified = false

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        const z = pos.getZ(i)

        // Area tonjolan celana depan (dalam koordinat lokal Torso):
        // y antara -0.38 dan 0.04, x antara -0.14 dan 0.14, z > 0.018
        if (z > 0.018 && Math.abs(x) < 0.15 && y > -0.38 && y < 0.04) {
          // Tarik mundur tonjolan secara proporsional dan halus
          const excess = z - 0.018
          const newZ = 0.018 + excess * 0.35 // Kurangi tonjolan hingga 65% lebih rata
          pos.setZ(i, newZ)
          modified = true
        }
      }

      if (modified) {
        pos.needsUpdate = true
        geo.computeVertexNormals()
      }
    }
  })
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

  // Perbaiki dan ratakan tonjolan celana pada mesh Torso
  if (parts.torso) {
    smoothPantsBulge(parts.torso)
  }

  // Simpan posisi dasar masing-masing part
  const basePos = {
    head: parts.head ? parts.head.position.clone() : new THREE.Vector3(0, 1.22, 0),
    torso: parts.torso ? parts.torso.position.clone() : new THREE.Vector3(0, 0.55, 0),
    handL: parts.handL ? parts.handL.position.clone() : new THREE.Vector3(-0.33, 0.8, 0.1),
    handR: parts.handR ? parts.handR.position.clone() : new THREE.Vector3(0.33, 0.82, 0.14),
    footL: parts.footL ? parts.footL.position.clone() : new THREE.Vector3(-0.105, 0.13, 0.01),
    footR: parts.footR ? parts.footR.position.clone() : new THREE.Vector3(0.105, 0.13, 0.01),
  }

  // Pasang Raket Tenis ke Tangan Kanan (handR)
  racketScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
  racketScene.scale.setScalar(1.22)
  racketScene.position.set(0.08, 0.16, -0.06)
  racketScene.rotation.set(0.18, 0, -0.08)

  if (parts.handR) {
    parts.handR.add(racketScene)
  }

  // Skala Mii agar proporsional di arena
  miiScene.scale.setScalar(1.16)
  rootGroup.add(miiScene)

  // Bayangan Lembut di Lantai (Contact Shadow)
  const shadowGeo = new THREE.PlaneGeometry(0.85, 0.85)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  })
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
  shadowMesh.rotation.x = -Math.PI / 2
  shadowMesh.position.y = 0.015
  rootGroup.add(shadowMesh)

  // Sistem Animasi Mii Terkalibrasi (Stabil & Tanpa Kepala Geal-Geol)
  const setSwingAnimation = (progress: number, isForehand: boolean) => {
    const sideSign = isForehand ? 1 : -1
    if (progress <= 0 || progress >= 1) {
      resetPose()
      return
    }

    if (!parts.handR || !parts.torso || !parts.head) return

    if (progress < 0.3) {
      // Backswing: Tarik tangan dan raket ke belakang
      const t = progress / 0.3
      parts.handR.rotation.y = sideSign * t * (Math.PI * 0.65)
      parts.handR.rotation.x = -t * (Math.PI * 0.3)
      parts.torso.rotation.y = sideSign * t * 0.3
      // Kepala fokus melihat bola (rotasi kepala halus dan terkendali)
      parts.head.rotation.y = sideSign * t * 0.12
    } else if (progress < 0.65) {
      // Forward Strike: Ayun kuat melintasi tubuh memukul bola
      const t = (progress - 0.3) / 0.35
      parts.handR.rotation.y = sideSign * (Math.PI * 0.65 - t * Math.PI * 1.35)
      parts.handR.rotation.x = -Math.PI * 0.3 + t * Math.PI * 0.55
      parts.torso.rotation.y = sideSign * (0.3 - t * 0.65)
      parts.head.rotation.y = sideSign * (0.12 - t * 0.25)
    } else {
      // Follow-Through: Gerakan akhir ayunan
      const t = (progress - 0.65) / 0.35
      parts.handR.rotation.y = sideSign * (-Math.PI * 0.7 + t * Math.PI * 0.7)
      parts.handR.rotation.x = Math.PI * 0.25 - t * Math.PI * 0.25
      parts.torso.rotation.y = sideSign * (-0.35 + t * 0.35)
      parts.head.rotation.y = sideSign * (-0.13 + t * 0.13)
    }
  }

  const setRunningAnimation = (time: number, isMoving: boolean) => {
    if (!isMoving) {
      // Idle Breathing Ready Stance: Goyangan lembut terkoordinasi (Kepala & Torso solid)
      const idleBob = Math.sin(time * 3.2) * 0.018
      if (parts.torso) {
        parts.torso.position.y = basePos.torso.y + idleBob
        parts.torso.rotation.z = 0
        parts.torso.rotation.y = 0
      }
      if (parts.head) {
        // Kepala mengikuti torso secara persis (tidak geal-geol terlepas)
        parts.head.position.y = basePos.head.y + idleBob
        parts.head.rotation.set(0, 0, 0)
      }
      if (parts.handL) parts.handL.position.y = basePos.handL.y + idleBob * 0.8
      if (parts.handR) parts.handR.position.y = basePos.handR.y + idleBob * 0.8
      if (parts.footL) {
        parts.footL.position.copy(basePos.footL)
        parts.footL.rotation.set(0, 0, 0)
      }
      if (parts.footR) {
        parts.footR.position.copy(basePos.footR)
        parts.footR.rotation.set(0, 0, 0)
      }
      return
    }

    // Gerak Lari Hop-Shuffle Terkalibrasi (Tempo wajar & stabil)
    const runCycle = Math.sin(time * 9.5)
    const torsoBob = Math.abs(runCycle) * 0.04
    const bodyTilt = runCycle * 0.035

    if (parts.torso) {
      parts.torso.position.y = basePos.torso.y + torsoBob
      parts.torso.rotation.z = bodyTilt
    }

    // Kepala mengikuti torsonya secara proporsional dan tidak goyang berlebihan
    if (parts.head) {
      parts.head.position.y = basePos.head.y + torsoBob
      parts.head.rotation.z = bodyTilt * 0.7
    }

    // Kaki melangkah bergantian secara proporsional
    if (parts.footL) {
      parts.footL.position.y = basePos.footL.y + Math.max(0, runCycle * 0.09)
      parts.footL.position.z = basePos.footL.z - runCycle * 0.1
      parts.footL.rotation.x = runCycle * 0.3
    }
    if (parts.footR) {
      parts.footR.position.y = basePos.footR.y + Math.max(0, -runCycle * 0.09)
      parts.footR.position.z = basePos.footR.z + runCycle * 0.1
      parts.footR.rotation.x = -runCycle * 0.3
    }

    if (parts.handL) parts.handL.position.y = basePos.handL.y + Math.cos(time * 9.5) * 0.08
    if (parts.handR) parts.handR.position.y = basePos.handR.y - Math.cos(time * 9.5) * 0.06
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

  // Shadow tuning
  stadium.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.receiveShadow = true
      if (/Wall|Bleacher|Canopy|Pillar|Tree/i.test(c.name)) {
        c.castShadow = true
      }
    }
  })

  net.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true
      c.receiveShadow = true
    }
  })

  crowd.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      c.receiveShadow = true
    }
  })

  return { stadium, net, crowd }
}
