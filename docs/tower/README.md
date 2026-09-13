# Tower 98

Open **Game & Arcade → Tower 98**, or `/?app=tower` after entering IT Things.
Tap the playfield, press Space while it is focused, or use **Lepas lantai**.
Use the trophy button for the daily leaderboard. At game over, open the
leaderboard and choose **Simpan skor**; login is required for team scores.

## Physics

Planck 1.4.2 drives independent dynamic rectangles, a static foundation, and a
moving crane connected by a distance joint. Releasing removes the joint and
preserves momentum. Landed floors remain dynamic and can wake on impact.

The fixed 60 Hz clock uses two substeps per tick and 12/8 solver iterations.
Canvas resizing and camera movement never change body transforms. Hidden tabs,
minimized/inactive windows, the leaderboard, and confirmation dialogs pause
simulation. At game over the collapse continues for three seconds, then stops.

Landing requires support through the previous floor to the foundation and
low motion for 0.45 seconds. A floor beside the tower does not earn points.
Each landing earns 100; precision adds 50 per combo step, capped at +250.

## Persistence and security

The device record is stored in localStorage; gameplay works without login or
network access. Authenticated Server Actions save the best daily team score,
using Jakarta dates and a conditional update to avoid overwriting a higher score.
Leaderboard data is fetched on opening/refresh, never during desktop bootstrap
or on animation frames. Refresh the leaderboard to see other players' updates.

`supabase/schema.sql` is the source of truth. The companion migration
`supabase/migrations/202609130001_tower_daily_scores.sql` has been applied via
Supabase MCP to `pdftwetkgslpvwissyik`. Four RLS policies protect the table; only
authenticated users read it, and only owners/admins modify or delete rows.
TRUNCATE is revoked from browser roles because it bypasses row policies.

The leaderboard is for casual team play: score plausibility and identity are
validated, but client gameplay is not replay-verified. It is not cheat-proof.
Missing-table errors show an inline warning; failed optimistic saves roll back.

## Verification

- `node --experimental-strip-types --test tests/tower-physics.test.mjs tests/tower-leaderboard.test.mjs` (Node 24): 13 tests.
- `npm run typecheck` and targeted ESLint.
- `npm run build`.
- Browser interaction checks at 1280×900, 360×780 and 390×844: start, keyboard
  drop, pause, restart confirmation, guest leaderboard, no horizontal overflow
  or uncaught page errors.
- `supabase/tests/tower_rls.sql`: owner write, non-owner denial, authenticated
  read and anonymous denial, all inside a rolled-back transaction.

Authenticated leaderboard submission has not been exercised through a real
browser login; database access rules have been tested through MCP.

## Independent visual review

| Area | Verdict |
|---|---|
| Disposition | Pass; prior material finding resolved. |
| Visual fidelity | Desktop and 360px screenshots show a connected trussed beam, trolley, and rope, matching the established pixel/Win98 direction. |
| Usability/accessibility | Clear scores, playfield, and drop control are preserved. |
| Material fixes | None remaining from this review. |
| Limits | Screenshot/source review only; authenticated leaderboard browser flow is untested. Migration is applied and verified. |
