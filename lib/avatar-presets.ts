export interface AvatarPreset {
  id: string
  name: string
  url: string
}

export const RETRO_AVATAR_PRESETS: AvatarPreset[] = [
  { id: "retro-pc", name: "Retro PC", url: "/avatars/retro-pc.svg" },
  { id: "cyber-robot", name: "Cyber Robot", url: "/avatars/cyber-robot.svg" },
  { id: "pixel-hacker", name: "Pixel Hacker", url: "/avatars/pixel-hacker.svg" },
  { id: "floppy-disk", name: "Floppy Disk", url: "/avatars/floppy-disk.svg" },
  { id: "gamepad", name: "Gamepad", url: "/avatars/gamepad.svg" },
  { id: "pixel-cat", name: "Pixel Cat", url: "/avatars/pixel-cat.svg" },
  { id: "retro-wizard", name: "Retro Wizard", url: "/avatars/retro-wizard.svg" },
  { id: "cyber-ninja", name: "Cyber Ninja", url: "/avatars/cyber-ninja.svg" },
  { id: "coffee-mug", name: "Kopi IT", url: "/avatars/coffee-mug.svg" },
  { id: "rocket-chip", name: "Retro Rocket", url: "/avatars/rocket-chip.svg" },
]

export function isRetroAvatarPreset(url?: string | null): boolean {
  if (!url) return false
  return RETRO_AVATAR_PRESETS.some((preset) => preset.url === url)
}

export function findRetroAvatarPreset(url?: string | null): AvatarPreset | undefined {
  if (!url) return undefined
  return RETRO_AVATAR_PRESETS.find((preset) => preset.url === url)
}
