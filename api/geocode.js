// Proxies address autosuggest to Photon (komoot.io), a free OSM-based
// geocoder with no API key requirement, restricted to US results.

const PHOTON_URL = 'https://photon.komoot.io/api/'

export default async function handler(req, res) {
  const q = (req.query.q || '').trim()
  if (q.length < 3) {
    res.status(200).json({ results: [] })
    return
  }

  const params = new URLSearchParams({
    q,
    limit: '6',
    lang: 'en',
    countrycode: 'US',
  })

  try {
    const response = await fetch(`${PHOTON_URL}?${params.toString()}`)
    if (!response.ok) {
      res.status(502).json({ error: `Geocoder error: ${response.status}` })
      return
    }
    const data = await response.json()
    const results = (data.features || [])
      .filter((f) => Array.isArray(f.geometry?.coordinates))
      .map((f) => {
        const p = f.properties || {}
        const parts = [
          [p.housenumber, p.street].filter(Boolean).join(' '),
          p.city || p.district,
          p.state,
          p.postcode,
        ].filter(Boolean)
        const label = p.name && !parts.length ? p.name : parts.join(', ') || p.name || q
        return {
          label,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
        }
      })
    res.status(200).json({ results })
  } catch (err) {
    res.status(502).json({ error: `Geocoder request failed: ${err.message}` })
  }
}
