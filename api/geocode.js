// Address autosuggest, merging two free/keyless geocoders:
//  - Photon (komoot.io, OSM-based): good incremental "as you type" matches,
//    but OSM's US address-point coverage is patchy, especially rural roads.
//  - US Census Geocoder (TIGER/Line address ranges): authoritative interpolated
//    matches for real US street addresses, including rural roads Photon's OSM
//    data doesn't have — but it needs something that already looks like a
//    full address, not a partial fragment.
// Querying both and merging catches addresses either one alone would miss.

const PHOTON_URL = 'https://photon.komoot.io/api/'
const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPhotonResults(q) {
  const params = new URLSearchParams({ q, limit: '6', lang: 'en', countrycode: 'US' })
  const res = await fetchWithTimeout(`${PHOTON_URL}?${params.toString()}`, 4000)
  if (!res.ok) return []
  const data = await res.json()
  return (data.features || [])
    .filter((f) => Array.isArray(f.geometry?.coordinates))
    .map((f) => {
      const p = f.properties || {}
      const parts = [
        [p.housenumber, p.street].filter(Boolean).join(' '),
        p.city || p.district,
        p.state,
        p.postcode,
      ].filter(Boolean)
      const label = parts.length ? parts.join(', ') : p.name || q
      return { label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] }
    })
}

async function fetchCensusResults(q) {
  // The Census matcher interpolates along real address ranges rather than
  // doing substring autocomplete, so it only returns anything once the
  // query has a house number in it.
  if (!/\d/.test(q)) return []
  const params = new URLSearchParams({ address: q, benchmark: 'Public_AR_Current', format: 'json' })
  const res = await fetchWithTimeout(`${CENSUS_URL}?${params.toString()}`, 5000)
  if (!res.ok) return []
  const data = await res.json()
  const matches = data?.result?.addressMatches || []
  return matches.map((m) => ({
    label: m.matchedAddress,
    lat: m.coordinates.y,
    lon: m.coordinates.x,
  }))
}

function dedupe(results) {
  const seen = new Set()
  const deduped = []
  for (const r of results) {
    const key = `${r.lat.toFixed(4)},${r.lon.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(r)
  }
  return deduped
}

export default async function handler(req, res) {
  const q = (req.query.q || '').trim()
  if (q.length < 3) {
    res.status(200).json({ results: [] })
    return
  }

  const [censusOutcome, photonOutcome] = await Promise.allSettled([
    fetchCensusResults(q),
    fetchPhotonResults(q),
  ])

  const censusResults = censusOutcome.status === 'fulfilled' ? censusOutcome.value : []
  const photonResults = photonOutcome.status === 'fulfilled' ? photonOutcome.value : []

  if (censusOutcome.status === 'rejected' && photonOutcome.status === 'rejected') {
    res.status(502).json({ error: 'Both geocoders failed to respond.' })
    return
  }

  // Census matches are authoritative rooftop/interpolated hits, so list them first.
  const results = dedupe([...censusResults, ...photonResults]).slice(0, 8)
  res.status(200).json({ results })
}
