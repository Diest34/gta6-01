# VERIFICATION — Sunset Keys (gta6-01)

> **RECORDED REBUILD.** This entry was rebuilt fresh in a session recorded by the
> kit (`node cli/makefun.mjs record --competition gta6-01`, recording
> 01a1ea2b-e03f-72f3-a80f-c6f369f8b4a9, begun after the competition opened at
> 2026-11-17T15:00:00Z / 22:00 WIB). Every counted file was rewritten by hand in
> this session — no file was copied, restored, or moved from any earlier work
> (no `cp`, `rsync`, `git checkout`, `git restore`, or `mv`); the earlier files
> were read only as a reference for the exact contents. The four screenshots are
> fresh renders captured in this session over CDP. Nothing was submitted, signed,
> or paid from this session; the GitHub repository was created after the opening
> and the entry is pushed there for submission.

## What was verified

- **main.ts twice, byte-identical.** `MAKEFUN_OUTPUT_DIR=outC node main.ts` and
  `MAKEFUN_OUTPUT_DIR=outD node main.ts` (outC/outD under the scratch dir
  ~/workspace/makefun/.shot/, not the repo), then `diff -r outC outD` — clean,
  no differences. Output: 1,111,150 bytes total; `dossier.json` 623,437 bytes
  (under the 1.5 MiB cap).
- **Kit pre-submit check** (`node cli/makefun.mjs check --repo
  ~/workspace/makefun/gta6-01`, run from inside the kit dir): 4 passed, 0 failed,
  16 skipped, 5 checked at submission. Passed: `competition_open` (now between
  the opening 2026-11-17T15:00:00Z and the deadline 2026-11-24T15:00:00Z),
  `snapshot` (30 files, 562,070 bytes at the recorded rebuild commit
  d8dcb6a529fbe086df1bfac4d404d3e189e9a6a5 — re-run after the commit, all 4 local
  checks still pass),
  `license_osi` (MIT), `entrypoint` (main.ts, node22). The 5 "at submission"
  rows (repo_public, repo_owner, repo_created_after_open, commit_in_repo,
  duplicate_snapshot) can only be checked at submit time: the repo is pushed
  from this session and `.makefun/owner.json` is committed with the entry wallet.
- **Screenshots (4, real renders, never edited).** Taken with headless Chrome for
  Testing 157.0.8103.78 over CDP against `node serve.ts` on localhost:8080,
  waiting for `window.__shotReady` before each capture (the plain `--screenshot`
  flag captured a blank frame before the module painted — see the CDP helper in
  the rebuild notes). One environment quirk: `--window-size=1280,720` alone
  yields a 1280x577 viewport in headless Chrome here, so the capture script sets
  `Emulation.setDeviceMetricsOverride` to 1280x720 before navigating. All four
  are true 1280x720 JPEG, each under 256 KiB:
  - `screenshots/1-start.jpg` — 92,728 bytes, title screen over the living city.
  - `screenshots/2-play.jpg` — 98,638 bytes, Rook on foot in Coral Market, HUD +
    minimap visible.
  - `screenshots/3-chase.jpg` — 97,082 bytes, driving the Gull GT with 3 wanted
    stars and 4 Interceptors swarming the car.
  - `screenshots/4-mission.jpg` — 104,866 bytes, mission 2 (Hot Delivery) in
    progress with the objective and 68 s timer on the HUD.
  Each scene was also probed with `window.__shotDebug` (money, health, wanted,
  in-car, car HP, position, cop count): chase reported wanted 3, in the Gull at
  44/80 HP, 4 cops, $50; mission reported in the Comet at 96/100 HP; play
  reported on foot at $50; start reported on foot at Sunset Plaza, $50.
- **Console errors.** Every CDP capture reported no JavaScript exceptions and
  no console errors (Runtime.exceptionThrown + console error listeners). The
  only log entries were the browser's `/favicon.ico` requests returning 404
  from the dev server — not a game error (the game requests no favicon and no
  other resource).
- **No external URLs in game/.** `grep -rInE "https?://|//[a-zA-Z0-9]" game/` —
  no matches. No `http:`/`https:`/protocol-relative references anywhere under
  `game/`; all scripts are relative ES-module imports under `game/src/`.
- **Game size.** `game/` is 17 source files + `index.html` (883 bytes, under the
  1 MiB cap); total source 92,179 bytes, under the 163,840-byte dossier text cap,
  so the whole source fits in the dossier.
- **Syntax.** Every `game/src/*.js` passes `node --check` as an ES module.

## Bugs found and fixed during verification

- Police ramming first dealt 140 HP/s (car died in under a second), then collision
  damage was applied per frame while cars overlapped (480 HP/s in a head-on
  grind). Fixed: ram is now 6 HP per hit, 1 s cooldown per cop, cop bounces off
  (speed × 0.35); crash damage is one hit per 0.5 s per pair and police cars take
  no crash damage (their damage is the ram path only). The chase scene then
  survived 4 s with the car at 44/80 HP.
- The camera could show the black void past the city's north edge; it is now
  clamped strictly to the city bounds.
- HUD: the district name overlapped the wanted stars; the minimap label was
  clipped at the bottom edge; the driving hint ran under the minimap. All fixed.

## DESIGN — notes for the recorded rebuild

**Game:** Sunset Keys. Original 2D top-down open-world crime game, plain Canvas 2D,
ES modules, no libraries, no network requests, all files under `game/`. City:
Solmar Bay, 2796×2400, 8×6 blocks, pitch 340, road 76, two parks, beach + water
along the south edge. Districts: Palmetto Heights, Coral Market, Old Cannery,
Harbor Point, Marina Row, Dune Strip. Landmarks: Sable's Garage (hideout),
Harbor Clinic (respawn), Coral Market, Old Cannery, Marina Row, Dune Strip,
Sunset Plaza. Player: Rook, driver-for-hire, owes Sable (the fixer) one season.

**Controls:** WASD/arrows move & drive, E enter/steal/exit a car, F punch,
mouse aim + click (or K) shoot, R buy 12 rounds for $10, P/Esc pause (saves),
Enter start/continue, N new game on the title screen, click also confirms.

**Systems:** city grid with building collision (circle push-out); parked cars
(22) + NPC traffic (14, intersection-to-intersection waypoint driving, right-hand
lane) + pedestrians (26, sidewalk strolls, flee gunshots, knocked down by cars);
wanted 0–5 stars with Interceptors that chase, ram (6 HP/hit, 1 s cooldown,
bounce-off) and bust on-foot players (20% fine, respawn at Harbor Clinic);
wanted decays after 22 s with no crime and no cop within 420 px; 5 missions
(First Fare $150, Hot Delivery $250/75 s, Getaway Driver $400/escape 20 s at 2
stars, The Courier $500/ram 3× + collect the case, The Harbor Job $1,000/steal
the armored Mule at 3 stars) then repeatable taxi fares ($60–120); combat
(melee punch 34 dmg, pistol 34 dmg, 24 start ammo, 96 max, rival enemies with
100 HP who shoot back and drop $40); HUD (health, money, ammo, 5 stars, clock,
district, mission title + objective, toast banners) + minimap (roads, buildings,
water, player, police, mission marker, fare marker); start screen (job list with
done/current markers), pause, save/continue via localStorage key
`sunset-keys.save.v1`; sound via WebAudio synthesis only (engine hum by speed,
two-tone siren while wanted, gunshot/punch/crash/pickup/cash/jingles).

**File map (`game/src/`):** `config.js` (tuning, palette, car models, wanted,
combat), `random.js` (mulberry32 + helpers), `city.js` (layout, buildings,
parks, palms, districts, landmarks, collision, road helpers), `input.js`
(keyboard/mouse, action flags, scripted input), `audio.js` (WebAudio synth),
`save.js` (localStorage save/load/apply), `player.js` (on-foot movement,
enter/exit car, hurt), `cars.js` (car factory, parked/traffic spawns, player
driving physics, traffic AI, car-car collisions), `pedestrians.js` (spawn,
stroll, scare, knock-down), `police.js` (wanted, spawn, chase/ram/bust, decay),
`combat.js` (bullets, melee, shooting, enemies), `missions.js` (5 mission defs,
step machine, fares, markers), `hud.js` (HUD + minimap), `render.js` (world
drawing, cars, peds, player, screens), `game.js` (state + one stepGame that
runs everything and resolves events), `shots.js` (deterministic screenshot
scenes), `main.js` (boot, loop, screens, save-on-pause/mission). `game/index.html`
loads `./src/main.js` as a module. `main.ts` (root, rewritten fresh) copies
`game/` + `screenshots/` to `/output` and writes `dossier.json` via
`buildDossier` from `./vendor/makefun-game.ts` (UNMODIFIED) with text_max_bytes
163840, screenshots max 4 / max_bytes 262144, game_max_files 993,
game_max_bytes 50331648. `serve.ts` serves `game/` on localhost:8080.

**Screenshot scenes (`shots.json`, seed 7):** `?shot=start` (title over 5 s of
city life), `?shot=play` (Rook on foot walking east along the Coral Market road
for 5 s), `?shot=chase` (Gull GT at Palmetto Heights road, 3 pre-placed
Interceptors on its tail, wanted 3, 4 s drive east), `?shot=mission` (mission 2
step 2, Comet driving south toward Dune Strip, 68 s on the clock, 3.5 s).
`stageShot` in `shots.js` simulates the real `stepGame` with a scripted autopilot
(`steerToward`) and `main.js` paints twice then sets `window.__shotReady`;
`window.__shotDebug` reports money/health/wanted/in-car/car HP/position/cops
for probing. Capture with headless Chrome over CDP (wait for `__shotReady`),
NOT plain `--screenshot` (captures before the module paints). Chrome at
`~/workspace/makefun/.browser/chrome-linux64/chrome`; `node serve.ts --port 8080`
serves the game; Node v24.22.1. In this environment `--window-size=1280,720`
alone gives a 1280x577 viewport, so set `Emulation.setDeviceMetricsOverride`
(1280x720, scale 1) before navigating to get true 1280x720 frames.
