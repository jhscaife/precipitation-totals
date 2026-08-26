import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'precipitation-totals:saved-locations'

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(locations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations))
  } catch {
    // Storage unavailable (private browsing, quota) — saves just won't
    // persist across reloads; the in-memory state still works this session.
  }
}

export function useSavedLocations() {
  const [locations, setLocations] = useState(() => readStorage())

  useEffect(() => {
    writeStorage(locations)
  }, [locations])

  const add = useCallback((name, address) => {
    setLocations((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, label: address.label, lat: address.lat, lon: address.lon },
    ])
  }, [])

  const remove = useCallback((id) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id))
  }, [])

  return { locations, add, remove }
}

export function sameLocation(a, b) {
  if (!a || !b) return false
  return Math.abs(a.lat - b.lat) < 1e-4 && Math.abs(a.lon - b.lon) < 1e-4
}
