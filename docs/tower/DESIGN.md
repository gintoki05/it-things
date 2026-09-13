---
name: Tower 98
description: Original pixel construction game inside the existing IT Things Windows 98 desktop.
colors:
  sky: "#87bfda"
  floor-red: "#ab3743"
  floor-highlight: "#d75852"
  floor-shadow: "#742e3f"
  milestone-floor: "#be7147"
  crane-gold: "#edbe56"
  crane-ink: "#253c49"
  chrome: "#c0c0c0"
  panel: "#ece9d8"
  border-shadow: "#808080"
  border-light: "#ffffff"
  text: "#14253d"
  hud-text: "#213d50"
  muted-text: "#475569"
  focus: "#000080"
typography:
  body:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
    fontSize: "12px"
  hud:
    fontSize: "24px"
    fontWeight: 900
    lineHeight: "32px"
  label:
    fontSize: "10px"
    fontWeight: 700
  message:
    fontSize: "11px"
rounded:
  action: "2px"
spacing:
  compact: "8px"
  panel: "12px"
  overlay: "20px"
components:
  state-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    padding: "20px"
  leaderboard:
    backgroundColor: "{colors.panel}"
    padding: "12px"
---

# Design System: Tower 98

## Overview

Scope: the shipped Tower 98 game only. This document extends the established Windows 98 desktop; it does not redefine other IT Things modules. Sources: `components/apps/tower-app.tsx`, `components/apps/tower-leaderboard.tsx`, `lib/tower/render.ts`, and shared action controls.

The existing Windows 98 arcade identity combines compact utility chrome with an original pixel construction scene. Casual Indonesian messages explain the next action without crowding the playfield.

## Colors

Primary scene colors are open blue sky and red floors, with warm highlights and dark red edges separating each physical body. Every fifth floor uses a warmer brown-orange palette. Gold trusses and a dark trolley distinguish the crane from the building. Muted clouds and a distant skyline sit behind gameplay.

Neutral gray chrome frames cream state panels and the leaderboard. Dark HUD text keeps score and floor count readable against the sky. Navy marks keyboard focus.

## Typography

Compact monospace text carries the interface. Score and floor count use the HUD size, heavy weight, and tabular numerals; small bold uppercase labels sit above them. State titles use bold 20px text. Status messages and leaderboard rows use 11px text; hints and reset information use 10px. Player names truncate, with the full name available in a tooltip.

## Layout

The full-height game is a vertical stack: compact toolbar, flexible canvas with a 240px minimum height, and a fixed control footer. The HUD occupies opposite upper corners without intercepting pointer events. The centered state panel is fluid, capped at 280px, with surrounding padding.

The leaderboard fills and replaces the playfield visually. Its table scrolls within the available space, while its header and actions remain separate. Footer actions wrap when needed. Shared controls adapt at the 768px desktop breakpoint; Tower keeps toolbar targets at least 32px and primary play targets at least 40px for the approved 360–390px mobile layouts.

## Elevation & Depth

State panels use a white top/left border and gray bottom/right border, plus a modest shadow. Shared buttons supply their existing small offset shadows and pressed movement. Pixel floors use explicit lit and shaded edges, window recesses, and sill details. These solid shapes carry depth; clouds move with quiet camera parallax.

## Shapes

The game artwork uses rectangular pixel geometry with canvas image smoothing disabled. Floors have three divided windows and independent rotation matching their physics bodies. Chrome and panels retain square edges; shared action buttons use their existing small corner radius.

## Components

- **Crane and tower:** a trussed rail crosses the playfield. The trolley follows the actual moving physics pivot, and its rope reaches the current floor attachment. Floor position and rotation come from the simulation. Camera movement changes framing; a left height ruler marks five-floor intervals.
- **Controls:** all actions use `RetroActionButton`, including trophy, sound, pause, restart, and the full-width “Lepas lantai” control. Disabled states reflect game availability. Canvas click/tap releases a floor; Space or Enter releases only when the canvas is focused, ignoring key repeats. A visible inset focus ring identifies that target.
- **State panel:** ready, paused, game-over, and error states share a cream beveled panel over a translucent blue shade. Restart during play uses the shared warning `ConfirmDialog` titled `ULANG_TOWER.EXE`.
- **Leaderboard:** compact rank/name/floors/score columns, right-aligned tabular numbers, inline loading/error/save feedback, and shared refresh/save/close controls. Opening it suspends gameplay; closing it returns to the existing game state.
- **Feedback:** a live status message reports play progress. Optional retro sound accompanies landing, perfect landing, and collapse. The footer shows the local device record once.

## Do's and Don'ts

- **Do** preserve the existing Win98 shell, compact monospace hierarchy, original pixel floors, and readable score HUD.
- **Do** keep the crane drawing attached to simulation coordinates and preserve mobile touch targets and focused keyboard input.
- **Do** reuse shared action buttons and confirmation dialogs.
- **Don't** introduce native browser dialogs, duplicate nearby status copy, or style game controls independently of the shared components.
- **Don't** apply this game-specific scene palette or composition as a new global identity.
