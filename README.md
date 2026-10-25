# 🚽💨 Fun Together — 3D Multiplayer River Rafting Game

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r182-black?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime%20%26%20DB-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A vibrant, arcade-style 3D multiplayer river rafting racing game inspired by party games! Players sit in a flat floating inflatable tube, aim by rotating around the tube's perimeter, and propel the raft forward using **continuous directional farts** with billowing cartoon green smoke puffs. Navigate curved, winding canyon flumes and dodge revolving circular hazards across 5 progressively challenging levels!

---

## 🎮 Game Features & Highlights

- **Floating Inflatable Raft ("Bowl")**: Modeled to lie flat and parallel on the water with a cream pontoon torus, lime-green inner deck mat, 8 coral grab pads, and dynamic water wake ripples.
- **Cute Cartoon 3D Animals**: Up to 4 players sit around the tube (🐻 Bear, 🐸 Frog, 🦛 Hippo, 🦏 Rhino) facing inward with floating overhead 3D nametags.
- **Directional Propulsion Physics**: Players can move around the perimeter of the tube (A/D or ◄/►) to aim their rears. Pressing or holding SPACE fires continuous directional farts, propelling the tube in the opposite direction.
- **Billowing Cartoon Green Smoke**: Real-time particle puff system emitting volumetric cartoon smoke clouds directly behind the active farting character.
- **Curved & Rounded Winding River Flume**: Smooth S-curve canyon flumes with rounded scooped troughs and alternating purple (`#7209B7`) and hot pink (`#F72585`) sawtooth bumper banks.
- **Circular Orbiting Hazards & Dynamic Obstacles**:
  - Revolving spiked naval buoys orbiting in circular paths with visible orbital water guide rings.
  - Interlocking dual counter-orbiting hazard vortexes.
  - High-speed spinning gates, moving barriers, barrels, and rocks.
- **5 Complete Levels with Progressive Difficulty**:
  - **Level 1**: *The First Flush* — Gentle introductory meanders, single circular orbiter, side barrels, and finish gate.
  - **Level 2**: *The Twisting Rapids* — Deeper S-curves with dual counter-orbiting hazards and tighter chicane gates.
  - **Level 3**: *The Whirlpool Churn* — Slalom river bends, fast spinning gates, and sweeping barriers.
  - **Level 4**: *The Wild Torrent* — High-speed canyon rapids with multiple revolving buoys and chicane chokepoints.
  - **Level 5**: *The Ultimate Flush* — Serpentine canyon grand finale with 6 orbiting hazard constellations and victory celebration!
- **Level Completion & Progression**: Passing the finish gate triggers victory fanfare, stats, and advances to the next level smoothly in both solo and multiplayer party rooms!
- **Zero-Bug Respawns & Fair Hitboxes**: Realistic 3D mesh hitboxes and 3-second spawn immunity prevent false collisions or instant re-crashes.
- **Real-Time Multiplayer Party System**:
  - Create Room generates a clean 6-character room code with 1-click clipboard copying.
  - Lobby ready-up check: Host cannot start until joining friends are ready.
  - Synchronized peer-to-peer gameplay powered by Supabase Realtime Broadcast.

---

## 🕹️ Controls

| Action | Keyboard | Touch / Onscreen HUD |
| :--- | :--- | :--- |
| **Move Around Tube (Aim Left)** | `A` or `ArrowLeft` | `◀` Onscreen Button |
| **Move Around Tube (Aim Right)** | `D` or `ArrowRight` | `▶` Onscreen Button |
| **Directional Fart (Single or Hold Turbo)** | `SPACE` or `F` | `💨 FART!` Button (Hold for Turbo) |
| **Bumper Bounce** | Steer into wall | Automatically bounces with splash sound |

---

## 📁 Repository Structure

```
fart_game/
├── client/                     # Frontend Vite + React + Three.js web app
│   ├── src/
│   │   ├── game/               # 3D R3F components (Bowl, Characters, GreenSmoke, LevelScene, FollowCamera)
│   │   ├── hooks/              # useMultiplayer.ts (Supabase Realtime + Colyseus fallback)
│   │   ├── lib/                # audio.ts (Procedural sound generator), supabase.ts (Client)
│   │   ├── shared/             # levels.ts (5 curved tracks & hazard definitions)
│   │   ├── store/              # gameStore.ts (Physics loop & state), authStore.ts
│   │   └── ui/                 # Dashboard, Lobby, AuthPage, HUD
│   ├── .env.example            # Environment variable template
│   ├── index.html              # Entry HTML
│   ├── package.json            # Client dependencies
│   └── vite.config.ts          # Vite build config
├── server/                     # Optional Colyseus stateful multiplayer backend
│   ├── src/                    # Room state, Colyseus schemas & physics
│   └── package.json
├── supabase_schema.sql         # Complete PostgreSQL schema & Realtime config
└── README.md                   # Project documentation & deployment guide
```

---

## 🛠️ Step 1: Supabase Setup (Database & Realtime)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Go to **SQL Editor** in the left sidebar.
3. Open [`supabase_schema.sql`](supabase_schema.sql) from this repository, copy its contents, paste them into the SQL Editor, and click **Run**.
4. The script creates:
   - `profiles` table (player display names, avatars, and guest stats).
   - `game_rooms` table (room codes, host IDs, level IDs, status).
   - `room_players` table (player seats, characters, and ready states).
   - `game_leaderboard` table (fastest completion times).
   - Full Row Level Security (RLS) policies allowing public anonymous gameplay.
   - Realtime publication `supabase_realtime` enabled for all tables.
5. Go to **Project Settings** -> **API** and copy:
   - **Project URL** (`https://xyzcompany.supabase.co`)
   - **anon / public key** (`eyJhbGciOi...`)

---

## 🚀 Step 2: Step-by-Step Vercel Deployment

Deploying the game to Vercel takes less than 2 minutes:

### 1. Push to GitHub
Make sure your latest code is pushed to your GitHub repository:
```bash
git remote add origin https://github.com/aibinjmca2527-dotcom/fart-game.git
git branch -M main
git push -u origin main
```

### 2. Import into Vercel
1. Go to [Vercel](https://vercel.com/) and sign in with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Locate `fart-game` in your GitHub repository list and click **Import**.

### 3. Configure Project Settings
- **Framework Preset**: Select `Vite`.
- **Root Directory**: Click **Edit** and set it to:
  ```
  client
  ```
  *(⚠️ Crucial: the frontend Vite app lives inside the `client/` directory)*.
- **Build Command**: `npm run build` (automatic).
- **Output Directory**: `dist` (automatic).

### 4. Set Environment Variables
Under the **Environment Variables** section, add your two Supabase keys:

| Key | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL (`https://your-id.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon / public API key |

### 5. Click Deploy!
- Click **Deploy**. Vercel will install dependencies, build the production bundle, and provide a live URL (e.g. `https://fart-game.vercel.app`).
- Open the live URL on desktop or mobile and enjoy real-time multiplayer river rafting!

---

## 💻 Local Development

To run the game locally on your computer:

```bash
# 1. Clone repository
git clone https://github.com/aibinjmca2527-dotcom/fart-game.git
cd fart-game/client

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and paste your Supabase URL & anon key

# 4. Start local development server
npm run dev
```

Visit `http://localhost:3000/` in your browser.

---

## 🔒 Security Best Practices

- `.env` files containing real API credentials are strictly ignored in `.gitignore` and are never committed to GitHub.
- Anonymous Supabase access is protected using Row Level Security (RLS) policies scoped only to party room operations.
- Audio sounds are generated completely in-browser via the Web Audio API without external asset downloads.

---

## 📜 License

MIT License. Have fun and fart together! 🚽💨
