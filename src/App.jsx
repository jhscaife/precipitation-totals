import { useState } from 'react'
import AddressAutocomplete from './components/AddressAutocomplete.jsx'
import ResultsPanel from './components/ResultsPanel.jsx'
import './App.css'

const today = new Date().toISOString().slice(0, 10)
const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)

export default function App() {
  const [address, setAddress] = useState(null)
  const [startDate, setStartDate] = useState(oneYearAgo)
  const [endDate, setEndDate] = useState(today)
  const [comparison, setComparison] = useState('none')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = address && startDate && endDate && startDate <= endDate && !loading

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

      <form onSubmit={handleSubmit} className="query-form">
        <AddressAutocomplete value={address} onSelect={setAddress} />

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
