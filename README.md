# Precipitation Totals

Historical precipitation totals for a US address, sourced from NOAA's
GHCN-Daily station network.

## How it works

1. **Address autosuggest** — `/api/geocode` proxies [Photon](https://photon.komoot.io)
   (free, no API key, OSM-based), restricted to US results. Selecting a
   suggestion gives lat/lon directly, no separate geocoding step needed.
2. **Station matching** — `/api/precipitation` downloads and caches NOAA's
   [`ghcnd-stations.txt`](https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt)
   and [`ghcnd-inventory.txt`](https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-inventory.txt),
   finds stations whose PRCP inventory covers the requested years, and sorts
   them by distance (haversine, miles) from the address.
3. **Data + coverage check** — for the nearest qualifying station, it pulls
   daily PRCP from the
   [Access Data Service](https://www.ncei.noaa.gov/access/services/data/v1)
   (`dataset=daily-summaries`, `units=standard` for inches) and sums it. If
   fewer than 90% of days in the period have a reported value, it falls back
   to the next-nearest qualifying station instead of showing an incomplete
   total silently. This runs independently for the main period and each
   comparison period, so different periods can end up using different
   stations (shown per period in the UI).
4. **Comparison** — none, same period the prior year, or the average of the
   same period across the past three years.

## Local development

```bash
npm install
npm run dev        # Vite dev server on :5173, proxies /api to :3000
```

The `/api` functions are plain Vercel Node functions, so to exercise them
locally too, run `vercel dev` (from this directory) instead of/alongside
`npm run dev`, or `npx vercel dev --listen 3000`.

## Deploying to Vercel

1. [Add New Project](https://vercel.com/new) → import the `precipitation-totals`
   GitHub repo.
2. Framework preset: **Vite** (auto-detected). Root Directory: `./`.
3. No environment variables or API keys are required — NOAA and Photon are
   both free/keyless.
4. Deploy.

No secrets are used anywhere in this app.
