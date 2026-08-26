export default function StationBadge({ station, coverage, incomplete }) {
  if (!station) return null
  return (
    <div className={`station-badge${incomplete ? ' incomplete' : ''}`}>
      <span className="station-name">{station.name || 'Unknown station'}</span>
      <span className="station-meta">
        {station.id} · {station.distanceMiles} mi away
        {station.state ? ` · ${station.state}` : ''}
      </span>
      {incomplete && (
        <span className="station-warning">
          Best available data only covers {Math.round(coverage * 100)}% of days in this period
        </span>
      )}
    </div>
  )
}
