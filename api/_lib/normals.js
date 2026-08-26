// Fetches NOAA's 1991-2020 Climate Normals (dataset=normals-daily) and sums
// the climatological daily precipitation normal across an arbitrary date
// range. Normals are published for a smaller subset of stations than daily
// PRCP observations, so several candidates may need to be tried.

const DATA_SERVICE_URL = 'https://www.ncei.noaa.gov/access/services/data/v1'
const NORMAL_DATATYPE = 'DLY-PRCP-NORMAL'
// Normals are climatological (year-agnostic, one value per day-of-year), but
// the API still wants a concrete date range. A leap year is used so a Feb 29
// normal comes back if the dataset publishes one; the year itself is
// discarded below — only the month-day of each returned row is kept.
const REF_YEAR = 2020

async function fetchDailyNormals(stationId) {
  const params = new URLSearchParams({
    dataset: 'normals-daily',
    stations: stationId,
    startDate: `${REF_YEAR}-01-01`,
    endDate: `${REF_YEAR}-12-31`,
    dataTypes: NORMAL_DATATYPE,
    format: 'json',
    units: 'standard',
  })
  const res = await fetch(`${DATA_SERVICE_URL}?${params.toString()}`)
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`NOAA normals service error for ${stationId}: ${res.status} ${res.statusText}`)
  }
  const text = await res.text()
  if (!text.trim()) return null
  const rows = JSON.parse(text)
  if (!Array.isArray(rows) || rows.length === 0) return null

  const byMonthDay = new Map()
  for (const row of rows) {
    const value = row[NORMAL_DATATYPE]
    if (value === undefined || value === null || value === '') continue
    const inches = parseFloat(value)
    if (Number.isNaN(inches)) continue
    const monthDay = String(row.DATE).slice(-5) // "MM-DD" out of "YYYY-MM-DD"
    byMonthDay.set(monthDay, inches)
  }
  return byMonthDay.size > 0 ? byMonthDay : null
}

function monthDay(date) {
  return date.toISOString().slice(5, 10)
}

// Sums the climatological normal across every calendar date in
// [startDate, endDate] by looking each date up by month-day, ignoring year
// (so this works for ranges spanning multiple years, or wrapping year-end).
// Feb 29 falls back to Feb 28's normal when the dataset has no leap-day value.
function sumNormalForRange(byMonthDay, startDate, endDate) {
  let total = 0
  let daysUsed = 0
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  while (cursor <= end) {
    const md = monthDay(cursor)
    const value = byMonthDay.get(md) ?? (md === '02-29' ? byMonthDay.get('02-28') : undefined)
    if (value !== undefined) {
      total += value
      daysUsed++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return { totalInches: Math.round(total * 100) / 100, daysUsed }
}

// Tries candidate stations nearest-first (the same candidate list used for
// the daily PRCP lookup) since only a subset of them will publish normals.
export async function findHistoricalNormal(candidates, startDate, endDate, { maxAttempts = 8 } = {}) {
  for (const station of candidates.slice(0, maxAttempts)) {
    let byMonthDay
    try {
      byMonthDay = await fetchDailyNormals(station.id)
    } catch {
      continue
    }
    if (!byMonthDay) continue
    const { totalInches, daysUsed } = sumNormalForRange(byMonthDay, startDate, endDate)
    if (daysUsed === 0) continue
    return { station, totalInches, daysUsed }
  }
  return null
}
