"use client"

import * as React from "react"
import * as THREE from "three"
import { X, Sparkles, Check } from "lucide-react"
import { playRetroNotificationSound } from "@/lib/sound-effects"

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
  { id: 0, name: "Pulpen Biru", hex: "#1a31c2", desc: "Tinta dinas standar" },
  { id: 1, name: "Pulpen Merah", hex: "#dc1f33", desc: "Tinta koreksi agresif" },
  { id: 2, name: "Spidol Hitam", hex: "#2e3342", desc: "Tinta spidol pekat" },
  { id: 3, name: "Stabilo Oranye", hex: "#eb8c14", desc: "Tinta stabilo menyala" },
  { id: 4, name: "Stabilo Hijau", hex: "#1f994d", desc: "Tinta stabilo neon" },
  { id: 5, name: "Stabilo Pink", hex: "#e666a8", desc: "Tinta cerah playful" },
]

export const HAT_OPTIONS: { id: DoodleHatType; name: string; desc: string }[] = [
  { id: "cap", name: "Topi Baseball", desc: "Topi kasual street doodle" },
  { id: "beret", name: "Baret Komando (PB)", desc: "Baret elit prajurit Point Blank" },
  { id: "band", name: "Bandana Ninja", desc: "Ikat kepala ninja berplat besi" },
  { id: "helmet", name: "Helm SWAT Taktis", desc: "Pelindung kevlar anti-peluru" },
  { id: "hood", name: "Hoodie Assassin", desc: "Tudung penyelinap bayangan" },
  { id: "crown", name: "Mahkota Juara", desc: "Mahkota emas raja solo wave" },
  { id: "cowboy", name: "Topi Koboi Sheriff", desc: "Topi kulit lebar penegak hukum" },
  { id: "horns", name: "Tanduk Demon", desc: "Tanduk iblis berdarah dingin" },
  { id: "none", name: "Polos (Gundul)", desc: "Stickman doodle orisinal klasik" },
]

export const WEAPON_SKIN_OPTIONS: { id: DoodleWeaponSkinType; name: string; hex: string; desc: string }[] = [
  { id: "classic", name: "Standard Ink", hex: "#1a31c2", desc: "Mengikuti warna pulpen pilihanmu" },
  { id: "gold", name: "Gold Royale PB", hex: "#eab308", desc: "Lapis emas murni 24k mengkilap" },
  { id: "dragon", name: "Crimson Dragon", hex: "#e11d48", desc: "Goresan naga api merah membara" },
  { id: "cyber", name: "Cyberpunk Neon", hex: "#06b6d4", desc: "Laser cyan & sirkuit sintetis" },
  { id: "shadow", name: "Shadow Tactical", hex: "#18181b", desc: "Hitam matte anti-refleksi peredam" },
]

export const FACE_OPTIONS: { id: DoodleFaceType; name: string; desc: string }[] = [
  { id: "classic", name: "Fokus / Serius", desc: "Tatapan siap tempur bertahan" },
  { id: "psycho", name: "Senyum Sadis (PB)", desc: "Seringai killer saat kill berantai" },
  { id: "shades", name: "Kacamata Thug Life", desc: "Kacamata hitam: Deal with it" },
  { id: "angry", name: "Alis Marah", desc: "Alis menukik tajam penuh dendam" },
  { id: "derp", name: "Mata Silang (X_X)", desc: "Ekspresi kocak pusing tertembak" },
]

export const SKIN_PRESETS: { name: string; tag: string; skin: DoodleCustomSkin }[] = [
  {
    name: "Trooper Point Blank",
    tag: "PB CLASSIC",
    skin: { hat: "beret", weaponSkin: "dragon", face: "psycho", ink: 1 },
  },
  {
    name: "Golden Emperor",
    tag: "ROYALTY",
    skin: { hat: "crown", weaponSkin: "gold", face: "shades", ink: 3 },
  },
  {
    name: "Shadow Shinobi",
    tag: "STEALTH",
    skin: { hat: "band", weaponSkin: "shadow", face: "classic", ink: 2 },
  },
  {
    name: "Cyber Rebel",
    tag: "NEON 2077",
    skin: { hat: "hood", weaponSkin: "cyber", face: "shades", ink: 4 },
  },
  {
    name: "Sheriff Doodle",
    tag: "WILD WEST",
    skin: { hat: "cowboy", weaponSkin: "classic", face: "angry", ink: 0 },
  },
]

// ========================================================
// Bespoke Doodle SVG Icons
// ========================================================

function DoodleHatIcon({ id, className = "w-6 h-6" }: { id: DoodleHatType; className?: string }) {
  switch (id) {
    case "cap":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 21c0-6 4-11 11-11s11 5 11 11H5z" fill="#3b82f6" fillOpacity="0.3" />
          <path d="M16 10v-2" />
          <path d="M22 17c3.5 0 7 1.5 8 3.5-1 1-5 1.5-9 1.5" fill="#1d4ed8" fillOpacity="0.4" />
          <path d="M16 10c-3 4-5 8-5 11" strokeDasharray="1.5 2" />
        </svg>
      )
    case "beret":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="16" cy="15" rx="12" ry="7" transform="rotate(-12 16 15)" fill="#dc2626" fillOpacity="0.35" stroke="#b91c1c" />
          <path d="M7 19c2 3 7 4 15 2" stroke="#1c1917" strokeWidth="2.2" />
          <circle cx="11.5" cy="14.5" r="2" fill="#fef08a" stroke="#b45309" strokeWidth="1.4" />
        </svg>
      )
    case "band":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14h24v5H4z" fill="#d97706" fillOpacity="0.3" stroke="#b45309" />
          <rect x="11" y="13" width="10" height="7" rx="1" fill="#e2e8f0" stroke="#475569" />
          <circle cx="13" cy="16.5" r="0.8" fill="#475569" />
          <circle cx="19" cy="16.5" r="0.8" fill="#475569" />
          <path d="M27 18c2 2 3 5 2 7" stroke="#b45309" strokeWidth="2" />
        </svg>
      )
    case "helmet":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 18C6 11 10 7 16 7s10 4 10 11H6z" fill="#334155" fillOpacity="0.35" stroke="#1e293b" />
          <path d="M4 18h24c0 2-2 3-5 3H9c-3 0-5-1-5-3z" fill="#1e293b" />
          <path d="M11 14h10v3H11z" fill="#0284c7" fillOpacity="0.7" stroke="#0369a1" />
        </svg>
      )
    case "hood":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4L7 16c-1 6 1 12 9 12s10-6 9-12L16 4z" fill="#0f172a" fillOpacity="0.35" stroke="#0f172a" />
          <circle cx="13.5" cy="17" r="1.2" fill="#38bdf8" />
          <circle cx="18.5" cy="17" r="1.2" fill="#38bdf8" />
        </svg>
      )
    case "crown":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 22L7 11l5 6 4-9 4 9 5-6 2 11H5z" fill="#fbbf24" fillOpacity="0.45" stroke="#d97706" />
          <circle cx="7" cy="10" r="1.4" fill="#ef4444" stroke="#b91c1c" />
          <circle cx="16" cy="7" r="1.6" fill="#3b82f6" stroke="#1d4ed8" />
          <circle cx="25" cy="10" r="1.4" fill="#ef4444" stroke="#b91c1c" />
        </svg>
      )
    case "cowboy":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 12c1-3 3-4 5-4s4 1 5 4v6h-10v-6z" fill="#78350f" fillOpacity="0.3" stroke="#78350f" />
          <path d="M3 20c3-2 8-2 13-2s10 0 13 2c-2 2-6 2-13 2s-11 0-13-2z" fill="#92400e" fillOpacity="0.4" stroke="#78350f" />
          <path d="M11 17h10" stroke="#f59e0b" strokeWidth="1.5" />
        </svg>
      )
    case "horns":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 22c-1-5-3-9-6-11 4 1 7 4 8 9" fill="#dc2626" fillOpacity="0.4" stroke="#b91c1c" />
          <path d="M23 22c1-5 3-9 6-11-4 1-7 4-8 9" fill="#dc2626" fillOpacity="0.4" stroke="#b91c1c" />
        </svg>
      )
    case "none":
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="9" fill="#e2e8f0" fillOpacity="0.3" stroke="#475569" />
          <circle cx="12" cy="15" r="1" fill="#0f172a" />
          <circle cx="20" cy="15" r="1" fill="#0f172a" />
          <path d="M13 20c1.5 1 4.5 1 6 0" stroke="#475569" />
        </svg>
      )
  }
}

function DoodleWeaponIcon({ id, className = "w-6 h-6" }: { id: DoodleWeaponSkinType; className?: string }) {
  switch (id) {
    case "gold":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 18l14-6 8 3v4l-7 2-4-2H5v-1z" fill="#facc15" fillOpacity="0.4" stroke="#ca8a04" />
          <path d="M14 18v5l-3 1v-5" fill="#ca8a04" stroke="#854d0e" />
          <circle cx="26" cy="10" r="1.5" fill="#fef08a" stroke="#ca8a04" />
        </svg>
      )
    case "dragon":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19l14-5 8 2v4l-7 3-4-2H5v-2z" fill="#ef4444" fillOpacity="0.35" stroke="#b91c1c" />
          <path d="M18 10c2-3 5-4 8-3-2 3-2 6-4 8" fill="#f97316" fillOpacity="0.5" stroke="#ea580c" />
          <circle cx="23" cy="12" r="1.2" fill="#fef08a" stroke="#b45309" />
        </svg>
      )
    case "cyber":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 19l14-6 8 3v3l-7 2-4-2H5v0z" fill="#06b6d4" fillOpacity="0.3" stroke="#0891b2" />
          <path d="M27 15h4m-2-2v4" stroke="#06b6d4" strokeWidth="2" />
          <path d="M11 15h7" stroke="#e879f9" strokeWidth="1.5" />
        </svg>
      )
    case "shadow":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 19l16-6 8 2v4l-7 3-5-2H3v-1z" fill="#18181b" fillOpacity="0.5" stroke="#27272a" />
          <circle cx="20" cy="14" r="1" fill="#ef4444" />
        </svg>
      )
    case "classic":
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 18l14-6 8 3v4l-7 2-4-2H5v-1z" fill="#3b82f6" fillOpacity="0.25" stroke="#1d4ed8" />
          <path d="M14 18v5l-3 1v-5" fill="#1d4ed8" fillOpacity="0.4" stroke="#1e3a8a" />
        </svg>
      )
  }
}

function DoodleFaceIcon({ id, className = "w-6 h-6" }: { id: DoodleFaceType; className?: string }) {
  switch (id) {
    case "psycho":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" fill="#fee2e2" fillOpacity="0.4" stroke="#dc2626" />
          <circle cx="11.5" cy="13" r="2.2" fill="#fff" stroke="#991b1b" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="1" fill="#991b1b" />
          <circle cx="20.5" cy="13" r="2.2" fill="#fff" stroke="#991b1b" strokeWidth="1.8" />
          <circle cx="20" cy="13" r="1" fill="#991b1b" />
          <path d="M9 19c2 5 12 5 14 0-2 2-12 2-14 0z" fill="#fff" stroke="#991b1b" />
        </svg>
      )
    case "shades":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" fill="#e2e8f0" fillOpacity="0.3" stroke="#475569" />
          <rect x="7" y="12" width="7" height="6" fill="#0f172a" stroke="#0f172a" rx="1" />
          <rect x="18" y="12" width="7" height="6" fill="#0f172a" stroke="#0f172a" rx="1" />
          <path d="M14 14h4" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M9 13.5l3 3m10-3l3 3" stroke="#fff" strokeWidth="1.2" />
        </svg>
      )
    case "angry":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" fill="#fef3c7" fillOpacity="0.3" stroke="#d97706" />
          <path d="M8 11l5 3m11-3l-5 3" stroke="#b45309" strokeWidth="2.4" />
          <circle cx="11.5" cy="15.5" r="1.5" fill="#78350f" />
          <circle cx="20.5" cy="15.5" r="1.5" fill="#78350f" />
          <path d="M12 22c2-2 6-2 8 0" stroke="#78350f" strokeWidth="2" />
        </svg>
      )
    case "derp":
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" fill="#f3e8ff" fillOpacity="0.3" stroke="#9333ea" />
          <path d="M9 12l5 5m-5 0l5-5m4 0l5 5m-5 0l5-5" stroke="#7e22ce" strokeWidth="2" />
          <path d="M18 21.5c1 1 1 3 0 4s-2 0-1-3" fill="#ec4899" stroke="#be185d" />
        </svg>
      )
    case "classic":
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="11" fill="#f8fafc" fillOpacity="0.4" stroke="#475569" />
          <circle cx="11.5" cy="14.5" r="2.2" fill="#fff" stroke="#334155" strokeWidth="1.5" />
          <circle cx="12" cy="14.5" r="1" fill="#0f172a" />
          <circle cx="20.5" cy="14.5" r="2.2" fill="#fff" stroke="#334155" strokeWidth="1.5" />
          <circle cx="20" cy="14.5" r="1" fill="#0f172a" />
          <path d="M13 20.5c1.5 1 4.5 1 6 0" stroke="#334155" strokeWidth="2" />
        </svg>
      )
  }
}

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

  // ========================================================
  // 3D Authentic Doodle Stickman Rendering Engine
  // ========================================================
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animationFrameId: number
    const width = canvas.clientWidth || 240
    const height = canvas.clientHeight || 280

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#fbf9f1") // Warm paper canvas

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
    camera.position.set(0, 1.25, 3.8)
    camera.lookAt(0, 0.98, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Studio Cel Lighting
    const amb = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(amb)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25)
    keyLight.position.set(2, 4, 3)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75)
    rimLight.position.set(-2.5, 3, -3)
    scene.add(rimLight)

    // Hand-drawn Sketch Shadow
    const shadowGeo = new THREE.RingGeometry(0.04, 0.45, 28)
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0xc8bea8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = -Math.PI / 2
    shadowMesh.position.y = 0.015
    scene.add(shadowMesh)

    // Character Root
    const charRoot = new THREE.Group()
    scene.add(charRoot)

    // Ink color resolver
    const activeHex = INK_OPTIONS[skin.ink]?.hex || "#1a31c2"
    const inkColor = new THREE.Color(activeHex)

    // Authentic Doodle Stickman Materials:
    // Core body is off-white sketchbook paper, bordered by bold sketched ink lines!
    const paperCoreMat = new THREE.MeshToonMaterial({
      color: 0xfffef8,
    })

    const inkLineMat = new THREE.LineBasicMaterial({
      color: inkColor,
    })

    const inkSolidMat = new THREE.MeshToonMaterial({
      color: inkColor,
    })

    const darkAccentMat = new THREE.MeshToonMaterial({
      color: 0x18181b,
    })

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

    // Helper: Add inked sketch edges to geometry
    const addDoodleEdges = (mesh: THREE.Mesh, mat = inkLineMat) => {
      const edges = new THREE.EdgesGeometry(mesh.geometry, 24)
      const line = new THREE.LineSegments(edges, mat)
      mesh.add(line)
      return mesh
    }

    // Torso: Paper Stickman Torso with Ink Edges
    const torsoGeo = new THREE.CylinderGeometry(0.16, 0.13, 0.54, 14)
    const torso = addDoodleEdges(new THREE.Mesh(torsoGeo, paperCoreMat))
    torso.position.y = 0.92
    charRoot.add(torso)

    // Inked belt line
    const belt = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.06, 14), inkSolidMat))
    belt.position.y = 0.65
    charRoot.add(belt)

    // Stickman Legs with Joint Dots & Inked Shoes
    const legL = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.58, 8), paperCoreMat))
    legL.position.set(-0.1, 0.33, -0.04)
    legL.rotation.x = 0.08
    charRoot.add(legL)

    const shoeL = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), darkAccentMat))
    shoeL.position.set(-0.1, 0.04, 0)
    charRoot.add(shoeL)

    const legR = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.038, 0.58, 8), paperCoreMat))
    legR.position.set(0.1, 0.33, 0.05)
    legR.rotation.x = -0.1
    charRoot.add(legR)

    const shoeR = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), darkAccentMat))
    shoeR.position.set(0.1, 0.04, 0.09)
    charRoot.add(shoeR)

    // Head Group (Paper Round Doodle Head)
    const headGroup = new THREE.Group()
    headGroup.position.set(0, 1.34, 0)
    charRoot.add(headGroup)

    const headGeo = new THREE.SphereGeometry(0.22, 18, 14)
    const head = addDoodleEdges(new THREE.Mesh(headGeo, paperCoreMat))
    headGroup.add(head)

    // Face Expression Group
    const faceG = new THREE.Group()
    faceG.position.set(0, 0.02, 0.215)
    headGroup.add(faceG)

    if (skin.face === "shades") {
      const glassMat = new THREE.MeshToonMaterial({ color: 0x09090b })
      const glassL = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.03), glassMat), new THREE.LineBasicMaterial({ color: 0xffffff }))
      glassL.position.x = -0.065
      faceG.add(glassL)

      const glassR = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.03), glassMat), new THREE.LineBasicMaterial({ color: 0xffffff }))
      glassR.position.x = 0.065
      faceG.add(glassR)

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.02), glassMat)
      bridge.position.y = 0.015
      faceG.add(bridge)

      // Comic reflection streaks
      const glintL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.01, 0.035), eyeWhiteMat)
      glintL.position.set(-0.065, 0.012, 0.01)
      glintL.rotation.z = 0.6
      faceG.add(glintL)
    } else if (skin.face === "derp") {
      // X_X eyes
      for (const side of [-1, 1]) {
        for (const rot of [0.75, -0.75]) {
          const cross = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.02), darkAccentMat)
          cross.position.set(side * 0.07, 0.02, 0)
          cross.rotation.z = rot
          faceG.add(cross)
        }
      }
      const tongue = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.035, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }))
      tongue.position.set(0.015, -0.08, 0.01)
      tongue.rotation.x = 0.4
      faceG.add(tongue)
    } else {
      // High-contrast Eyes (White sclera + ink pupil)
      for (const side of [-1, 1]) {
        const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), eyeWhiteMat)
        sclera.position.set(side * 0.07, 0.025, 0)
        sclera.scale.set(0.9, 1.25, 0.5)
        faceG.add(sclera)

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), darkAccentMat)
        pupil.position.set(side * 0.07, 0.025, 0.02)
        pupil.scale.set(0.8, 1.2, 0.5)
        faceG.add(pupil)
      }

      if (skin.face === "angry") {
        for (const side of [-1, 1]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), darkAccentMat)
          brow.position.set(side * 0.07, 0.08, 0.01)
          brow.rotation.z = side * -0.42
          faceG.add(brow)
        }
      }

      if (skin.face === "psycho") {
        const teethPlate = new THREE.Mesh(new THREE.CircleGeometry(0.06, 12), eyeWhiteMat)
        teethPlate.position.set(0, -0.065, 0)
        teethPlate.scale.set(1.2, 0.55, 1)
        faceG.add(teethPlate)

        const grin = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.015, 6, 14, Math.PI * 0.95), darkAccentMat)
        grin.position.set(0, -0.065, 0.01)
        grin.rotation.z = Math.PI
        faceG.add(grin)
      } else {
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10, Math.PI * 0.8), darkAccentMat)
        mouth.position.set(0, -0.07, 0)
        faceG.add(mouth)
      }
    }

    // ========================================================
    // Hat & Headgear Models (Tuned Height & Scale for Face Visibility)
    // ========================================================
    const hatG = new THREE.Group()
    headGroup.add(hatG)

    if (skin.hat === "cap") {
      const capDome = addDoodleEdges(
        new THREE.Mesh(new THREE.SphereGeometry(0.235, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), inkSolidMat)
      )
      capDome.position.y = 0.06
      capDome.scale.set(1.04, 0.7, 1.04)
      hatG.add(capDome)

      const visor = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.03, 0.2), inkSolidMat))
      visor.position.set(0, 0.05, 0.19)
      visor.rotation.x = -0.12
      hatG.add(visor)
    } else if (skin.hat === "beret") {
      const beretColor = skin.ink === 1 ? new THREE.Color("#b91c1c") : inkColor
      const beretMat = new THREE.MeshToonMaterial({ color: beretColor })
      const beret = addDoodleEdges(
        new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), beretMat),
        new THREE.LineBasicMaterial({ color: 0x7f1d1d })
      )
      beret.position.set(0.04, 0.1, 0)
      beret.rotation.z = -0.24
      beret.scale.set(1.2, 0.65, 1.15)
      hatG.add(beret)

      // Gold badge
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.07, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      )
      badge.position.set(-0.12, 0.13, 0.15)
      badge.rotation.z = 0.2
      hatG.add(badge)
    } else if (skin.hat === "band") {
      const bandMat = new THREE.MeshToonMaterial({ color: 0xd97706 })
      const band = addDoodleEdges(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.026, 6, 18), bandMat))
      band.rotation.x = Math.PI / 2
      band.position.y = 0.08
      hatG.add(band)

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.045, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0 })
      )
      plate.position.set(0, 0.08, 0.22)
      hatG.add(plate)

      for (const offset of [-0.04, 0.04]) {
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.35), bandMat)
        tail.position.set(offset, 0.06, -0.26)
        tail.rotation.x = 0.35
        hatG.add(tail)
      }
    } else if (skin.hat === "helmet") {
      const helmMat = new THREE.MeshToonMaterial({ color: 0x334155 })
      const helm = addDoodleEdges(
        new THREE.Mesh(new THREE.SphereGeometry(0.255, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), helmMat),
        new THREE.LineBasicMaterial({ color: 0x0f172a })
      )
      helm.position.y = 0.06
      helm.scale.set(1.06, 0.85, 1.06)
      hatG.add(helm)

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.025, 6, 18), darkAccentMat)
      rim.rotation.x = Math.PI / 2
      rim.position.y = 0.05
      hatG.add(rim)
    } else if (skin.hat === "hood") {
      const hoodMat = new THREE.MeshToonMaterial({ color: 0x1e293b })
      const hood = addDoodleEdges(
        new THREE.Mesh(new THREE.SphereGeometry(0.265, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hoodMat),
        new THREE.LineBasicMaterial({ color: 0x020617 })
      )
      hood.position.set(0, 0.05, -0.02)
      hood.scale.set(1.05, 1.12, 1.02)
      hatG.add(hood)
    } else if (skin.hat === "crown") {
      const crownMat = new THREE.MeshToonMaterial({ color: 0xf59e0b })
      const crownBase = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 6, 18), crownMat)
      crownBase.rotation.x = Math.PI / 2
      crownBase.position.y = 0.23
      hatG.add(crownBase)

      const gemColors = [0xef4444, 0x3b82f6, 0x10b981, 0x8b5cf6, 0xef4444]
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.17, 5), crownMat)
        spike.position.set(Math.cos(angle) * 0.19, 0.31, Math.sin(angle) * 0.19)
        hatG.add(spike)

        const gem = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 6, 6),
          new THREE.MeshBasicMaterial({ color: gemColors[i] })
        )
        gem.position.set(Math.cos(angle) * 0.21, 0.24, Math.sin(angle) * 0.21)
        hatG.add(gem)
      }
    } else if (skin.hat === "cowboy") {
      // Scaled & raised Stetson so the face is fully open!
      const leatherMat = new THREE.MeshToonMaterial({ color: 0x78350f })
      const brim = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.024, 18), leatherMat))
      brim.position.y = 0.12
      brim.rotation.x = 0.06
      brim.scale.set(1.05, 1, 1.2)
      hatG.add(brim)

      const crown = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.18, 14), leatherMat))
      crown.position.y = 0.22
      hatG.add(crown)
    } else if (skin.hat === "horns") {
      const hornMat = new THREE.MeshToonMaterial({ color: 0xb91c1c })
      for (const side of [-1, 1]) {
        const horn = addDoodleEdges(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), hornMat))
        horn.position.set(side * 0.13, 0.26, 0.04)
        horn.rotation.z = side * -0.42
        horn.rotation.x = -0.2
        hatG.add(horn)
      }
    }

    // ========================================================
    // Dynamic Tactical Weapon Pose (Both Hands Holding Weapon)
    // ========================================================
    const weaponG = new THREE.Group()
    weaponG.position.set(0.16, 0.82, 0.32)
    weaponG.rotation.y = -0.15
    charRoot.add(weaponG)

    // Weapon Finishes
    let wMat = inkSolidMat
    let wAccentMat = darkAccentMat

    if (skin.weaponSkin === "gold") {
      wMat = new THREE.MeshToonMaterial({ color: 0xf59e0b })
      wAccentMat = new THREE.MeshToonMaterial({ color: 0x78350f })
    } else if (skin.weaponSkin === "dragon") {
      wMat = new THREE.MeshToonMaterial({ color: 0xe11d48 })
      wAccentMat = new THREE.MeshToonMaterial({ color: 0xfacc15 })
    } else if (skin.weaponSkin === "cyber") {
      wMat = new THREE.MeshToonMaterial({ color: 0x06b6d4 })
      wAccentMat = new THREE.MeshToonMaterial({ color: 0xd946ef })
    } else if (skin.weaponSkin === "shadow") {
      wMat = new THREE.MeshToonMaterial({ color: 0x18181b })
      wAccentMat = new THREE.MeshToonMaterial({ color: 0x3f3f46 })
    }

    // Rifle Receiver
    const receiver = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.46), wMat))
    weaponG.add(receiver)

    // Barrel
    const barrel = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), wAccentMat))
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.02, 0.36)
    weaponG.add(barrel)

    // Muzzle tip
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.05, 8), darkAccentMat)
    muzzle.rotation.x = Math.PI / 2
    muzzle.position.set(0, 0.02, 0.54)
    weaponG.add(muzzle)

    // Banana Mag
    const mag = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.09), wAccentMat))
    mag.position.set(0, -0.12, 0.06)
    mag.rotation.x = 0.28
    weaponG.add(mag)

    // Stock
    const stock = addDoodleEdges(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.18), wAccentMat))
    stock.position.set(0, -0.02, -0.3)
    weaponG.add(stock)

    // Holographic Red Dot Sight
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.07), darkAccentMat)
    sight.position.set(0, 0.075, 0)
    weaponG.add(sight)

    const opticDot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
    opticDot.position.set(0, 0.075, 0.04)
    weaponG.add(opticDot)

    // Arms in 2-handed shooting stance
    const armR = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.44, 8), paperCoreMat))
    armR.position.set(0.23, 0.95, 0.15)
    armR.rotation.x = -0.65
    armR.rotation.z = -0.35
    charRoot.add(armR)

    const armL = addDoodleEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.5, 8), paperCoreMat))
    armL.position.set(-0.15, 0.92, 0.18)
    armL.rotation.x = -0.5
    armL.rotation.y = 0.45
    armL.rotation.z = 0.5
    charRoot.add(armL)

    // Interactive Drag Turntable
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

    // Breathing Animation
    let clock = 0
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      clock += 0.03

      charRoot.position.y = Math.sin(clock * 1.8) * 0.012
      weaponG.position.y = 0.82 + Math.sin(clock * 1.8) * 0.007

      if (isAutoRotate && !isDragging) {
        charRoot.rotation.y += 0.011
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
      <div className="w-full max-w-3xl bg-[#C0C0C0] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl flex flex-col max-h-[92vh] text-black font-sans">
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
        <div className="p-3 overflow-y-auto overflow-x-hidden flex-1 flex flex-col md:flex-row gap-3">
          {/* Left Column: 3D Live Turntable Preview */}
          <div className="flex flex-col items-center justify-between bg-[#fbf9f1] border-2 border-t-[#808080] border-l-[#808080] border-b-white border-r-white p-2 rounded-xs w-full md:w-60 shrink-0 shadow-inner">
            <div className="w-full text-center pb-1 border-b border-[#d8d2be] text-[11px] font-mono text-stone-600 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1">
                <span>🎨</span> PREVIEW 3D
              </span>
              <button
                type="button"
                onClick={() => setIsAutoRotate((v) => !v)}
                className={`text-[9px] px-1.5 py-0.5 border rounded cursor-pointer ${
                  isAutoRotate ? "bg-amber-200 border-amber-500 font-bold text-amber-900" : "bg-stone-200 border-stone-400 text-stone-600"
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
                <span className="font-bold truncate max-w-[110px]">
                  {HAT_OPTIONS.find((h) => h.id === skin.hat)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Senjata:</span>
                <span className="font-bold text-amber-900 truncate max-w-[110px]">
                  {WEAPON_SKIN_OPTIONS.find((w) => w.id === skin.weaponSkin)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Ekspresi:</span>
                <span className="font-bold truncate max-w-[110px]">
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
          <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
            {/* Category Navigation Tabs (Clean Single-Row Strip) */}
            <div className="flex items-center gap-1 border-b border-[#808080] pb-1.5 mb-2 font-mono text-[11px] overflow-x-auto no-scrollbar w-full">
              <button
                type="button"
                onClick={() => setActiveTab("hat")}
                className={`px-2.5 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all shrink-0 ${
                  activeTab === "hat" ? "bg-white border-b-white font-extrabold translate-y-px" : "bg-[#C0C0C0]"
                }`}
              >
                🎩 Topi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("weapon")}
                className={`px-2.5 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all shrink-0 ${
                  activeTab === "weapon" ? "bg-white border-b-white font-extrabold translate-y-px text-red-700" : "bg-[#C0C0C0]"
                }`}
              >
                🔫 Senjata
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("face")}
                className={`px-2.5 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all shrink-0 ${
                  activeTab === "face" ? "bg-white border-b-white font-extrabold translate-y-px" : "bg-[#C0C0C0]"
                }`}
              >
                😈 Wajah
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ink")}
                className={`px-2.5 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all shrink-0 ${
                  activeTab === "ink" ? "bg-white border-b-white font-extrabold translate-y-px text-blue-700" : "bg-[#C0C0C0]"
                }`}
              >
                🖋️ Tinta
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preset")}
                className={`px-2.5 py-1 border border-t-white border-l-white border-b-black border-r-black cursor-pointer font-bold transition-all shrink-0 ${
                  activeTab === "preset" ? "bg-amber-100 border-b-amber-100 font-extrabold text-amber-900 translate-y-px" : "bg-[#C0C0C0]"
                }`}
              >
                ⚡ Preset
              </button>
            </div>

            {/* Tab Contents: Guaranteed Zero Horizontal Scrollbar */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden max-h-76 p-0.5">
              {/* TAB 1: TOPI & AKSESORI */}
              {activeTab === "hat" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
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
                        className={`text-left p-2 border rounded-xs flex items-center gap-2 cursor-pointer transition-colors min-w-0 ${
                          isSelected
                            ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                            : "bg-white text-black border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded shrink-0 bg-stone-100 border border-stone-200 flex items-center justify-center p-0.5">
                          <DoodleHatIcon id={item.id} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate font-bold">{item.name}</div>
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
                <div className="space-y-1.5 w-full">
                  <div className="text-[11px] font-mono text-stone-600 bg-amber-50 p-1.5 border border-amber-200 rounded">
                    ⚡ Skin senjata langsung terlihat di mode First-Person & merubah warna tracer tembakan!
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
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
                          className={`text-left p-2 border rounded-xs flex items-center gap-2 cursor-pointer transition-colors min-w-0 ${
                            isSelected
                              ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                              : "bg-white text-black border-stone-300 hover:bg-stone-50"
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded shrink-0 flex items-center justify-center p-0.5 border shadow-xs"
                            style={{
                              backgroundColor: item.hex + "20",
                              borderColor: item.hex,
                            }}
                          >
                            <DoodleWeaponIcon id={item.id} className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate font-bold">{item.name}</div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
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
                        className={`text-left p-2 border rounded-xs flex items-center gap-2 cursor-pointer transition-colors min-w-0 ${
                          isSelected
                            ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                            : "bg-white text-black border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded shrink-0 bg-stone-100 border border-stone-200 flex items-center justify-center p-0.5">
                          <DoodleFaceIcon id={item.id} className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate font-bold">{item.name}</div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
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
                        className={`text-left p-2 border rounded-xs flex items-center gap-2.5 cursor-pointer transition-colors min-w-0 ${
                          isSelected
                            ? "bg-[#000080] text-white border-black font-bold shadow-inner"
                            : "bg-white text-black border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full shrink-0 border-2 border-white shadow-sm flex items-center justify-center text-white text-[11px] font-bold"
                          style={{ backgroundColor: item.hex }}
                        >
                          ✓
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs truncate font-bold">{item.name}</div>
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

              {/* TAB 5: PRESETS KOSTUM (Clean List - No Horizontal Overflow, No Squeezed Buttons) */}
              {activeTab === "preset" && (
                <div className="space-y-1.5 w-full">
                  <div className="text-[11px] font-mono text-amber-900 bg-amber-50 p-2 border border-amber-300 rounded">
                    💡 Pilih preset komplit sekali klik untuk tampil berkelas di arena!
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    {SKIN_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="w-full p-2 bg-white hover:bg-amber-50/80 border border-stone-300 hover:border-amber-400 rounded-xs flex items-center justify-between cursor-pointer group shadow-xs active:translate-y-px transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                            <DoodleHatIcon id={p.skin.hat} className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="text-xs font-bold text-stone-900 group-hover:text-amber-900 flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{p.name}</span>
                              <span className="text-[9px] font-mono bg-amber-200/90 text-amber-950 px-1 py-0.2 rounded font-bold">
                                {p.tag}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-500 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>Topi: {HAT_OPTIONS.find((h) => h.id === p.skin.hat)?.name}</span>
                              <span>•</span>
                              <span>Senjata: {WEAPON_SKIN_OPTIONS.find((w) => w.id === p.skin.weaponSkin)?.name}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 ml-2">
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
