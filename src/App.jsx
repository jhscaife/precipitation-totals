import { useState } from 'react'
import AddressAutocomplete from './components/AddressAutocomplete.jsx'
import ResultsPanel from './components/ResultsPanel.jsx'
import SavedLocations from './components/SavedLocations.jsx'
import { sameLocation, useSavedLocations } from './hooks/useSavedLocations.js'
import './App.css'

const today = new Date().toISOString().slice(0, 10)
const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)

function defaultName(label) {
  return (label || '').split(',')[0].trim() || 'Saved location'
}

export default function App() {
  const [address, setAddress] = useState(null)
  const [addressResetKey, setAddressResetKey] = useState(0)
  const [startDate, setStartDate] = useState(oneYearAgo)
  const [endDate, setEndDate] = useState(today)
  const [comparison, setComparison] = useState('none')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savingName, setSavingName] = useState(null)

  const { locations: savedLocations, add: addSavedLocation, remove: removeSavedLocation } = useSavedLocations()
  const matchingSaved = address ? savedLocations.find((loc) => sameLocation(loc, address)) : null

  const canSubmit = address && startDate && endDate && startDate <= endDate && !loading

  function handleSelectSaved(loc) {
    setAddress({ label: loc.label, lat: loc.lat, lon: loc.lon })
    setAddressResetKey((k) => k + 1)
    setSavingName(null)
  }

  function handleConfirmSave() {
    const name = savingName.trim()
    if (!name) return
    addSavedLocation(name, address)
    setSavingName(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const params = new URLSearchParams({
        lat: String(address.lat),
        lon: String(address.lon),
        startDate,
        endDate,
        comparison,
      })
      const res = await fetch(`/api/precipitation?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
        return
      }
      setResult(data)
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Precipitation Totals</h1>
        <p className="subtitle">
          Historical rainfall &amp; snowfall-water-equivalent totals for any US address, from NOAA
          GHCN-Daily station data.
        </p>
      </header>

      <SavedLocations locations={savedLocations} onSelect={handleSelectSaved} onRemove={removeSavedLocation} />

      <form onSubmit={handleSubmit} className="query-form">
        <AddressAutocomplete
          key={addressResetKey}
          value={address}
          onSelect={(next) => {
            setAddress(next)
            setSavingName(null)
          }}
        />

        {address && (
          <div className="save-row">
            {matchingSaved ? (
              <button type="button" className="save-toggle saved" onClick={() => removeSavedLocation(matchingSaved.id)}>
                ★ Saved as "{matchingSaved.name}" — remove
              </button>
            ) : savingName === null ? (
              <button type="button" className="save-toggle" onClick={() => setSavingName(defaultName(address.label))}>
                ☆ Save this location
              </button>
            ) : (
              <div className="save-form">
                <input
                  type="text"
                  value={savingName}
                  onChange={(e) => setSavingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleConfirmSave()
                    } else if (e.key === 'Escape') {
                      setSavingName(null)
                    }
                  }}
                  placeholder="Name this location"
                  autoFocus
                />
                <button type="button" onClick={handleConfirmSave}>
                  Save
                </button>
                <button type="button" onClick={() => setSavingName(null)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        <div className="date-row">
          <div className="field">
            <label htmlFor="start">Start date</label>
            <input
              id="start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="end">End date</label>
            <input
              id="end"
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="comparison">Compare against</label>
          <select id="comparison" value={comparison} onChange={(e) => setComparison(e.target.value)}>
            <option value="none">No comparison</option>
            <option value="priorYear">Same period, prior year</option>
            <option value="avg3yr">Same period, average of past 3 years</option>
          </select>
        </div>

        <button type="submit" disabled={!canSubmit}>
          {loading ? 'Fetching precipitation data…' : 'Get precipitation totals'}
        </button>
      </form>

      {error && <p className="global-error">{error}</p>}
      {result && <ResultsPanel result={result} />}
    </div>
  )
}
