"use client"

import * as React from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { FridgeItem, FridgeSlot, formatExpiredAt, getExpiryStatus } from "@/lib/fridge-store"
import { RotateCw, Sparkles, User, Clock, Trash2, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FridgeThreeSceneProps {
  items: FridgeItem[]
  isDoorOpen: boolean
  onToggleDoor: () => void
  canEdit: (item: FridgeItem) => boolean
  onEdit: (item: FridgeItem) => void
  onDelete: (item: FridgeItem) => void
}

export function FridgeThreeScene({
  items,
  isDoorOpen,
  onToggleDoor,
  canEdit,
  onEdit,
  onDelete,
}: FridgeThreeSceneProps) {
  const mountRef = React.useRef<HTMLDivElement>(null)
  const [selectedItem, setSelectedItem] = React.useState<FridgeItem | null>(null)
  const [hoveredObject, setHoveredObject] = React.useState<string | null>(null)

  // Refs for three.js animated entities
  const doorPivotRef = React.useRef<THREE.Group | null>(null)
  const interiorLightRef = React.useRef<THREE.PointLight | null>(null)
  const targetDoorAngleRef = React.useRef<number>(isDoorOpen ? -Math.PI * 0.65 : 0)
  const currentDoorAngleRef = React.useRef<number>(isDoorOpen ? -Math.PI * 0.65 : 0)
  const controlsRef = React.useRef<OrbitControls | null>(null)
  const cameraRef = React.useRef<THREE.PerspectiveCamera | null>(null)
  const itemMeshesRef = React.useRef<Map<string, THREE.Object3D>>(new Map())

  // Keep target door angle updated
  React.useEffect(() => {
    targetDoorAngleRef.current = isDoorOpen ? -Math.PI * 0.65 : 0
  }, [isDoorOpen])

  // Deselect on outside click
  React.useEffect(() => {
    const handleOutside = () => setSelectedItem(null)
    window.addEventListener("click", handleOutside)
    return () => window.removeEventListener("click", handleOutside)
  }, [])

  // ─── THREE SCENE SETUP ───────────────────────────────────────
  React.useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 600
    const height = container.clientHeight || 550

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdde5ed)

    // Subtle office grid floor
    const grid = new THREE.GridHelper(20, 20, 0xa0aec0, 0xcbd5e1)
    grid.position.y = -2.8
    scene.add(grid)

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0.5, 7.5)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 + 0.1 // don't go below floor
    controls.minDistance = 3.5
    controls.maxDistance = 12
    controls.target.set(0, -0.2, 0)
    controlsRef.current = controls

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4)
    dirLight.position.set(4, 8, 5)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0x90cdf4, 0.5)
    fillLight.position.set(-5, 2, -3)
    scene.add(fillLight)

    // Interior Refrigerator Warm Bulb Light
    const interiorLight = new THREE.PointLight(0xffeedd, isDoorOpen ? 2.5 : 0, 4)
    interiorLight.position.set(0, 1.2, 0.5)
    scene.add(interiorLight)
    interiorLightRef.current = interiorLight

    // ─── PROCEDURAL LG FRIDGE MESHES ────────────────────────────
    const fridgeGroup = new THREE.Group()
    fridgeGroup.position.y = -0.3
    scene.add(fridgeGroup)

    // Materials
    const metallicSilverMat = new THREE.MeshStandardMaterial({
      color: 0xc8d2dc,
      roughness: 0.28,
      metalness: 0.65,
    })

    const interiorWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.15,
      metalness: 0.05,
    })

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      transmission: 0.6,
      thickness: 0.2,
    })

    const crisperMat = new THREE.MeshPhysicalMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
    })

    const darkPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.2,
    })

    const fridgeWidth = 2.4
    const fridgeHeight = 4.4
    const fridgeDepth = 2.0

    // A. Outer Cabinet Body (Back, Sides, Top, Bottom)
    // Back Wall
    const backGeo = new THREE.BoxGeometry(fridgeWidth, fridgeHeight, 0.12)
    const backMesh = new THREE.Mesh(backGeo, metallicSilverMat)
    backMesh.position.set(0, 0, -fridgeDepth / 2)
    backMesh.castShadow = true
    fridgeGroup.add(backMesh)

    // Left Wall
    const leftGeo = new THREE.BoxGeometry(0.12, fridgeHeight, fridgeDepth)
    const leftMesh = new THREE.Mesh(leftGeo, metallicSilverMat)
    leftMesh.position.set(-fridgeWidth / 2, 0, 0)
    leftMesh.castShadow = true
    fridgeGroup.add(leftMesh)

    // Right Wall
    const rightMesh = leftMesh.clone()
    rightMesh.position.set(fridgeWidth / 2, 0, 0)
    fridgeGroup.add(rightMesh)

    // Top Cap
    const topGeo = new THREE.BoxGeometry(fridgeWidth, 0.14, fridgeDepth)
    const topMesh = new THREE.Mesh(topGeo, metallicSilverMat)
    topMesh.position.set(0, fridgeHeight / 2, 0)
    topMesh.castShadow = true
    fridgeGroup.add(topMesh)

    // Bottom Base
    const bottomMesh = topMesh.clone()
    bottomMesh.position.set(0, -fridgeHeight / 2, 0)
    fridgeGroup.add(bottomMesh)

    // Cabinet Interior Liner Back
    const linerGeo = new THREE.BoxGeometry(fridgeWidth - 0.24, fridgeHeight - 0.28, 0.05)
    const linerMesh = new THREE.Mesh(linerGeo, interiorWhiteMat)
    linerMesh.position.set(0, 0, -fridgeDepth / 2 + 0.1)
    fridgeGroup.add(linerMesh)

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16)
    const legFL = new THREE.Mesh(legGeo, darkPlasticMat)
    legFL.position.set(-fridgeWidth / 2 + 0.3, -fridgeHeight / 2 - 0.1, fridgeDepth / 2 - 0.3)
    const legFR = legFL.clone()
    legFR.position.x = fridgeWidth / 2 - 0.3
    const legBL = legFL.clone()
    legBL.position.z = -fridgeDepth / 2 + 0.3
    const legBR = legFR.clone()
    legBR.position.z = -fridgeDepth / 2 + 0.3
    fridgeGroup.add(legFL, legFR, legBL, legBR)

    // B. Interior Compartments
    // 1. Freezer Box (Top Cavity)
    // We create an open box or translucent flap so interior items are visible
    const freezerFlapGeo = new THREE.BoxGeometry(fridgeWidth - 0.28, 0.82, 0.04)
    const freezerFlapMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
      roughness: 0.15,
      transmission: 0.4,
    })
    const freezerFlap = new THREE.Mesh(freezerFlapGeo, freezerFlapMat)
    freezerFlap.position.set(0, 1.4, fridgeDepth / 2 - 0.18)
    fridgeGroup.add(freezerFlap)

    // Freezer Floor Shelf
    const freezerFloorGeo = new THREE.BoxGeometry(fridgeWidth - 0.26, 0.05, fridgeDepth - 0.3)
    const freezerFloorMat = new THREE.MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.3 })
    const freezerFloor = new THREE.Mesh(freezerFloorGeo, freezerFloorMat)
    freezerFloor.position.set(0, 0.96, 0.05)
    fridgeGroup.add(freezerFloor)

    // 2. Chiller Shelf
    const chillerGeo = new THREE.BoxGeometry(fridgeWidth - 0.26, 0.05, fridgeDepth - 0.35)
    const chillerMesh = new THREE.Mesh(chillerGeo, glassMat)
    chillerMesh.position.set(0, 0.8, 0.05)
    fridgeGroup.add(chillerMesh)

    // 3. Main Shelf Upper
    const shelf1 = chillerMesh.clone()
    shelf1.position.y = 0.15
    fridgeGroup.add(shelf1)

    // 4. Main Shelf Lower
    const shelf2 = chillerMesh.clone()
    shelf2.position.y = -0.5
    fridgeGroup.add(shelf2)

    // 5. Veggie Crisper Box (Bottom Drawer)
    const crisperGeo = new THREE.BoxGeometry(fridgeWidth - 0.3, 0.9, fridgeDepth - 0.35)
    const crisperMesh = new THREE.Mesh(crisperGeo, crisperMat)
    crisperMesh.position.set(0, -1.5, 0.05)
    fridgeGroup.add(crisperMesh)

    // C. 3D SWINGING DOOR ASSEMBLY (Pivot at Left Front Edge)
    const doorPivot = new THREE.Group()
    // Position pivot at the left-front corner: x = -fridgeWidth/2, z = fridgeDepth/2
    doorPivot.position.set(-fridgeWidth / 2, 0, fridgeDepth / 2)
    fridgeGroup.add(doorPivot)
    doorPivotRef.current = doorPivot

    // Door Panel (offset to right by half door width so it hinges on left)
    const doorPanelGeo = new THREE.BoxGeometry(fridgeWidth, fridgeHeight, 0.14)
    const doorPanelMesh = new THREE.Mesh(doorPanelGeo, metallicSilverMat)
    doorPanelMesh.position.set(fridgeWidth / 2, 0, 0.07)
    doorPanelMesh.castShadow = true
    doorPanelMesh.userData = { isDoor: true }
    doorPivot.add(doorPanelMesh)

    // Door Inner Liner (White)
    const doorLinerGeo = new THREE.BoxGeometry(fridgeWidth - 0.15, fridgeHeight - 0.2, 0.02)
    const doorLinerMesh = new THREE.Mesh(doorLinerGeo, interiorWhiteMat)
    doorLinerMesh.position.set(fridgeWidth / 2, 0, -0.01)
    doorPivot.add(doorLinerMesh)

    // Door Pocket Shelves (on inside of door)
    const doorPocketGeo = new THREE.BoxGeometry(fridgeWidth - 0.4, 0.16, 0.25)
    const pocketMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
    const pocket1 = new THREE.Mesh(doorPocketGeo, pocketMat)
    pocket1.position.set(fridgeWidth / 2, 0.3, -0.14)
    const pocket2 = pocket1.clone()
    pocket2.position.y = -0.5
    const pocket3 = pocket1.clone()
    pocket3.position.y = -1.3
    doorPivot.add(pocket1, pocket2, pocket3)

    // Vertical Pocket Handle on Right Edge
    const handleGeo = new THREE.BoxGeometry(0.12, 1.2, 0.12)
    const handleMesh = new THREE.Mesh(handleGeo, darkPlasticMat)
    handleMesh.position.set(fridgeWidth - 0.15, 0.4, 0.18)
    handleMesh.userData = { isDoor: true }
    doorPivot.add(handleMesh)

    // LG Badge on top of door
    const badgeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24)
    badgeGeo.rotateX(Math.PI / 2)
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xa50034, metalness: 0.3 })
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat)
    badgeMesh.position.set(0.4, fridgeHeight / 2 - 0.35, 0.15)
    doorPivot.add(badgeMesh)

    // ─── RAYCASTER FOR INTERACTION ──────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)

      // Check item meshes first
      const itemIntersects = raycaster.intersectObjects(
        Array.from(itemMeshesRef.current.values()),
        true
      )
      if (itemIntersects.length > 0) {
        let current: THREE.Object3D | null = itemIntersects[0].object
        while (current && !current.userData.itemData) {
          current = current.parent
        }
        if (current?.userData.itemData) {
          event.stopPropagation()
          setSelectedItem(current.userData.itemData as FridgeItem)
          return
        }
      }

      // Check door click
      const doorIntersects = raycaster.intersectObject(doorPivot, true)
      if (doorIntersects.length > 0) {
        event.stopPropagation()
        onToggleDoor()
      }
    }

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(
        [...Array.from(itemMeshesRef.current.values()), doorPivot],
        true
      )

      if (intersects.length > 0) {
        const obj = intersects[0].object
        if (obj.userData.isDoor) {
          setHoveredObject("Pintu Kulkas (Klik untuk buka/tutup)")
          renderer.domElement.style.cursor = "pointer"
          return
        }
        let current: THREE.Object3D | null = obj
        while (current && !current.userData.itemData) {
          current = current.parent
        }
        if (current?.userData.itemData) {
          const it = current.userData.itemData as FridgeItem
          setHoveredObject(`${it.name} (${it.ownerName})`)
          renderer.domElement.style.cursor = "pointer"
          return
        }
      }
      setHoveredObject(null)
      renderer.domElement.style.cursor = "grab"
    }

    renderer.domElement.addEventListener("click", handlePointerDown)
    renderer.domElement.addEventListener("mousemove", handlePointerMove)

    // ─── ANIMATION LOOP ─────────────────────────────────────────
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      // Smooth door hinge rotation
      if (doorPivotRef.current) {
        currentDoorAngleRef.current += (targetDoorAngleRef.current - currentDoorAngleRef.current) * 0.1
        doorPivotRef.current.rotation.y = currentDoorAngleRef.current
      }

      // Interior light intensity based on door openness
      if (interiorLightRef.current) {
        const openness = Math.abs(currentDoorAngleRef.current) / (Math.PI * 0.65)
        interiorLightRef.current.intensity = openness * 2.5
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // ─── RESIZE LISTENER ────────────────────────────────────────
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener("resize", handleResize)

    // ─── CLEANUP ────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
      renderer.domElement.removeEventListener("click", handlePointerDown)
      renderer.domElement.removeEventListener("mousemove", handlePointerMove)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [onToggleDoor])

  // ─── RE-RENDER 3D ITEM MESHES WHEN ITEMS UPDATE ─────────────
  React.useEffect(() => {
    const doorPivot = doorPivotRef.current
    if (!doorPivot) return

    // Clear old item meshes
    itemMeshesRef.current.forEach((mesh) => {
      mesh.parent?.remove(mesh)
    })
    itemMeshesRef.current.clear()

    // Base slot coordinates mapping (accurately resting on each shelf surface)
    const slotConfigs: Record<
      FridgeSlot,
      { y: number; z: number; isDoor?: boolean; maxCount: number }
    > = {
      freezer: { y: 1.05, z: 0.25, maxCount: 4 }, // inside freezer box
      chiller: { y: 0.83, z: 0.2, maxCount: 4 }, // on chiller glass
      main_upper: { y: 0.18, z: 0.2, maxCount: 4 }, // on upper glass shelf
      main_lower: { y: -0.47, z: 0.2, maxCount: 4 }, // on lower glass shelf
      crisper: { y: -1.05, z: 0.2, maxCount: 4 }, // inside crisper veggie box
      door: { y: 0.38, z: -0.14, isDoor: true, maxCount: 4 }, // on door pocket 1
    }

    // Group items by slot
    const grouped: Record<FridgeSlot, FridgeItem[]> = {
      freezer: [],
      chiller: [],
      main_upper: [],
      main_lower: [],
      crisper: [],
      door: [],
    }
    items.forEach((it) => {
      const s = it.slot || "main_upper"
      if (grouped[s]) grouped[s].push(it)
    })

    // Colors per category
    const categoryColors: Record<string, number> = {
      makanan: 0xef4444, // Red / Bento
      minuman: 0x3b82f6, // Blue / Drink bottle
      bumbu: 0xf59e0b, // Amber / Jar
      lainnya: 0x10b981, // Green / Box
    }

    // Helper to build 3D mesh per item
    const createItemMesh = (item: FridgeItem) => {
      const group = new THREE.Group()
      const color = categoryColors[item.category] || 0x64748b

      const name = item.name.toLowerCase()
      if (name.includes("susu") || item.category === "minuman" || name.includes("pocari")) {
        // Bottle Cylinder
        const bottleGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.35, 16)
        const bottleMat = new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.1 })
        const bottle = new THREE.Mesh(bottleGeo, bottleMat)
        bottle.position.y = 0.175
        bottle.castShadow = true
        group.add(bottle)

        // Cap
        const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12)
        const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
        const cap = new THREE.Mesh(capGeo, capMat)
        cap.position.y = 0.38
        group.add(cap)
      } else if (name.includes("sambal") || item.category === "bumbu" || name.includes("mayo")) {
        // Jar
        const jarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16)
        const jarMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 })
        const jar = new THREE.Mesh(jarGeo, jarMat)
        jar.position.y = 0.125
        jar.castShadow = true
        group.add(jar)

        const lidGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 16)
        const lidMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 })
        const lid = new THREE.Mesh(lidGeo, lidMat)
        lid.position.y = 0.28
        group.add(lid)
      } else {
        // Bento / Container Box
        const boxGeo = new THREE.BoxGeometry(0.35, 0.18, 0.3)
        const boxMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
        const box = new THREE.Mesh(boxGeo, boxMat)
        box.position.y = 0.09
        box.castShadow = true
        group.add(box)

        // Lid rim
        const lidGeo = new THREE.BoxGeometry(0.37, 0.04, 0.32)
        const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
        const lid = new THREE.Mesh(lidGeo, lidMat)
        lid.position.y = 0.19
        group.add(lid)
      }

      // Expiry status glowing dot above mesh
      const status = getExpiryStatus(item)
      if (status !== "none") {
        const dotGeo = new THREE.SphereGeometry(0.04, 8, 8)
        const dotMat = new THREE.MeshBasicMaterial({
          color: status === "expired" ? 0xdc2626 : status === "soon" ? 0xf59e0b : 0x10b981,
        })
        const dot = new THREE.Mesh(dotGeo, dotMat)
        dot.position.y = 0.46
        group.add(dot)
      }

      group.userData = { itemData: item }
      return group
    }

    // Place meshes into slots
    Object.entries(grouped).forEach(([slotKey, slotItems]) => {
      const cfg = slotConfigs[slotKey as FridgeSlot]
      if (!cfg) return

      const count = slotItems.length
      const spacing = 0.42
      const startX = -((count - 1) * spacing) / 2

      slotItems.forEach((it, idx) => {
        const mesh = createItemMesh(it)
        const posX = startX + idx * spacing

        if (cfg.isDoor) {
          // Inside door assembly (x is offset from door hinge)
          mesh.position.set(1.2 + posX * 0.7, cfg.y, cfg.z)
          doorPivot.add(mesh)
        } else {
          // Inside main cabinet
          mesh.position.set(posX, cfg.y, cfg.z)
          doorPivot.parent?.add(mesh)
        }

        itemMeshesRef.current.set(it.id, mesh)
      })
    })
  }, [items])

  // Reset camera view button
  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(0, 0.5, 7.5)
    controlsRef.current.target.set(0, -0.2, 0)
    controlsRef.current.update()
  }

  return (
    <div className="relative w-full h-full min-h-[520px] flex items-center justify-center select-none overflow-hidden">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Navigation Controls Overlay */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={handleResetCamera}
          title="Reset Sudut Kamera"
          className="h-7 px-2 bg-white/90 hover:bg-white text-[#1E4E8C] font-mono text-[10px] font-bold rounded-[2px] border border-[#CBD5E1] shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <RotateCw className="size-3" />
          <span>Tampak Depan</span>
        </button>

        <button
          type="button"
          onClick={onToggleDoor}
          className={cn(
            "h-7 px-2.5 font-mono text-[10px] font-bold rounded-[2px] border shadow-xs flex items-center gap-1.5 cursor-pointer transition-all",
            isDoorOpen
              ? "bg-[#1E4E8C] text-white border-[#102A45]"
              : "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 animate-pulse"
          )}
        >
          <span>{isDoorOpen ? "🚪 Tutup Pintu" : "🚪 Buka Pintu Kulkas"}</span>
        </button>
      </div>

      {/* Hover Info Tooltip Bar */}
      {hoveredObject && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#102A45]/90 text-white font-mono text-[11px] font-bold px-3 py-1 rounded-[3px] border border-blue-400/60 shadow-lg pointer-events-none animate-in fade-in-0 duration-100 z-20 flex items-center gap-1.5">
          <Sparkles className="size-3 text-amber-300" />
          <span>{hoveredObject}</span>
        </div>
      )}

      {/* Instructions pill */}
      <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-xs border border-slate-300 px-2.5 py-1 rounded-[3px] text-[9px] font-mono text-slate-600 shadow-xs hidden sm:block pointer-events-none z-10">
        🖱️ Putar kamera 360° • Scroll zoom • Klik pintu / makanan
      </div>

      {/* Selected Item Point & Click Popover Modal */}
      {selectedItem && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-white rounded-[4px] border-2 border-[#102A45] shadow-[6px_6px_0px_rgba(0,0,0,0.35)] p-3 text-[#14253D] font-mono text-left animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between border-b border-slate-200 pb-1.5 mb-2">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs leading-tight text-[#102A45] truncate">
                {selectedItem.name}
              </div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">
                {selectedItem.category} • {selectedItem.slot}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="text-slate-400 hover:text-slate-800 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-1.5 py-1">
            {selectedItem.ownerAvatar ? (
              <img
                src={selectedItem.ownerAvatar}
                alt={selectedItem.ownerName}
                className="size-4 rounded-full border border-slate-200 shrink-0"
              />
            ) : (
              <User className="size-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[11px] text-slate-700 truncate font-semibold">
              {selectedItem.ownerName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 mt-1">
            <Clock className="size-3.5 shrink-0 text-slate-400" />
            <span>
              {selectedItem.expiredAt ? (
                <span
                  className={cn(
                    "font-bold",
                    getExpiryStatus(selectedItem) === "expired"
                      ? "text-red-600"
                      : getExpiryStatus(selectedItem) === "soon"
                        ? "text-amber-600"
                        : "text-emerald-700"
                  )}
                >
                  Exp: {formatExpiredAt(selectedItem.expiredAt)}
                </span>
              ) : (
                <span className="text-slate-400 italic">Tanpa expired</span>
              )}
            </span>
          </div>

          {selectedItem.notes && (
            <div className="mt-2 text-[10px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-200 leading-snug break-words">
              &quot;{selectedItem.notes}&quot;
            </div>
          )}

          {canEdit(selectedItem) && (
            <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onEdit(selectedItem)
                  setSelectedItem(null)
                }}
                className="h-6 px-2 text-[10px] font-bold rounded-[2px] bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="size-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(selectedItem)
                  setSelectedItem(null)
                }}
                className="h-6 px-2 text-[10px] font-bold rounded-[2px] bg-red-50 text-red-800 border border-red-300 hover:bg-red-100 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="size-3" /> Ambil/Buang
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
