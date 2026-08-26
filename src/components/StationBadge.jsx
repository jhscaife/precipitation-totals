export default function StationBadge({ period }) {
  const { station, coverage, incomplete, daysReported, totalDays } = period
  if (!station) return null

  const missingDays = Number.isFinite(totalDays) && Number.isFinite(daysReported) ? totalDays - daysReported : null
  const hasGap = missingDays !== null && missingDays > 0

  return (
    <div className={`station-badge${incomplete ? ' incomplete' : ''}`}>
      <span className="station-name">{station.name || 'Unknown station'}</span>
      <span className="station-meta">
        {station.id} · {station.distanceMiles} mi away
        {station.state ? ` · ${station.state}` : ''}
      </span>
      {incomplete && (
        <span className="station-warning">
          Best available data only covers {Math.round(coverage * 100)}% of days in this period ({missingDays} of{' '}
          {totalDays} days missing) — no nearer qualifying station had better coverage
        </span>
      )}
      {!incomplete && hasGap && (
        <span className="station-note">
          {missingDays} of {totalDays} days missing ({Math.round(coverage * 100)}% reported) — likely NOAA reporting
          lag for the most recent days, not a data outage
        </span>
      )}
    </div>
  )
}
