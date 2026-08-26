// Temporary diagnostic route: fetches NOAA's normals-daily dataset raw and
// returns it verbatim, so the exact response shape can be inspected without
// needing sandboxed network access to ncei.noaa.gov. Safe to delete once
// the real normals lookup is confirmed working.

const DATA_SERVICE_URL = 'https://www.ncei.noaa.gov/access/services/data/v1'

export default async function handler(req, res) {
  const station = req.query.station || 'USW00094728' // Central Park, NYC
  const year = req.query.year || '2020'

  const attempts = []
  for (const y of [year, '2010']) {
    const params = new URLSearchParams({
      dataset: 'normals-daily',
      stations: station,
      startDate: `${y}-01-01`,
      endDate: `${y}-01-05`,
      dataTypes: 'DLY-PRCP-NORMAL',
      format: 'json',
      units: 'standard',
    })
    const url = `${DATA_SERVICE_URL}?${params.toString()}`
    try {
      const response = await fetch(url)
      const text = await response.text()
      attempts.push({ url, status: response.status, ok: response.ok, bodyPreview: text.slice(0, 1500) })
    } catch (err) {
      attempts.push({ url, error: err.message })
    }
  }

  // Also try with no dataTypes filter, to see what field names actually exist.
  const paramsNoFilter = new URLSearchParams({
    dataset: 'normals-daily',
    stations: station,
    startDate: '2010-01-01',
    endDate: '2010-01-02',
    format: 'json',
    units: 'standard',
  })
  const urlNoFilter = `${DATA_SERVICE_URL}?${paramsNoFilter.toString()}`
  try {
    const response = await fetch(urlNoFilter)
    const text = await response.text()
    attempts.push({ url: urlNoFilter, status: response.status, ok: response.ok, bodyPreview: text.slice(0, 2000) })
  } catch (err) {
    attempts.push({ url: urlNoFilter, error: err.message })
  }

  res.status(200).json({ station, attempts })
}
