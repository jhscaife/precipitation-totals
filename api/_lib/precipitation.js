// Fetches daily PRCP data from NOAA's Access Data Service and sums it over a
// date range, tracking coverage so callers can reject stations with too many
// missing days.

const DATA_SERVICE_URL = 'https://www.ncei.noaa.gov/access/services/data/v1'
const MIN_COVERAGE = 0.9

function daysBetweenInclusive(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.round((end - start) / 86400000) + 1
}

async function fetchDailyPrcp(stationId, startDate, endDate) {
  const params = new URLSearchParams({
    dataset: 'daily-summaries',
    stations: stationId,
    startDate,
    endDate,
    dataTypes: 'PRCP',
    format: 'json',
    units: 'standard',
  })
  const res = await fetch(`${DATA_SERVICE_URL}?${params.toString()}`)
  if (res.status === 404) {
    // NOAA's service 404s when a station has zero matching records.
    return []
  }
  if (!res.ok) {
    throw new Error(`NOAA data service error for ${stationId}: ${res.status} ${res.statusText}`)
  }
  const text = await res.text()
  if (!text.trim()) return []
  return JSON.parse(text)
}

// Evaluates one candidate station for one date range: pulls daily PRCP,
// sums it (inches), and reports coverage (fraction of days in range that
// had a reported value).
export async function evaluateStation(station, startDate, endDate) {
  const rows = await fetchDailyPrcp(station.id, startDate, endDate)
  const totalDays = daysBetweenInclusive(startDate, endDate)

  const seenDates = new Set()
  let totalInches = 0
  for (const row of rows) {
    const value = row.PRCP
    if (value === undefined || value === null || value === '') continue
    const inches = parseFloat(value)
    if (Number.isNaN(inches)) continue
    if (!seenDates.has(row.DATE)) {
      seenDates.add(row.DATE)
      totalInches += inches
    }
  }

  const coverage = totalDays > 0 ? seenDates.size / totalDays : 0
  return {
    totalInches: Math.round(totalInches * 100) / 100,
    coverage,
    daysReported: seenDates.size,
    totalDays,
  }
}

// Tries candidate stations nearest-first, accepting the first with >=90%
// coverage for the period. If none qualify, returns the best-effort result
// (highest coverage seen) flagged as incomplete rather than failing silently.
export async function findQualifyingStationResult(candidates, startDate, endDate, { maxAttempts = 6 } = {}) {
  let best = null

  for (const station of candidates.slice(0, maxAttempts)) {
    let evaluation
    try {
      evaluation = await evaluateStation(station, startDate, endDate)
    } catch {
      continue
    }
    if (evaluation.totalDays === 0) continue

    const result = { station, ...evaluation }
    if (!best || result.coverage > best.coverage) {
      best = result
    }
    if (evaluation.coverage >= MIN_COVERAGE) {
      return { ...result, incomplete: false }
    }
  }

  if (!best) return null
  return { ...best, incomplete: true }
}

export { MIN_COVERAGE }
