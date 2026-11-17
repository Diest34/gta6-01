# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Diest34/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Diest34/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Sunset Keys** — an original 2D top-down open-world crime game set in the fictional coastal city of Solmar Bay. Rook, a driver-for-hire, owes the fixer Sable one last season of driving: five story jobs, then the debt is gone. Explore the city on foot and by car, steal cars (parked or from traffic), dodge the Solmar Bay police as your wanted stars climb, fight rival crews with fists and a pistol, and earn cash from missions and taxi fares.

The city has six districts (Palmetto Heights, Coral Market, Old Cannery, Harbor Point, Marina Row, Dune Strip), a beach and a harbour, 14 traffic cars, 26 pedestrians, parks and palms, a day clock, and a live minimap. The HUD shows health, money, ammo, wanted stars, the clock, the district, and the current mission objective. Progress saves to localStorage — pause or finish a mission and you can continue later. All sound is synthesised with WebAudio (engine hum, sirens, gunshots, jingles); there are no audio files and no network requests. Everything is original: no borrowed city, character, or brand names.

The five jobs: **1 · First Fare** ($150, steal a car and run a taxi fare), **2 · Hot Delivery** ($250, a 75-second package run), **3 · Getaway Driver** ($400, meet the crew and lose a 2-star heat), **4 · The Courier** ($500, ram a rival courier off the road and grab his case), **5 · The Harbor Job** ($1,000, steal an armored Mule and bring it home under 3 stars). After the story, repeatable taxi fares keep paying. See VERIFICATION.md for what was checked and the design notes.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Requires Node.js 22.18+.

Controls: WASD / arrows move and drive, E enter or steal a car (and get out), F punch, mouse aim + click (or K) shoot, R buy 12 rounds for $10, P or Esc pause (saves), Enter start / continue, N new game on the title screen.

To hand the entry in (the program the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Running it twice produces byte-identical output.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qdjpn7xw&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
