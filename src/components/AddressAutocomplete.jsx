import { useEffect, useRef, useState } from 'react'

export default function AddressAutocomplete({ value, onSelect }) {
  const [query, setQuery] = useState(value?.label || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleChange(e) {
    const next = e.target.value
    setQuery(next)
    onSelect(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (next.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(next)}`)
        const data = await res.json()
        setSuggestions(data.results || [])
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handlePick(result) {
    setQuery(result.label)
    setOpen(false)
    onSelect(result)
  }

  return (
    <div className="autocomplete" ref={containerRef}>
      <label htmlFor="address">Address</label>
      <input
        id="address"
        type="text"
        autoComplete="off"
        placeholder="Start typing a US address..."
        value={query}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {open && (
        <ul className="suggestions">
          {loading && <li className="suggestions-status">Searching...</li>}
          {!loading && suggestions.length === 0 && (
            <li className="suggestions-status">No matches</li>
          )}
          {!loading &&
            suggestions.map((s, i) => (
              <li key={`${s.lat}-${s.lon}-${i}`}>
                <button type="button" onClick={() => handlePick(s)}>
                  {s.label}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
