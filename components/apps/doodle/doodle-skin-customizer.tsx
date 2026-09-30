"use client"

import * as React from "react"
import * as THREE from "three"
import { X, Sparkles, Check, RotateCw, Wand2, Shield, Crosshair } from "lucide-react"
import { RetroActionButton } from "@/components/ui/retro-action-button"
import { playRetroNotificationSound } from "@/lib/sound-effects"
import { cn } from "@/lib/utils"

export type DoodleHatType =
  | "cap"
  | "beret"
  | "band"
  | "helmet"
  | "hood"
  | "crown"
  | "cowboy"
  | "horns"
  | "none"

export type DoodleWeaponSkinType =
  | "classic"
  | "gold"
  | "dragon"
  | "cyber"
  | "shadow"

export type DoodleFaceType =
  | "classic"
  | "psycho"
  | "shades"
  | "angry"
  | "derp"

export interface DoodleCustomSkin {
  hat: DoodleHatType
  weaponSkin: DoodleWeaponSkinType
  face: DoodleFaceType
  ink: number
}

export const DEFAULT_DOODLE_SKIN: DoodleCustomSkin = {
  hat: "cap",
  weaponSkin: "classic",
  face: "classic",
  ink: 0,
}

export const INK_OPTIONS = [
  { id: 0, name: "Pulpen Biru", hex: "#1a31c2", desc: "Tinta standar dinas" },
  { id: 1, name: "Pulpen Merah", hex: "#dc1f33", desc: "Tinta koreksi agresif" },
  { id: 2, name: "Spidol Hitam", hex: "#2e3342", desc: "Tinta pekat permanen" },
  { id: 3, name: "Stabilo Oranye", hex: "#eb8c14", desc: "Tinta terang mencolok" },
  { id: 4, name: "Stabilo Hijau", hex: "#1f994d", desc: "Tinta stabilo neon" },
  { id: 5, name: "Stabilo Pink", hex: "#e666a8", desc: "Tinta cerah playful" },
]

export const HAT_OPTIONS: { id: DoodleHatType; name: string; icon: string; desc: string }[] = [
  { id: "cap", name: "Topi Baseball", icon: "🧢", desc: "Topi casual doodle street" },
  { id: "beret", name: "Baret Komando (PB)", icon: "🎖️", desc: "Baret taktis prajurit elit Point Blank" },
  { id: "band", name: "Bandana Ninja", icon: "🥷", desc: "Ikat kepala ninja dengan pita berkibar" },
  { id: "helmet", name: "Helm SWAT Taktis", icon: "🪖", desc: "Pelindung kepala anti-peluru kevlar" },
  { id: "hood", name: "Hoodie Assassin", icon: "🧥", desc: "Tudung misterius penyelinap bayangan" },
  { id: "crown", name: "Mahkota Juara", icon: "👑", desc: "Mahkota emas penguasa wave tertinggi" },
  { id: "cowboy", name: "Topi Koboi Sheriff", icon: "🤠", desc: "Topi kulit lebar penegak hukum barat" },
  { id: "horns", name: "Tanduk Demon", icon: "😈", desc: "Tanduk iblis doodle berdarah dingin" },
  { id: "none", name: "Polos (Gundul)", icon: "⚪", desc: "Stickman doodle orisinal tanpa aksesori" },
]

export const WEAPON_SKIN_OPTIONS: { id: DoodleWeaponSkinType; name: string; hex: string; desc: string }[] = [
  { id: "classic", name: "Standard Ink", hex: "#1a31c2", desc: "Sesuai warna pulpen pilihanmu" },
  { id: "gold", name: "Gold Royale PB", hex: "#eab308", desc: "Lapis emas murni 24k mengkilap mewah" },
  { id: "dragon", name: "Crimson Dragon", hex: "#e11d48", desc: "Goresan naga api merah membara" },
  { id: "cyber", name: "Cyberpunk Neon", hex: "#06b6d4", desc: "Garis laser cyan & aksen sintetis modern" },
  { id: "shadow", name: "Shadow Tactical", hex: "#18181b", desc: "Hitam matte anti-refleksi peredam silau" },
]

export const FACE_OPTIONS: { id: DoodleFaceType; name: string; icon: string; desc: string }[] = [
  { id: "classic", name: "Fokus / Serius", icon: "😐", desc: "Tatapan siap tempur bertahan dari wave" },
  { id: "psycho", name: "Senyum Sadis (PB)", icon: "😈", desc: "Seringai killer saat mencetak headshot berantai" },
  { id: "shades", name: "Kacamata Thug Life", icon: "🕶️", desc: "Kacamata hitam anti silau: Deal with it" },
  { id: "angry", name: "Alis Marah", icon: "😠", desc: "Alis menukik tajam penuh dendam peluru" },
  { id: "derp", name: "Mata Silang (X_X)", icon: "😵", desc: "Ekspresi kocak pusing kena tembak" },
]

export const SKIN_PRESETS: { name: string; icon: string; skin: DoodleCustomSkin }[] = [
  {
    name: "Trooper Point Blank",
    icon: "🎖️",
    skin: { hat: "beret", weaponSkin: "dragon", face: "psycho", ink: 1 },
  },
  {
    name: "Golden Emperor",
    icon: "👑",
    skin: { hat: "crown", weaponSkin: "gold", face: "shades", ink: 3 },
  },
  {
    name: "Shadow Shinobi",
    icon: "🥷",
    skin: { hat: "band", weaponSkin: "shadow", face: "classic", ink: 2 },
  },
  {
    name: "Cyber Rebel",
    icon: "⚡",
    skin: { hat: "hood", weaponSkin: "cyber", face: "shades", ink: 4 },
  },
  {
    name: "Sheriff Doodle",
    icon: "🤠",
    skin: { hat: "cowboy", weaponSkin: "classic", face: "angry", ink: 0 },
  },
]

interface DoodleSkinCustomizerProps {
  currentSkin?: DoodleCustomSkin
  onApply: (skin: DoodleCustomSkin) => void
  onClose: () => void
}

export function DoodleSkinCustomizer({
  currentSkin,
  onApply,
  onClose,
}: DoodleSkinCustomizerProps) {
  // Read saved skin from localStorage
  const [skin, setSkin] = React.useState<DoodleCustomSkin>(() => {
    if (currentSkin) return currentSkin
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("doodle_custom_skin")
        if (saved) {
          const parsed = JSON.parse(saved)
          return {
            hat: parsed.hat || "cap",
            weaponSkin: parsed.weaponSkin || "classic",
            face: parsed.face || "classic",
            ink: Number(parsed.ink) >= 0 ? Number(parsed.ink) : 0,
          }
        }
      } catch {}
      const savedInk = localStorage.getItem("doodle_ink")
      if (savedInk != null && !isNaN(Number(savedInk))) {
        return { ...DEFAULT_DOODLE_SKIN, ink: Number(savedInk) }
      }
    }
    return DEFAULT_DOODLE_SKIN
  })

  const [activeTab, setActiveTab] = React.useState<"hat" | "weapon" | "face" | "ink" | "preset">("hat")
  const [isAutoRotate, setIsAutoRotate] = React.useState<boolean>(true)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  // 3D Preview Engine with Three.js
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrameId: number
    const width = canvas.clientWidth || 240
    const height = canvas.clientHeight || 280

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#f7f4ea") // Doodle paper color

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 1.25, 3.6)
    camera.lookAt(0, 0.95, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(amb)
    const dir = new THREE.DirectionalLight(0xfff5e6, 0.6)
    dir.position.set(2, 4, 3)
    scene.add(dir)

    // Character Group
    const charRoot = new THREE.Group()
    scene.add(charRoot)

    // Ink color resolver
    const activeHex = INK_OPTIONS[skin.ink]?.hex || "#1a31c2"
    const inkColor = new THREE.Color(activeHex)
    const blackColor = new THREE.Color("#18181b")

    // Materials
    const bodyMat = new THREE.MeshBasicMaterial({ color: inkColor, wireframe: false })
    const outlineMat = new THREE.MeshBasicMaterial({ color: blackColor })

    // Torso & Hips
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.55, 12), bodyMat)
    torso.position.y = 0.9
    charRoot.add(torso)

    // Belt / Hips
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), outlineMat)
    belt.position.y = 0.62
    charRoot.add(belt)

    // Legs
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.58, 8), bodyMat)
      leg.position.set(side * 0.09, 0.32, 0)
      charRoot.add(leg)

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), outlineMat)
      shoe.position.set(side * 0.09, 0.03, 0.03)
      charRoot.add(shoe)
    }

    // Arms
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.48, 8), bodyMat)
    armL.position.set(-0.25, 0.9, 0.05)
    armL.rotation.z = 0.25
    charRoot.add(armL)

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.45, 8), bodyMat)
    armR.position.set(0.24, 0.95, 0.2)
    armR.rotation.x = -0.7
    armR.rotation.z = -0.3
    charRoot.add(armR)

    // Head
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 1.34, 0)
    charRoot.add(headGroup)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), bodyMat)
    headGroup.add(head)

    // Face Expression
    const faceG = new THREE.Group()
    faceG.position.set(0, 0.02, 0.22)
    headGroup.add(faceG)

    if (skin.face === "shades") {
      // Thug life pixel shades
      const glassL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.04), outlineMat)
      glassL.position.x = -0.065
      faceG.add(glassL)
      const glassR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.04), outlineMat)
      glassR.position.x = 0.065
      faceG.add(glassR)
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), outlineMat)
      bridge.position.y = 0.015
      faceG.add(bridge)
    } else if (skin.face === "derp") {
      // X eyes
      for (const side of [-1, 1]) {
        for (const rot of [0.75, -0.75]) {
          const cross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.02), outlineMat)
          cross.position.set(side * 0.07, 0.02, 0)
          cross.rotation.z = rot
          faceG.add(cross)
        }
      }
    } else {
      // Standard eyes
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), outlineMat)
        eye.position.set(side * 0.07, 0.02, 0)
        eye.scale.set(0.8, 1.2, 0.6)
        faceG.add(eye)
      }

      // Eyebrows
      if (skin.face === "angry") {
        for (const side of [-1, 1]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), outlineMat)
          brow.position.set(side * 0.07, 0.08, 0)
          brow.rotation.z = side * -0.4
          faceG.add(brow)
        }
      }

      // Mouth
      if (skin.face === "psycho") {
        // Psycho grin
        const grin = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12, Math.PI * 0.9), outlineMat)
        grin.position.set(0, -0.07, 0)
        grin.rotation.z = Math.PI
        faceG.add(grin)
      } else {
        // Neutral slight smile
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 10, Math.PI * 0.8), outlineMat)
        mouth.position.set(0, -0.07, 0)
        faceG.add(mouth)
      }
    }

    // Hat / Headgear
    const hatG = new THREE.Group()
    headGroup.add(hatG)

    if (skin.hat === "cap") {
      const capDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.245, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        bodyMat
      )
      capDome.position.y = 0.04
      capDome.scale.set(1.04, 0.7, 1.04)
      hatG.add(capDome)

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.22), bodyMat)
      visor.position.set(0, 0.03, 0.2)
      visor.rotation.x = -0.18
      hatG.add(visor)
    } else if (skin.hat === "beret") {
      // Point Blank Red / Ink Beret
      const beretMat = new THREE.MeshBasicMaterial({
        color: skin.ink === 1 ? new THREE.Color("#b91c1c") : inkColor,
      })
      const beret = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52),
        beretMat
      )
      beret.position.set(0.04, 0.08, 0)
      beret.rotation.z = -0.25
      beret.scale.set(1.2, 0.65, 1.15)
      hatG.add(beret)

      // Gold Tactical Emblem / Badge
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.07, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      )
      badge.position.set(-0.13, 0.11, 0.16)
      badge.rotation.z = 0.2
      hatG.add(badge)
    } else if (skin.hat === "band") {
      // Ninja headband
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.235, 0.026, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0xd97706 })
      )
      band.rotation.x = Math.PI / 2
      band.position.y = 0.06
      hatG.add(band)

      // Tails behind
      for (const offset of [-0.05, 0.05]) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.35), new THREE.MeshBasicMaterial({ color: 0xd97706 }))
        tail.position.set(offset, 0.04, -0.28)
        tail.rotation.x = 0.35
        hatG.add(tail)
      }
    } else if (skin.hat === "helmet") {
      // SWAT tactical helmet
      const helmMat = new THREE.MeshBasicMaterial({ color: 0x334155 })
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.265, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), helmMat)
      helm.position.y = 0.02
      helm.scale.set(1.08, 0.88, 1.08)
      hatG.add(helm)

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.028, 6, 16), helmMat)
      rim.rotation.x = Math.PI / 2
      rim.position.y = -0.02
      hatG.add(rim)
    } else if (skin.hat === "hood") {
      // Assassin hood
      const hoodMat = new THREE.MeshBasicMaterial({ color: 0x1e293b })
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.275, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), hoodMat)
      hood.position.set(0, 0.01, -0.02)
      hood.scale.set(1.05, 1.15, 1.02)
      hatG.add(hood)
    } else if (skin.hat === "crown") {
      // Gold Champion Crown
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.025, 6, 16), crownMat)
      crownBase.rotation.x = Math.PI / 2
      crownBase.position.y = 0.22
      hatG.add(crownBase)

      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), crownMat)
        const angle = (i / 5) * Math.PI * 2
        spike.position.set(Math.cos(angle) * 0.2, 0.3, Math.sin(angle) * 0.2)
        hatG.add(spike)
      }
    } else if (skin.hat === "cowboy") {
      // Cowboy hat
      const leatherMat = new THREE.MeshBasicMaterial({ color: 0x78350f })
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.025, 16), leatherMat)
      brim.position.y = 0.08
      brim.rotation.x = 0.08
      brim.scale.set(1.08, 1, 1.25)
      hatG.add(brim)

      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.2, 12), leatherMat)
      crown.position.y = 0.18
      hatG.add(crown)
    } else if (skin.hat === "horns") {
      // Demon horns
      const hornMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c })
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), hornMat)
        horn.position.set(side * 0.14, 0.24, 0.04)
        horn.rotation.z = side * -0.42
        horn.rotation.x = -0.2
        hatG.add(horn)
      }
    }

    // Weapon in hand
    const weaponG = new THREE.Group()
    weaponG.position.set(0.28, 0.88, 0.35)
    charRoot.add(weaponG)

    // Weapon Skin Material
    let wColor = inkColor
    let wHighlight = outlineMat

    if (skin.weaponSkin === "gold") {
      wColor = new THREE.Color("#f59e0b") // Golden
      wHighlight = new THREE.MeshBasicMaterial({ color: 0x78350f })
    } else if (skin.weaponSkin === "dragon") {
      wColor = new THREE.Color("#e11d48") // Crimson dragon
      wHighlight = new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    } else if (skin.weaponSkin === "cyber") {
      wColor = new THREE.Color("#06b6d4") // Neon Cyan
      wHighlight = new THREE.MeshBasicMaterial({ color: 0xd946ef })
    } else if (skin.weaponSkin === "shadow") {
      wColor = new THREE.Color("#18181b") // Matte Black
      wHighlight = new THREE.MeshBasicMaterial({ color: 0x52525b })
    }

    const wMat = new THREE.MeshBasicMaterial({ color: wColor })

    // Assault Rifle Model
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.52), wMat)
    weaponG.add(barrel)

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), wHighlight)
    tip.rotation.x = Math.PI / 2
    tip.position.set(0, 0.02, 0.32)
    weaponG.add(tip)

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.09), wHighlight)
    mag.position.set(0, -0.12, 0.02)
    mag.rotation.x = 0.25
    weaponG.add(mag)

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.16), wHighlight)
    stock.position.set(0, -0.02, -0.3)
    weaponG.add(stock)

    // Mouse / Touch Drag to Rotate
    let isDragging = false
    let prevMouseX = 0
    let rotSpeed = 0

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true
      rotSpeed = 0
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      prevMouseX = clientX
    }

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const delta = clientX - prevMouseX
      prevMouseX = clientX
      charRoot.rotation.y += delta * 0.015
      rotSpeed = delta * 0.005
    }

    const handlePointerUp = () => {
      isDragging = false
    }

    canvas.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("mousemove", handlePointerMove)
    window.addEventListener("mouseup", handlePointerUp)

    canvas.addEventListener("touchstart", handlePointerDown, { passive: true })
    window.addEventListener("touchmove", handlePointerMove, { passive: true })
    window.addEventListener("touchend", handlePointerUp)

    // Animation Loop
    let clock = 0
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      clock += 0.025

      // Subtle breathing / bobbing
      charRoot.position.y = Math.sin(clock * 2) * 0.02

      if (isAutoRotate && !isDragging) {
        charRoot.rotation.y += 0.012
      } else if (!isDragging && Math.abs(rotSpeed) > 0.001) {
        charRoot.rotation.y += rotSpeed
        rotSpeed *= 0.94
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      canvas.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("mousemove", handlePointerMove)
      window.removeEventListener("mouseup", handlePointerUp)
      canvas.removeEventListener("touchstart", handlePointerDown)
      window.removeEventListener("touchmove", handlePointerMove)
      window.removeEventListener("touchend", handlePointerUp)
      renderer.dispose()
    }
  }, [skin, isAutoRotate])

  const handleSaveAndApply = () => {
    try {
      localStorage.setItem("doodle_custom_skin", JSON.stringify(skin))
      localStorage.setItem("doodle_ink", String(skin.ink))
    } catch {}

    playRetroNotificationSound(0.15)
    onApply(skin)
    onClose()
  }

  const applyPreset = (preset: typeof SKIN_PRESETS[0]) => {
    setSkin(preset.skin)
    playRetroNotificationSound(0.08)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="skin-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-[#C0C0C0] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl flex flex-col max-h-[92vh] text-black font-sans">
        {/* Title Bar */}
        <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-mono font-bold text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span id="skin-dialog-title">LEMARI_KOSTUM.EXE - Custom Skin & Senjata</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-5 h-5 bg-[#C0C0C0] border border-t-white border-l-white border-r-black border-b-black flex items-center justify-center text-black font-bold active:border-t-black active:border-l-black active:border-r-white active:border-b-white cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 overflow-y-auto flex-1 flex flex-col md:flex-row gap-3">
          {/* Left Column: 3D Live Turntable Preview */}
          <div className="flex flex-col items-center justify-between bg-[#fbf9f1] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-2 rounded-xs w-full md:w-64 shrink-0 shadow-inner">
            <div className="w-full text-center pb-1 border-b border-[#d8d2be] text-[11px] font-mono text-stone-600 flex items-center justify-between">
              <span className="font-bold">PREVIEW 3D</span>
              <button
                type="button"
                onClick={() => setIsAutoRotate((v) => !v)}
                className={`text-[9px] px-1.5 py-0.5 border rounded cursor-pointer ${
                  isAutoRotate ? "bg-amber-200 border-amber-500 font-bold" : "bg-stone-200 border-stone-400"
                }`}
                title="Toggle Putar Otomatis"
              >
                {isAutoRotate ? "AUTO PUTAR ON" : "AUTO PUTAR OFF"}
              </button>
            </div>

            {/* 3D Canvas */}
            <div className="relative w-full h-56 flex items-center justify-center cursor-grab active:cursor-grabbing">
              <canvas ref={canvasRef} className="w-full h-full block rounded" />
              <div className="absolute bottom-1 right-1 text-[9px] font-mono text-stone-500 bg-white/70 px-1 rounded pointer-events-none">
                Geser untuk putar
              </div>
            </div>

            {/* Active Specs Mini Card */}
            <div className="w-full bg-[#f1ebd9] border border-[#d8d0b8] p-2 text-[10px] font-mono mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Topi:</span>
                <span className="font-bold truncate max-w-[120px]">
                  {HAT_OPTIONS.find((h) => h.id === skin.hat)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Senjata:</span>
                <span className="font-bold text-amber-900 truncate max-w-[120px]">
                  {WEAPON_SKIN_OPTIONS.find((w) => w.id === skin.weaponSkin)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ekspresi:</span>
                <span className="font-bold truncate max-w-[120px]">
                  {FACE_OPTIONS.find((f) => f.id === skin.face)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Tinta:</span>
                <span className="flex items-center gap-1 font-bold">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block border border-black/40"
                    style={{ backgroundColor: INK_OPTIONS[skin.ink]?.hex }}
                  />
                  {INK_OPTIONS[skin.ink]?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Tabs & Grids */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Category Navigation Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-[#808080] pb-1.5 mb-2 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab("hat")}
                className={`px-2 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all ${
                  activeTab === "hat" ? "bg-white border-b-white font-extrabold translate-y-px" : "bg-[#C0C0C0]"
                }`}
              >
                🎩 Topi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("weapon")}
                className={`px-2 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all ${
                  activeTab === "weapon" ? "bg-white border-b-white font-extrabold translate-y-px text-red-700" : "bg-[#C0C0C0]"
                }`}
              >
                🔫 Senjata
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("face")}
                className={`px-2 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all ${
                  activeTab === "face" ? "bg-white border-b-white font-extrabold translate-y-px" : "bg-[#C0C0C0]"
                }`}
              >
                😈 Wajah
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ink")}
                className={`px-2 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all ${
                  activeTab === "ink" ? "bg-white border-b-white font-extrabold translate-y-px text-blue-700" : "bg-[#C0C0C0]"
                }`}
              >
                🖋️ Tinta
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preset")}
                className={`px-2 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all ${
                  activeTab === "preset" ? "bg-amber-100 border-b-amber-100 font-extrabold text-amber-900 translate-y-px" : "bg-[#C0C0C0]"
                }`}
              >
                ⚡ Preset
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto max-h-72 p-1">
              {/* TAB 1: TOPI & AKSESORI */}
              {activeTab === "hat" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {HAT_OPTIONS.map((item) => {
                    const isSelected = skin.hat === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSkin((prev) => ({ ...prev, hat: item.id }))
                          playRetroNotificationSound(0.05)
                        }}
                        className={`text-left p-2 border rounded-xs flex items-center gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                            : "bg-white text-black border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-xl shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{item.name}</div>
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-stone-300" : "text-stone-500"
                            }`}
                          >
                            {item.desc}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-yellow-300 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* TAB 2: SKIN SENJATA */}
              {activeTab === "weapon" && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-stone-600 bg-amber-50 p-1.5 border border-amber-200 rounded">
                    ⚡ Skin senjata langsung terlihat di mode First-Person dan merubah warna tracer tembakan!
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {WEAPON_SKIN_OPTIONS.map((item) => {
                      const isSelected = skin.weaponSkin === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSkin((prev) => ({ ...prev, weaponSkin: item.id }))
                            playRetroNotificationSound(0.06)
                          }}
                          className={`text-left p-2 border rounded-xs flex items-center gap-2 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                              : "bg-white text-black border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full shrink-0 border border-white/60 shadow"
                            style={{ backgroundColor: item.hex }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate">{item.name}</div>
                            <div
                              className={`text-[10px] truncate ${
                                isSelected ? "text-stone-300" : "text-stone-500"
                              }`}
                            >
                              {item.desc}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-yellow-300 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: EKSPRESI WAJAH */}
              {activeTab === "face" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {FACE_OPTIONS.map((item) => {
                    const isSelected = skin.face === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSkin((prev) => ({ ...prev, face: item.id }))
                          playRetroNotificationSound(0.05)
                        }}
                        className={`text-left p-2 border rounded-xs flex items-center gap-2 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                            : "bg-white text-black border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <span className="text-xl shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{item.name}</div>
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-stone-300" : "text-stone-500"
                            }`}
                          >
                            {item.desc}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-yellow-300 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* TAB 4: WARNA TINTA */}
              {activeTab === "ink" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {INK_OPTIONS.map((item) => {
                    const isSelected = skin.ink === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSkin((prev) => ({ ...prev, ink: item.id }))
                          playRetroNotificationSound(0.05)
                        }}
                        className={`text-left p-2 border rounded-xs flex items-center gap-2.5 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                            : "bg-white text-black border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <span
                          className="w-6 h-6 rounded-full shrink-0 border-2 border-stone-300 shadow"
                          style={{ backgroundColor: item.hex }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate">{item.name}</div>
                          <div
                            className={`text-[10px] truncate ${
                              isSelected ? "text-stone-300" : "text-stone-500"
                            }`}
                          >
                            {item.desc}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-yellow-300 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* TAB 5: PRESETS KOSTUM */}
              {activeTab === "preset" && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-amber-900 bg-amber-50 p-2 border border-amber-300 rounded">
                    💡 Pilih preset komplit sekali klik untuk tampil berkelas di arena!
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SKIN_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="text-left p-2.5 bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 rounded-xs flex items-center justify-between cursor-pointer group shadow-xs active:translate-y-px"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{p.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-stone-900 group-hover:text-amber-900">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                              <span>Topi: {p.skin.hat}</span>
                              <span>•</span>
                              <span>Skin: {p.skin.weaponSkin}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          PAKAI
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#C0C0C0] border-t border-[#808080] flex items-center justify-between font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setSkin(DEFAULT_DOODLE_SKIN)
              playRetroNotificationSound(0.05)
            }}
            className="px-2.5 py-1 bg-[#C0C0C0] border border-t-white border-l-white border-b-black border-r-black hover:bg-stone-200 cursor-pointer text-stone-700 text-[11px]"
          >
            Reset Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-[#C0C0C0] border border-t-white border-l-white border-b-black border-r-black hover:bg-stone-200 cursor-pointer font-bold"
            >
              BATAL
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-4 py-1 bg-[#000080] text-white border-2 border-t-white border-l-white border-b-black border-r-black hover:bg-[#000099] cursor-pointer font-bold shadow active:translate-y-px"
            >
              SIMPAN &amp; PAKAI
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
