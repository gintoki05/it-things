# IT Things

<!-- impeccable:product-schema 1 -->

## Platform

Web application, including mobile browsers.

## Users and purpose

Internal IT team members use a desktop-style collection of team utilities and
games. Guests have limited access. Tower 98 is a single-player break-time game
inside the existing Game & Arcade collection.

## Confirmed constraints

- Preserve the existing Windows 98 identity and concise, casual Indonesian copy.
- New game controls must work with touch and keyboard at 360–390px widths.
- Use the shared RetroActionButton and ConfirmDialog components.
- Important database reads/writes go through authenticated Server Actions.
- Supabase tables require RLS, ownership checks, and local schema documentation.

## Tower 98 approved scope

Crane release timing, dynamic floor stacking and collapse, score and perfect
combo, camera movement, original pixel buildings, pause/restart/sound, and a
daily team leaderboard. Build and verify physical behavior before visual polish.
