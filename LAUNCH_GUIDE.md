# VinMap — Launch Guide
**Everything you need to do on your end to make the app fully live.**
No code changes required for Steps 1–2. Steps 3–7 involve editing data files.

---

## Overview

| Priority | Step | Effort | What it unlocks |
|----------|------|--------|-----------------|
| 🔴 Now | [1 — Get API keys](#step-1--get-api-keys) | 30 min | Live AI analysis, fire hotspots, real forest data |
| 🔴 Now | [2 — Real province data](#step-2--real-province-forestry-statistics) | 3–5 hrs | Accurate EUDR scores, risk scoreboard, investment scoring |
| 🟡 Soon | [3 — Verify fire heatmap](#step-3--verify-fire-heatmap) | 5 min | Confirm live VIIRS hotspots are showing |
| 🟡 Soon | [4 — Fix news URLs](#step-4--fix-news-article-urls) | 2–4 hrs | Credible sourcing, real external links |
| 🟢 Later | [5 — EUDR GLAD alerts](#step-5--eudr-glad-alerts-advanced) | Code task | Plot-level compliance, not just province aggregate |
| 🟢 Later | [6 — Crop scoring calibration](#step-6--crop-suitability-calibration) | Research task | Accurate investment scores |
| 🟢 Later | [7 — Supply chain routes](#step-7--supply-chain-routes) | Research task | Validated export flow weights |

---

## Step 1 — Get API Keys

You need **3 keys**. Groq is required for AI analysis. GFW and FIRMS are optional but unlock real data layers.

### 1a. Verify Groq key (already set — just confirm it's valid)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign in → **API Keys** in the left sidebar
3. Confirm your key is active (green status, not expired)
4. If expired: click **Create API Key** → copy the new key
5. Open `D:\vimap-vbiz\.env.local` and update:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
6. Test: run `npm run dev`, open the app, click **AI Insights** tab → **Generate AI Analysis** — you should see Groq-powered insights appear.

---

### 1b. Global Forest Watch API key

1. Go to [globalforestwatch.org/help/developers](https://www.globalforestwatch.org/help/developers/)
2. Click **Sign Up** (or log in if you have an account)
3. Navigate to **My GFW** → **API Keys**
4. Click **Generate API Key** — copy it
5. Add to `.env.local`:
   ```
   GFW_API_KEY=your_gfw_key_here
   ```
6. Restart the dev server (`Ctrl+C` then `npm run dev`)
7. The `/api/gfw` route now returns real province-level tree cover data automatically.

> **Free tier:** GFW API is free for non-commercial and research use. No credit card needed.

---

### 1c. NASA FIRMS fire hotspot key

1. Go to [firms.modaps.eosdis.nasa.gov/api](https://firms.modaps.eosdis.nasa.gov/api/)
2. Click **Register** — fill in your name, email, and intended use (research/education)
3. Check your email — NASA sends your **MAP_KEY** within a few minutes
4. Add to `.env.local`:
   ```
   FIRMS_MAP_KEY=your_firms_key_here
   ```
5. Restart the dev server
6. The fire heatmap layer now pulls live VIIRS satellite fire detections for Vietnam.

> **Free tier:** NASA FIRMS is completely free. The key is approved instantly.

---

### Your `.env.local` should now look like:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
GFW_API_KEY=xxxxxxxxxxxxxxxxxxxx
FIRMS_MAP_KEY=xxxxxxxxxxxxxxxxxxxx
```

---

## Step 2 — Real Province Forestry Statistics

> **This is the highest-impact task.** All EUDR scores, risk rankings, and investment signals are derived from `src/data/provinces.ts`. Currently these are modeled estimates — replacing them with real GFW numbers makes the entire app trustworthy.

### Where to get the data

**Source:** [globalforestwatch.org/dashboards/country/VNM](https://www.globalforestwatch.org/dashboards/country/VNM/)

This dashboard uses the **Hansen/UMD/Google/USGS/NASA** tree cover loss dataset — the gold standard for deforestation tracking.

### How to extract the numbers

**For each province:**

1. Go to the Vietnam GFW dashboard
2. Search or click on a province (e.g., **Dak Lak**)
3. Under **Tree Cover Loss** → select **Annual tree cover loss**
4. Download as CSV or read directly from the chart
5. You want two numbers per year (2001–2023):
   - **Tree cover** (hectares remaining) → `forestCover`
   - **Tree cover loss** (hectares lost that year) → `forestLoss`
6. Calculate `lossRate = forestLoss / forestCover` for each year

### Priority order (do these 8 provinces first — they drive 80% of EUDR risk)

| Priority | Province | Why |
|----------|----------|-----|
| 1 | **Dak Lak** | Largest coffee producer, highest deforestation pressure |
| 2 | **Dak Nong** | Rapid forest clearing for coffee/rubber since 2010 |
| 3 | **Gia Lai** | Major rubber and coffee, Central Highlands core |
| 4 | **Kon Tum** | High forest cover, significant recent loss |
| 5 | **Lam Dong** | Coffee, pine plantations, tourist region |
| 6 | **Binh Phuoc** | Rubber frontier, borders Cambodia |
| 7 | **Tay Ninh** | Rubber and cassava, EUDR-sensitive exports |
| 8 | **Dong Nai** | Industrial-agricultural transition |

### How to update the file

Open `src/data/provinces.ts`. Find a province entry — it looks like this:

```typescript
{
  id: 'dak_lak',
  name: 'Dak Lak',
  // ...
  forestCover: {
    2001: 608000,   // ← replace with real GFW number (hectares)
    2005: 580000,
    2010: 540000,
    2015: 490000,
    2020: 440000,
    2023: 415000,
  },
  forestLoss: {
    2001: 8200,     // ← annual loss in hectares
    2005: 9800,
    2010: 12000,
    2015: 11500,
    2020: 9800,
    2023: 8900,
  },
  lossRate: {
    2001: 0.0135,   // ← forestLoss / forestCover (as decimal)
    2005: 0.0169,
    2010: 0.0222,
    2015: 0.0235,
    2020: 0.0223,
    2023: 0.0214,
  },
```

**After replacing with real numbers, change:**
```typescript
// At the bottom of provinces.ts, change:
dataSource: 'modeled'
// to:
dataSource: 'gfw_hansen'
```

> **Tip:** You don't need every single year. The app interpolates between available data points. Having 2001, 2005, 2010, 2015, 2020, 2023 is enough.

### Spot-check your numbers

After updating, run `npm run dev` and:
- Open the **Statistics** tab for Dak Lak
- The forest loss chart should show a realistic decline curve
- The **ForestLoss** value in the stats panel should match your source data

---

## Step 3 — Verify Fire Heatmap

> **Requires Step 1c (FIRMS key) to be complete.**

1. Run `npm run dev` → open the app
2. Click the **heatmap** toggle in the header (or Legend panel)
3. In the current dry season (Feb–Apr): hotspots should cluster over:
   - Central Highlands (Dak Lak, Gia Lai border)
   - Mekong Delta (An Giang, Kien Giang)
   - Southern coastal strip
4. If you see scattered procedural points instead of clustered real ones — the FIRMS key isn't active yet. Double-check `.env.local` and restart the server.

> **Note:** Outside dry season (May–Nov), fewer hotspots are expected. That's normal.

---

## Step 4 — Fix News Article URLs

> **Effort: 2–4 hours.** Improves credibility significantly — real links replace the Google News search fallback.

### How the system works

In `src/data/news-articles.ts`, each article has:
```typescript
{
  isVerified: true,   // true = real event, find the real URL
  url: '',            // ← fill this in
}
```

When `url` is empty, the app shows a Google News search link for the article title. When `url` is filled in, it shows **"Read article"** instead.

### Workflow

1. Open `src/data/news-articles.ts`
2. Filter to `isVerified: true` articles (there are ~28)
3. For each one:
   - Copy the `title` and `source`
   - Google: `site:reuters.com "Vietnam deforestation"` (or the relevant outlet)
   - Find the matching article → copy its URL
   - Paste into `url: 'https://...'`
4. For `isVerified: false` articles (~27):
   - Either find a real equivalent article and mark it `isVerified: true`
   - Or remove the article entirely (reduce to a smaller, fully-verified set)

### Priority sources to search

| Outlet | Good for |
|--------|----------|
| reuters.com | EUDR policy, Vietnam trade |
| channelnewsasia.com | Southeast Asia forest news |
| vietnam.vn | Official Vietnamese forestry |
| globalforestwatch.org/blog | Forest loss data stories |
| mard.gov.vn | Ministry of Agriculture reports |

---

## Step 5 — EUDR GLAD Alerts (Advanced)

> **This is a code task — bring it back to me when you're ready.**

Currently the EUDR compliance check uses province-level annual loss rates. Real compliance requires **plot-level post-2020 alerts**.

**What this involves:**
- Subscribe to GFW GLAD-L alerts (requires GFW API key from Step 1b)
- When a user draws a polygon on the map, query the GLAD API for alerts within that polygon after 31 Dec 2020
- If any alert exists → flag as EUDR non-compliant for that specific parcel

**When to do this:** After Steps 1–4 are complete and the app is deployed. This upgrade takes the compliance score from "province estimate" to "plot-level evidence."

---

## Step 6 — Crop Suitability Calibration

> **Research task — improves scoring accuracy.**

The investment score uses crop suitability thresholds in `src/lib/scoring.ts`. You can calibrate these against the FAO's official data.

### How to calibrate

1. Go to [gaez.fao.org](https://gaez.fao.org/pages/viewer) → **Data Viewer**
2. Select:
   - **Theme:** Suitability and Attainable Yield
   - **Sub-theme:** Crop suitability index
   - **Crop:** Coffee Arabica (or Robusta, Rubber, etc.)
   - **Input level:** Intermediate
   - **Time period:** 2011–2040
3. Zoom into Vietnam — note which provinces are rated Very High / High / Medium / Low
4. Open `src/lib/scoring.ts` → find the `cropSuitabilityScore()` function
5. Adjust thresholds for rainfall, temperature, and soil to match GAEZ outputs

---

## Step 7 — Supply Chain Routes

> **Nice-to-have — these are visual/illustrative only.**

The arc lines in the map represent commodity export flows. They're currently estimated.

### To improve them:

1. Go to [customs.gov.vn](https://www.customs.gov.vn/index.jsp) — Vietnam Customs statistics
2. Download **Export statistics by province and commodity** (annual)
3. Open `src/data/supply-chains.ts`
4. Update the `weight` values on each route to reflect real export volume
5. You can also add/remove routes to match actual trade corridors

---

## Deploy to Vercel (when ready)

Once local dev is working:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
3. Vercel auto-detects Next.js — no config needed
4. Before deploying, add your environment variables:
   - Go to **Settings → Environment Variables**
   - Add `GROQ_API_KEY`, `GFW_API_KEY`, `FIRMS_MAP_KEY`
5. Click **Deploy**
6. Your app is live at `your-project.vercel.app`

> **Free tier:** Vercel's Hobby plan is free and handles the traffic level this app needs.

---

## Quick Reference — File Map

| What to edit | File |
|--------------|------|
| Province data (forest cover, loss, loss rate) | `src/data/provinces.ts` |
| News articles (URLs, isVerified) | `src/data/news-articles.ts` |
| Supply chain routes and weights | `src/data/supply-chains.ts` |
| Crop scoring thresholds | `src/lib/scoring.ts` |
| Environment variables | `.env.local` (never commit this file) |

---

## Checklist Summary

```
Step 1 — API Keys
  [ ] Verify Groq key is active at console.groq.com
  [ ] Register at GFW → add GFW_API_KEY to .env.local
  [ ] Register at NASA FIRMS → add FIRMS_MAP_KEY to .env.local
  [ ] Restart dev server and confirm AI analysis works

Step 2 — Province Data (priority provinces first)
  [ ] Dak Lak
  [ ] Dak Nong
  [ ] Gia Lai
  [ ] Kon Tum
  [ ] Lam Dong
  [ ] Binh Phuoc
  [ ] Tay Ninh
  [ ] Dong Nai
  [ ] Remaining 55 provinces
  [ ] Change dataSource: 'modeled' → 'gfw_hansen' for updated entries

Step 3 — Fire Heatmap
  [ ] Enable heatmap layer in app
  [ ] Confirm real VIIRS hotspots visible (not procedural scatter)

Step 4 — News URLs
  [ ] Fill in real URLs for all isVerified: true articles
  [ ] Remove or replace isVerified: false articles

Step 5 — Deploy
  [ ] Push to GitHub
  [ ] Import to Vercel
  [ ] Add env vars in Vercel dashboard
  [ ] Confirm live URL works

Step 6 — Advanced (bring back to Claude)
  [ ] EUDR GLAD alerts integration
  [ ] FAO GAEZ crop calibration
```
