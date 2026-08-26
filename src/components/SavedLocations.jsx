export default function SavedLocations({ locations, onSelect, onRemove }) {
  if (locations.length === 0) return null

  return (
    <div className="saved-locations">
      <span className="saved-locations-label">Saved</span>
      <div className="saved-locations-chips">
        {locations.map((loc) => (
          <span className="saved-chip" key={loc.id}>
            <button type="button" onClick={() => onSelect(loc)} title={loc.label}>
              {loc.name}
            </button>
            <button
              type="button"
              className="saved-chip-remove"
              aria-label={`Remove ${loc.name}`}
              onClick={() => onRemove(loc.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
