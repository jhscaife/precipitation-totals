// Loads and caches NOAA GHCN-Daily station metadata (ghcnd-stations.txt) and
// element inventory (ghcnd-inventory.txt), used to find the nearest station
// that actually reports PRCP for a given date range.

const STATIONS_URL = 'https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-stations.txt'
const INVENTORY_URL = 'https://www.ncei.noaa.gov/pub/data/ghcn/daily/ghcnd-inventory.txt'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// Module-scope cache: persists across warm invocations of the same
// serverless function instance, refetched on cold start / after TTL.
const cache = {
  stations: null, // Map<id, {id, lat, lon, elevation, state, name}>
  prcpInventory: null, // Map<id, {firstYear, lastYear}>
  fetchedAt: 0,
}

function parseStationsText(text) {
  const stations = new Map()
  for (const line of text.split('\n')) {
    if (line.length < 71) continue
    const id = line.slice(0, 11).trim()
    const lat = parseFloat(line.slice(12, 20))
    const lon = parseFloat(line.slice(21, 30))
    const elevation = parseFloat(line.slice(31, 37))
    const state = line.slice(38, 40).trim()
    const name = line.slice(41, 71).trim()
    if (!id || Number.isNaN(lat) || Number.isNaN(lon)) continue
    stations.set(id, { id, lat, lon, elevation, state, name })
  }
  return stations
}

function parsePrcpInventoryText(text) {
  const inventory = new Map()
  for (const line of text.split('\n')) {
    if (line.length < 45) continue
    const element = line.slice(31, 35).trim()
    if (element !== 'PRCP') continue
    const id = line.slice(0, 11).trim()
    const firstYear = parseInt(line.slice(36, 40), 10)
    const lastYear = parseInt(line.slice(41, 45), 10)
    if (!id || Number.isNaN(firstYear) || Number.isNaN(lastYear)) continue
    inventory.set(id, { firstYear, lastYear })
  }
  return inventory
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }
  return res.text()
}

export async function loadStationData() {
  const isFresh = cache.stations && Date.now() - cache.fetchedAt < CACHE_TTL_MS
  if (isFresh) {
    return { stations: cache.stations, prcpInventory: cache.prcpInventory }
  }

  const [stationsText, inventoryText] = await Promise.all([
    fetchText(STATIONS_URL),
    fetchText(INVENTORY_URL),
  ])

  cache.stations = parseStationsText(stationsText)
  cache.prcpInventory = parsePrcpInventoryText(inventoryText)
  cache.fetchedAt = Date.now()

  return { stations: cache.stations, prcpInventory: cache.prcpInventory }
}

const EARTH_RADIUS_MILES = 3958.8

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_MILES * c
}

// Returns candidate stations that plausibly cover [startYear, endYear] for
// PRCP, sorted nearest-first. A 1-year lag is allowed on lastYear since the
// inventory file can trail the most recent data by a bit.
export function findCandidateStations({ stations, prcpInventory, lat, lon, startYear, endYear, limit = 15 }) {
  const candidates = []
  for (const station of stations.values()) {
    const inv = prcpInventory.get(station.id)
    if (!inv) continue
    if (inv.firstYear > startYear) continue
    if (inv.lastYear < endYear - 1) continue
    const distanceMiles = haversineMiles(lat, lon, station.lat, station.lon)
    candidates.push({ ...station, distanceMiles })
  }
  candidates.sort((a, b) => a.distanceMiles - b.distanceMiles)
  return candidates.slice(0, limit)
}
