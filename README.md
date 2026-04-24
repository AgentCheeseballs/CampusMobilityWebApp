# IIT Delhi Campus Mobility Platform

A React + TypeScript responsive web application that helps IIT Delhi students compare travel options across campus -- walking, cycling, auto-rickshaws, and campus shuttle buses.

Built with **React 18**, **TypeScript**, **Tailwind CSS v4**, **Leaflet** (CartoDB Voyager tiles), **Motion** (animations), and **Recharts** (charts).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routing](#routing)
- [Screens & Features](#screens--features)
- [Achievements (25 Total)](#achievements-25-total)
- [Data Models](#data-models)
- [Campus Locations](#campus-locations)
- [Bus Shuttle System](#bus-shuttle-system)
- [Utility Functions](#utility-functions)
- [Auth System](#auth-system)
- [Branding & Design](#branding--design)

---

## Tech Stack

| Layer         | Technology                                   |
| ------------- | -------------------------------------------- |
| Framework     | React 18 + TypeScript                        |
| Routing       | React Router v7 (Data mode, `createBrowserRouter`) |
| Styling       | Tailwind CSS v4 + inline styles              |
| Maps          | Leaflet + React-Leaflet (CartoDB Voyager)    |
| Animations    | Motion (formerly Framer Motion)              |
| Charts        | Recharts (PieChart for Mobility Balance)     |
| Icons         | Lucide React                                 |
| UI Components | Radix UI primitives (shadcn/ui)              |
| Backend       | Supabase (Edge Functions + KV Store)         |
| Build         | Vite 6                                       |

---

## Project Structure

```
/src/app/
  App.tsx                        # Entry point (RouterProvider)
  routes.ts                      # Route definitions
  context/
    AuthContext.tsx               # Auth provider (user state, login/signup/logout)
  components/
    Root.tsx                      # Layout shell (PhoneShell + bottom nav + auth gate)
    LoginScreen.tsx               # Login & signup forms
    HomeScreen.tsx                # Map view with auto/bus tracking, ping, search
    ComparisonScreen.tsx          # Side-by-side travel mode comparison
    RouteDetailScreen.tsx         # Detailed route view with Leaflet map
    CheckpointScreen.tsx          # Live navigation with checkpoint progress
    ProfileScreen.tsx             # Profile stats, achievements, leaderboard
    EditProfileScreen.tsx         # Edit nickname, emoji, hostel, department, cycle
    IITDelhiMap.tsx               # Reusable Leaflet map component
    ui/                           # shadcn/ui component library (50+ components)
  data/
    mockData.ts                   # Campus locations, autos, buses, leaderboard, achievements
  utils/
    geo.ts                        # Haversine, distance, time, calorie, fare calculations
/supabase/functions/server/
  index.tsx                       # Hono web server (Edge Function)
  kv_store.tsx                    # Supabase KV storage utilities
```

---

## Routing

All routes are nested under the `Root` layout which provides the phone-frame shell and bottom navigation.

| Path             | Component           | Description                                      |
| ---------------- | ------------------- | ------------------------------------------------ |
| `/`              | `HomeScreen`        | Interactive campus map with autos, buses, ping    |
| `/compare`       | `ComparisonScreen`  | Compare walk vs cycle vs auto with slide-to-confirm |
| `/profile`       | `ProfileScreen`     | User stats, achievements grid, campus leaderboard |
| `/edit-profile`  | `EditProfileScreen` | Edit nickname, emoji, hostel, department, cycle   |
| `/route-detail`  | `RouteDetailScreen` | Detailed route view on Leaflet map                |
| `/checkpoint`    | `CheckpointScreen`  | Live navigation with real-time checkpoint tracking |

### Navigation Flow

```
LoginScreen (unauthenticated)
  |
  v
Root (authenticated) -- Bottom Nav Bar:
  |-- [Map]     --> HomeScreen
  |     |-- tap location --> Search / Route selection
  |     |-- tap auto --> Auto detail (5-sec ad gate)
  |     |-- "Compare" --> /compare
  |     |-- "Go" --> /route-detail or /checkpoint
  |
  |-- [Compare] --> ComparisonScreen
  |     |-- SlideToConfirm --> /checkpoint (walk or cycle)
  |
  |-- [Profile] --> ProfileScreen
        |-- "Edit" --> /edit-profile
        |-- Tab: My Stats (donut chart, stat grid, EV battery, achievements)
        |-- Tab: Leaderboard (podium + ranked list)
```

---

## Screens & Features

### 1. HomeScreen (`/`)
- **Interactive Leaflet map** with CartoDB Voyager tiles centered on IIT Delhi
- **Live auto-rickshaw markers** (5 mock autos) with seat availability badges
- **Campus shuttle bus markers** (2 buses: S1 Blue Line, S2 Green Line)
- **Bus stop markers** with route indicators
- **Ping system** -- animated radar pulse to "discover" nearby autos
- **Location search** -- search campus locations with distance/time preview
- **Auto detail bottom sheet** -- driver info, EV badge, rating, vehicle number
- **5-second ad gate** before showing auto details
- **Route preview** with walk/cycle/auto time estimates
- **Eco motivation banner** with rotating green travel facts

### 2. ComparisonScreen (`/compare`)
- **Origin/destination selector** from 12 campus locations
- **Side-by-side comparison cards** for Walk, Cycle, Auto
- **Fit Score system** -- composite score based on time, calories, CO2, cost
- **Detailed metrics**: time, distance, calories, CO2 saved, fare
- **Bus schedule info** with next departure times
- **SlideToConfirm component** -- native pointer-event slider to start eco trip
- **Swap origin/destination** button

### 3. ProfileScreen (`/profile`)
- **Profile header** with gradient background, avatar, department badge, roll number
- **Quick stats row**: Eco Score, Campus Rank, Streak, CO2 Saved
- **My Stats tab**:
  - Mobility Balance donut chart (Recharts PieChart)
  - 4-card stat grid (walked, cycled, auto rides, eco score)
  - EV Battery Fund progress bar (CO2 savings mapped to battery goal)
  - **25-achievement grid** (4 columns, tap for detail modal)
- **Leaderboard tab**:
  - Top 3 podium with gold/silver/bronze styling
  - Ranked list (20 entries) with department badges
  - Current user highlighted with maroon border
- **Achievement detail modal** with lock/unlock state

### 4. EditProfileScreen (`/edit-profile`)
- Edit **nickname**, **profile emoji** (24 options), **department**, **year**, **hostel**, **has cycle** toggle
- 12 departments, 7 year options, 15 hostel choices
- Animated save confirmation

### 5. RouteDetailScreen (`/route-detail`)
- Full Leaflet map with route polyline
- Walking/cycling route visualization
- Distance and time overlay

### 6. CheckpointScreen (`/checkpoint`)
- **Live navigation** with simulated GPS movement along route
- **Real-time progress tracking** -- elapsed time, distance covered, ETA
- **Horizontal checkpoint drawer** -- scrollable checkpoint list
- **Checkpoint completion** with on-time/late indicators
- **Integrated stats** -- calories burned, CO2 saved during trip
- **Celebration modal** on destination arrival (confetti-style)
- **Stats auto-update** via `updateStats()` on trip completion

### 7. Root Layout
- **Phone-frame container** for desktop viewing (390x844px with notch, status bar)
- **Bottom navigation** -- Map, Compare, Profile tabs with active indicators
- **Auth gate** -- shows LoginScreen when not authenticated
- **Loading splash** with IIT Delhi branding

---

## Achievements (25 Total)

### Walking Achievements (5)
| ID            | Icon | Label           | Description                          | Threshold |
| ------------- | ---- | --------------- | ------------------------------------ | --------- |
| `eco_starter` | `🌱` | Eco Starter     | Complete your first eco trip         | 1 km eco  |
| `first_steps` | `👣` | First Steps     | Walk your first 1 km on campus      | 1 km      |
| `walker_10`   | `🚶` | Walker 10K      | Walk a cumulative 10 km             | 10 km     |
| `walker_25`   | `🥾` | Trekker         | Walk a cumulative 25 km             | 25 km     |
| `walker_50`   | `🏃` | Distance Walker | Walk a cumulative 50 km             | 50 km     |

### Cycling Achievements (4)
| ID            | Icon | Label          | Description                          | Threshold |
| ------------- | ---- | -------------- | ------------------------------------ | --------- |
| `cyclist`     | `🚲` | Cyclist        | Cycle a cumulative 5 km             | 5 km      |
| `pedal_10`    | `🚴` | Pedal Power    | Cycle a cumulative 10 km            | 10 km     |
| `cyclist_25`  | `🏅` | Cycling Pro    | Cycle a cumulative 25 km            | 25 km     |
| `cyclist_50`  | `🏆` | Cycle Champion | Cycle a cumulative 50 km            | 50 km     |

### Streak Achievements (3)
| ID          | Icon | Label          | Description                          | Threshold |
| ----------- | ---- | -------------- | ------------------------------------ | --------- |
| `streak_7`  | `🔥` | Week Streak    | 7-day active streak                  | 7 days    |
| `streak_14` | `💥` | Fortnight Fire | 14-day active streak                 | 14 days   |
| `streak_30` | `🌟` | Monthly Blazer | 30-day active streak                 | 30 days   |

### Auto Rickshaw Achievements (2)
| ID        | Icon | Label        | Description                          | Threshold |
| --------- | ---- | ------------ | ------------------------------------ | --------- |
| `auto_5`  | `🛺` | Auto Rider   | Take 5 auto rides                    | 5 rides   |
| `auto_20` | `🚕` | Auto Veteran | Take 20 auto rides                   | 20 rides  |

### CO2 / Environmental Achievements (3)
| ID        | Icon | Label          | Description                          | Threshold |
| --------- | ---- | -------------- | ------------------------------------ | --------- |
| `co2_hero`| `🌍` | CO2 Hero       | Save 5 kg CO2 via eco travel         | 5 kg      |
| `co2_10`  | `🌳` | Green Guardian | Save 10 kg CO2                       | 10 kg     |
| `co2_25`  | `🌲` | Eco Champion   | Save 25 kg CO2                       | 25 kg     |

### Eco Score Achievements (4)
| ID          | Icon | Label       | Description                          | Threshold |
| ----------- | ---- | ----------- | ------------------------------------ | --------- |
| `eco_25`    | `⚡` | Eco Warrior | Reach 25 km eco score                | 25 km     |
| `eco_50`    | `🦾` | Eco Machine | Reach 50 km eco score                | 50 km     |
| `centurion` | `💯` | Centurion   | Reach 100 km eco score               | 100 km    |
| `eco_200`   | `💎` | Eco Legend  | Reach 200 km eco score               | 200 km    |

### Leaderboard Achievements (3)
| ID       | Icon | Label        | Description                          | Threshold   |
| -------- | ---- | ------------ | ------------------------------------ | ----------- |
| `top_10` | `🏆` | Top 10       | Appear in top 10 on leaderboard      | Rank <= 10  |
| `top_5`  | `🥇` | Campus Elite | Appear in top 5 on leaderboard       | Rank <= 5   |
| `top_3`  | `👑` | Podium Star  | Reach top 3 on leaderboard           | Rank <= 3   |

### Special Achievements (1)
| ID          | Icon | Label     | Description                          | Threshold |
| ----------- | ---- | --------- | ------------------------------------ | --------- |
| `ev_backer` | `🔋` | EV Backer | Fund 10% of an EV battery via trips  | 10 km eco |

---

## Data Models

### UserProfile
```typescript
{
  id: string;
  name: string;
  nickname?: string;
  email: string;
  rollNo: string;
  department: string;          // CSE, EE, ME, CE, CH, PH, BB, MA, etc.
  year: string;                // 1st Year ... PhD
  hostel?: string;             // Karakoram, Aravali, Himadri, etc.
  hasCycle?: boolean;
  profileEmoji?: string;
  avatar: string;              // 2-letter initials
  stats: {
    walkKm: number;
    cycleKm: number;
    autoRides: number;
    co2Saved: number;          // kg CO2
    streak: number;            // days
    ecoScore: number;          // walkKm + cycleKm
  };
  createdAt: string;
}
```

### MockAuto
```typescript
{
  id: number;
  lat: number; lng: number;
  seats: string;               // e.g. "2/3"
  seatsUsed: number; seatsTotal: number;
  driver: string;
  rating: number;
  vehicleNo: string;
  isEV: boolean;
}
```

### MockBus
```typescript
{
  id: number;
  lat: number; lng: number;
  routeNo: string;             // "S1" or "S2"
  destination: string;
  via: string;
  minutesToIITD: number;
  capacity: 'low' | 'medium' | 'high';
  color: string;
}
```

---

## Campus Locations

12 key campus points used for navigation and search:

| ID           | Name                     | Emoji | Coordinates           |
| ------------ | ------------------------ | ----- | --------------------- |
| `main_gate`  | Main Gate (Gate 1)       | `🏛️`  | 28.5482, 77.1931      |
| `lhc`        | Lecture Hall Complex     | `📚`  | 28.5456, 77.1928      |
| `library`    | Nalanda Library          | `📖`  | 28.5440, 77.1919      |
| `sac`        | SAC (Student Activity Centre) | `⚽` | 28.5478, 77.1951  |
| `metro`      | IIT Delhi Metro Station  | `🚇`  | 28.5450, 77.1874      |
| `sports`     | Sports Complex           | `🏃`  | 28.5408, 77.1922      |
| `karakoram`  | Karakoram Hostel         | `🏠`  | 28.5501, 77.1904      |
| `aravali`    | Aravali Hostel           | `🏠`  | 28.5428, 77.1898      |
| `bharti`     | Bharti Building (CSE)    | `💻`  | 28.5470, 77.1971      |
| `gate2`      | South Gate (Gate 2)      | `🚪`  | 28.5400, 77.1934      |
| `dogra`      | Dogra Hall               | `🏢`  | 28.5493, 77.1954      |
| `nilgiri`    | Nilgiri Hostel           | `🏠`  | 28.5436, 77.1899      |

**Default user location**: Aravali Hostel (28.5428, 77.1898)
**Campus center**: 28.5457, 77.1926

---

## Bus Shuttle System

### Routes

| Route | Name           | Color   | Stops                                          | Frequency | Loop Time |
| ----- | -------------- | ------- | ---------------------------------------------- | --------- | --------- |
| S1    | Blue Line S1   | #2563EB | Main Gate -> LHC Circle -> Bharti -> Hostel Area -> Main Gate | ~30 min   | 15 min    |
| S2    | Green Line S2  | #16A34A | Main Gate -> SAC Stop -> Bharti -> LHC Circle -> Main Gate   | ~30 min   | 12 min    |

### Bus Stops (5)

| ID              | Name            | Coordinates      | Routes   |
| --------------- | --------------- | ---------------- | -------- |
| `lhc_stop`      | LHC Circle      | 28.5456, 77.1930 | S1, S2   |
| `main_gate_stop`| Main Gate       | 28.5490, 77.1932 | S1, S2   |
| `hostel_stop`   | Hostel Area     | 28.5430, 77.1900 | S1       |
| `sac_stop`      | SAC Stop        | 28.5478, 77.1950 | S2       |
| `bharti_stop`   | Bharti Building | 28.5470, 77.1970 | S1, S2   |

### Departures
- **S1**: 07:30, 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 17:30, 18:00, 18:30, 19:00
- **S2**: 07:45, 08:15, 08:45, 09:15, 09:45, 10:15, 10:45, 11:15, 12:15, 13:15, 14:15, 15:15, 16:15, 17:15, 17:45, 18:15, 18:45, 19:15

---

## Utility Functions (`/src/app/utils/geo.ts`)

| Function             | Description                                    | Formula / Speed        |
| -------------------- | ---------------------------------------------- | ---------------------- |
| `haversine()`        | Straight-line distance between GPS coords (km) | Haversine formula      |
| `campusDistance()`    | Road-adjusted distance (x1.35 multiplier)      | haversine * 1.35       |
| `walkTime()`         | Walking time in minutes                        | 4.5 km/h               |
| `cycleTime()`        | Cycling time in minutes                        | 12 km/h                |
| `autoTime()`         | Auto time in minutes (+ 3 min wait)            | 20 km/h + 3 min        |
| `walkTimeSeconds()`  | Walking time in seconds                        | 4.5 km/h               |
| `cycleTimeSeconds()` | Cycling time in seconds                        | 12 km/h                |
| `autoTimeSeconds()`  | Auto time in seconds (+ 180s wait)             | 20 km/h + 180s         |
| `walkCalories()`     | Calories burned walking                        | 65 kcal/km             |
| `cycleCalories()`    | Calories burned cycling                        | 38 kcal/km             |
| `co2Saved()`         | CO2 saved vs petrol auto                       | 0.12 kg/km             |
| `autoFare()`         | Auto fare in INR                               | Rs 8/km (min Rs 15)    |
| `generateRoutePoints()` | Generate curved waypoints between two points | Sine-based perpendicular offset |

---

## Auth System

Currently uses **localStorage-based authentication** (pre-Supabase migration):

- Users stored in `localStorage` under key `iitd_mobility_users`
- Session tracked via `iitd_mobility_session`
- New accounts start with seed stats: 12.5 km walked, 6.2 km cycled, 3 auto rides, 2-day streak
- Supports login, signup, logout, `updateStats()`, and `updateProfile()`

### Departments Available
`CSE`, `EE`, `ME`, `CE`, `CH`, `PH`, `BB`, `MA`, `MS`, `HS`, `MnC`, `MT`, `TT`, `Design`

### Year Options
`1st Year`, `2nd Year`, `3rd Year`, `4th Year`, `5th Year (Dual)`, `PhD`, `Faculty`

### Hostels (15)
Karakoram, Aravali, Himadri, Jwalamukhi, Vindhyachal, Udaigiri, Nilgiri, Shivalik, Kailash, Zanskar, Girnar, Kumaon, Satpura, Nalanda (Girls), Day Scholar

---

## Branding & Design

| Element          | Value                                          |
| ---------------- | ---------------------------------------------- |
| Primary Color    | IIT Delhi Maroon `#8B1A1A`                     |
| Dark Gradient    | `#2C0A0A` to `#4A1212`                         |
| Accent Blue      | `#0EA5E9`                                      |
| Accent Indigo    | `#6366F1`                                      |
| Eco Green        | `#22C55E` / `#4ADE80`                          |
| Background       | `#F8FAFF` / `#F0F4FF`                          |
| Layout           | Responsive: desktop top nav + mobile bottom nav |
| Font             | Plus Jakarta Sans                              |
| Map Tiles        | CartoDB Voyager (light, clean style)            |

---

## Backend (Supabase Edge Functions)

**Server**: Hono web server at `/supabase/functions/server/index.tsx`
**Base path**: `/make-server-a578ca2f`
**Storage**: KV Store (`kv_store.tsx`) for flexible key-value persistence

### Current Endpoints

| Method | Path                              | Description   |
| ------ | --------------------------------- | ------------- |
| GET    | `/make-server-a578ca2f/health`    | Health check  |

> **Note**: The Supabase integration (auth routes for signup/profile/stats, real Supabase auth in AuthContext, removing demo accounts) was reverted and needs to be re-implemented.

---

## Mock Data

### Auto-Rickshaws (5)
| Driver         | Vehicle       | EV  | Rating | Location         |
| -------------- | ------------- | --- | ------ | ---------------- |
| Ramesh Kumar   | DL 1RA 2341   | Yes | 4.8    | Near Main Gate   |
| Suresh Yadav   | DL 1RA 8823   | Yes | 4.6    | Near Metro       |
| Prakash Lal    | DL 1RA 5512   | No  | 4.9    | Near LHC         |
| Vinod Singh    | DL 1RA 1190   | Yes | 4.7    | Near Karakoram   |
| Manoj Sharma   | DL 1RA 7743   | No  | 4.5    | Near Sports      |

### Leaderboard (20 students)
Pre-populated with students from departments CSE, EE, ME, CE, CH, PH, BB across all years. Eco scores range from ~28 km to ~247 km. The logged-in user is dynamically inserted and ranked.

---

## Live GPS Device Tracking (Arduino -> Laptop -> Supabase)

This flow lets your USB-connected Arduino GPS module drive the `LOCATE` marker in the map.

### 1) Run Supabase migration

Open Supabase SQL Editor and run:

- `supabase/migrations/002_device_locations.sql`

This creates the `device_locations` table and policies.

### 2) Configure bridge environment

Create a file named `.env.bridge` in project root by copying `.env.bridge.example` and fill values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GPS_DEVICE_ID` (default `arduino_gps_1`)
- `SERIAL_PORT` (example `COM3`)
- `BAUD_RATE` (example `9600`)

Important: never put `SUPABASE_SERVICE_ROLE_KEY` in frontend `.env`.

### 3) Install Python bridge dependencies

From project root:

```bash
pip install -r scripts/requirements.txt
```

### 4) Start GPS uploader (keep it running)

```bash
python scripts/gps_uploader.py
```

Expected log each second:

- `Uploaded: 28.545123, 77.192345`

### 5) Start web app

```bash
npm run dev
```

Open the local Vite URL (usually `http://localhost:5173`).

### 6) Use Locate

- Open map screen.
- Click `LOCATE`.
- App fetches latest row from `device_locations` for `GPS_DEVICE_ID`.
- If fresh (<10s old), map location updates to your GPS module.
- If stale/offline, app keeps current location and shows a warning.

### Troubleshooting

- If uploader says serial error: verify Arduino IDE serial monitor is closed, and `SERIAL_PORT` matches your board port.
- If uploader runs but map does not move: verify `GPS_DEVICE_ID` in `.env.bridge` matches `VITE_GPS_DEVICE_ID` (or default `arduino_gps_1`).
- If Supabase insert fails: re-check table exists and service role key is correct.