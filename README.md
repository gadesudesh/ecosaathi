# EcoSaathi — Smart Waste Collection for Cleaner Communities

EcoSaathi is an intelligent waste collection and route optimization platform built for smart cities and cleaner neighborhoods. It connects residents, collection crews, and municipal administrators through dynamic priority scoring, interactive geospatial mapping, and priority-aware collection route optimization.

---

## 🌟 Problem Statement & Solution

### The Problem
Traditional municipal waste management suffers from static, rigid collection schedules. Bins overflow in critical areas while trucks follow fixed, inefficient paths regardless of urgency or waiting time. Residents have zero visibility into collection progress, and collection crews waste fuel driving arbitrary routes.

### The Solution: EcoSaathi
EcoSaathi provides a dynamic, priority-driven collection system:
1. **Residents** report waste pickups with precise geospatial coordinates and photos.
2. **EcoSaathi Engine** dynamically calculates priority scores based on waste type hazard, quantity, urgency, and waiting time.
3. **Administrators** monitor citywide operations, analyze cluster hotspots, and assign pickups to crews.
4. **Collection Crews** receive a **Priority-Aware Smart Route** that balances urgency, waiting time, and road distance, with step-by-step turn guidance and live progress updating.
5. **Direct Coordination:** Residents can directly call or message their assigned crew via WhatsApp once dispatched.

---

## 🏗️ System Architecture

```text
       ┌────────────────────────┐
       │   React 18 + Vite SPA  │
       │ (TailwindCSS + Leaflet)│
       └───────────┬────────────┘
                   │ HTTPS / REST (JWT)
                   ▼
       ┌────────────────────────┐
       │   Express.js API Engine │
       │  (Node.js + Route Svc)  │
       └─────┬────────────┬─────┘
             │            │
             ▼            ▼
  ┌──────────────────┐  ┌────────────────────────┐
  │  MongoDB Atlas   │  │  Geoapify Routing API  │
  │ (Data & State)   │  │  (Real Road Navigation)│
  └──────────────────┘  └────────────────────────┘
```

- **Frontend:** React 18, Vite, React Router 6, React-Leaflet, TailwindCSS, Lucide Icons, Recharts.
- **Backend:** Node.js, Express.js, Mongoose, JWT authentication, bcryptjs, CORS.
- **Database:** MongoDB Atlas (Cloud Cluster).
- **Maps & Routing:** Leaflet, OpenStreetMap, Geoapify Routing API (drive mode).

---

## 👥 User Roles & Portals

| Role | Access Scope | Core Capabilities |
| :--- | :--- | :--- |
| **Resident** | `/resident` | Submit waste requests, pick location on interactive map, track real-time collection stages, cancel requests, and contact assigned crew via Call / WhatsApp. |
| **Collection Crew** | `/crew` | View assigned pickup queue, follow priority-aware smart route with numbered sequence on Leaflet, execute "Start Collection" and "Complete Pickup". |
| **Administrator** | `/admin` | Complete operational command center, citywide requests map, crew dispatching, workload balancing, crew smart route inspection, and visual analytics. |

---

## 🧠 Smart Priority Engine

Requests are scored on a scale of `0 – 100` and categorized into `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`:

$$\text{Priority Score} = \text{Urgency Weight} + \text{Waste Type Hazard} + \text{Quantity Factor} + \text{Waiting Time Boost}$$

- **Urgency:** High (`+35`), Medium (`+20`), Low (`+10`)
- **Waste Type:** E-Waste (`+25`), Organic (`+20`), Mixed (`+18`), Construction (`+15`), Plastic (`+12`), Paper (`+8`)
- **Quantity:** Large (`+20`), Medium (`+12`), Small (`+5`)
- **Waiting Time:** Dynamic aging factor adding up to `+20` points as requests remain uncollected.
- **Critical Threshold:** Scores `≥ 80` automatically escalate to `CRITICAL` priority.

---

## 🛣️ Priority-Aware Smart Route Optimizer

EcoSaathi uses a deterministic hybrid heuristic to balance waste hazard urgency with geographic travel efficiency.

### Heuristic Selection Formula
For each remaining stop from current position:

$$\text{Selection Score} = 0.60 \times \text{Normalized Priority} + 0.20 \times \text{Normalized Waiting Time} + 0.20 \times \text{Proximity Score}$$

Where:
- $\text{Normalized Priority} = \frac{\text{priorityScore}}{100}$
- $\text{Proximity Score} = \frac{1}{1 + \text{distanceKm}}$ (Haversine distance from current stop)

### Critical Operational Rules:
1. **In-Progress Lock:** An active pickup (`IN_PROGRESS`) is strictly locked as Stop #1.
2. **Critical Priority Protection:** High-hazard critical pickups are prioritized first, ordered by relative proximity.
3. **Geoapify Road Navigation:** After sequencing stops, ordered coordinates are sent to Geoapify Routing API to calculate actual road geometry, turn distance, and travel duration.
4. **Resilient Fallback:** If the external routing API encounters network errors or quota limits, EcoSaathi automatically falls back to straight-line Haversine sequencing without breaking the UI.
5. **Efficiency Comparison:** Evaluates baseline creation order against optimized order to calculate distance saved and percentage efficiency improvement.

---

## 📞 Resident ↔ Crew Contact Feature

When a crew is assigned (`ASSIGNED` or `IN_PROGRESS`):
- **Call Crew:** Triggers device dialer via `tel:+91...`.
- **Message on WhatsApp:** Opens WhatsApp click-to-chat with a pre-filled coordination message:
  `"Hello, I'm contacting you regarding my EcoSaathi pickup request #REQ-..."`
- **Privacy Protection:** Raw phone numbers are masked and never exposed as plain text in the resident interface.
- **Crew -> Resident:** Assigned crews can also directly call the resident for gate instructions.

---

## 🔑 Demo Accounts

Use these pre-configured accounts for hackathon evaluation:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@ecoroute.demo` | `admin123` | Full control center, crew management, analytics |
| **Collection Crew** | `crew@ecoroute.demo` | `crew123` | Crew Alpha lead (assigned active Mumbai pickups) |
| **Collection Crew** | `crew.bravo@ecoroute.demo` | `crew123` | Crew Bravo lead |
| **Resident** | `rahul@ecoroute.demo` | `resident123` | Rahul Sharma (Andheri West, active pickups) |
| **Resident** | `priya@ecoroute.demo` | `resident123` | Priya Mehta (Bandra West) |

*(Quick 1-click login buttons are also available directly on the login page).*

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster URI
- Geoapify API key (free tier from [geoapify.com](https://www.geoapify.com/))

### 2. Backend Setup
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=ecoroute_hackathon_super_secret_jwt_key_2026
GEOAPIFY_API_KEY=your_geoapify_api_key
DEPOT_LAT=19.0760
DEPOT_LNG=72.8777
CLIENT_URL=http://localhost:5173
```

Seed demo data:
```bash
npm run seed
```

Start backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
```

Start frontend development server:
```bash
npm run dev
```

Access application at `http://localhost:5173`.

---

## 🌐 Production Deployment Guide

### A. Backend Deployment (Render)
1. Push repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), create a new **Web Service**.
3. Set **Root Directory** to `server`.
4. Set **Build Command** to `npm install`.
5. Set **Start Command** to `npm start`.
6. Add Environment Variables:
   - `PORT=5000`
   - `MONGODB_URI=<your-atlas-uri>`
   - `JWT_SECRET=<your-jwt-secret>`
   - `GEOAPIFY_API_KEY=<your-geoapify-key>`
   - `DEPOT_LAT=19.0760`
   - `DEPOT_LNG=72.8777`
   - `CLIENT_URL=https://your-frontend.vercel.app`
7. Deploy service and copy your Render backend URL (e.g. `https://ecosaathi-api.onrender.com`).

### B. Frontend Deployment (Vercel)
1. In [Vercel Dashboard](https://vercel.com/), create a new Project and import your repository.
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Add Environment Variables:
   - `VITE_API_URL=https://ecosaathi-api.onrender.com`
   - `VITE_GEOAPIFY_API_KEY=<your-geoapify-key>`
5. Deploy project.
6. Verify SPA routes work cleanly via bundled `client/vercel.json` rewrites.

---

## ⚠️ Known Limitations & Scope Boundaries

- **Heuristic Optimization:** Uses a priority-aware greedy heuristic rather than a full multi-vehicle NP-hard VRP solver.
- **Turn-by-Turn GPS:** Relies on waypoints and road geometries generated via Geoapify Routing rather than real-time hardware telemetry.
- **Direct Calling / Messaging:** Utilizes native device `tel:` links and WhatsApp Click-to-Chat URLs rather than Twilio/SMS or an in-app socket chat.
- **Geographic Scope:** Demo coordinates and fallbacks are centered around the Greater Mumbai metropolitan area.
