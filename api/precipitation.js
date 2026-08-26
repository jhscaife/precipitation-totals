import { loadStationData, findCandidateStations } from './_lib/stations.js'
import { findQualifyingStationResult } from './_lib/precipitation.js'
import { priorYearPeriod, pastThreeYearsPeriods, yearRange } from './_lib/dateRanges.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(str) {
  return DATE_RE.test(str) && !Number.isNaN(new Date(`${str}T00:00:00Z`).getTime())
}

async function resolvePeriod(stationData, lat, lon, startDate, endDate) {
  const { startYear, endYear } = yearRange(startDate, endDate)
  const candidates = findCandidateStations({
    ...stationData,
    lat,
    lon,
    startYear,
    endYear,
  })
  if (candidates.length === 0) return { error: 'No nearby NOAA station reports precipitation for that time range.' }

  const result = await findQualifyingStationResult(candidates, startDate, endDate)
  if (!result) return { error: 'No nearby NOAA station returned usable precipitation data for that time range.' }

  return {
    startDate,
    endDate,
    totalInches: result.totalInches,
    coverage: Math.round(result.coverage * 1000) / 1000,
    incomplete: result.incomplete,
    station: {
      id: result.station.id,
      name: result.station.name,
      state: result.station.state,
      distanceMiles: Math.round(result.station.distanceMiles * 10) / 10,
    },
  }
}

export default async function handler(req, res) {
  const { lat, lon, startDate, endDate, comparison } = req.query

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    res.status(400).json({ error: 'lat and lon are required numbers.' })
    return
  }
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    res.status(400).json({ error: 'startDate and endDate are required as YYYY-MM-DD.' })
    return
  }
  if (startDate > endDate) {
    res.status(400).json({ error: 'startDate must be on or before endDate.' })
    return
  }
  const comparisonType = comparison && comparison !== 'none' ? comparison : null
  if (comparisonType && !['priorYear', 'avg3yr'].includes(comparisonType)) {
    res.status(400).json({ error: 'comparison must be one of: none, priorYear, avg3yr.' })
    return
  }

  try {
    const stationData = await loadStationData()

    const main = await resolvePeriod(stationData, latNum, lonNum, startDate, endDate)
    if (main.error) {
      res.status(404).json({ error: main.error })
      return
    }

    let comparisonResult = null

    if (comparisonType === 'priorYear') {
      const period = priorYearPeriod(startDate, endDate)
      const resolved = await resolvePeriod(stationData, latNum, lonNum, period.startDate, period.endDate)
      comparisonResult = resolved.error
        ? { type: 'priorYear', error: resolved.error }
        : { type: 'priorYear', ...resolved, diffInches: Math.round((main.totalInches - resolved.totalInches) * 100) / 100 }
    } else if (comparisonType === 'avg3yr') {
      const periods = pastThreeYearsPeriods(startDate, endDate)
      const resolvedPeriods = []
      for (const period of periods) {
        const resolved = await resolvePeriod(stationData, latNum, lonNum, period.startDate, period.endDate)
        resolvedPeriods.push({ yearsBack: period.yearsBack, ...resolved })
      }
      const usable = resolvedPeriods.filter((p) => !p.error)
      const avgTotalInches =
        usable.length > 0
          ? Math.round((usable.reduce((sum, p) => sum + p.totalInches, 0) / usable.length) * 100) / 100
          : null
      comparisonResult = {
        type: 'avg3yr',
        periods: resolvedPeriods,
        yearsAveraged: usable.length,
        avgTotalInches,
        diffInches: avgTotalInches === null ? null : Math.round((main.totalInches - avgTotalInches) * 100) / 100,
      }
    }

    res.status(200).json({
      main,
      comparison: comparisonResult,
    })
  } catch (err) {
    res.status(502).json({ error: `Failed to fetch NOAA data: ${err.message}` })
  }
}
