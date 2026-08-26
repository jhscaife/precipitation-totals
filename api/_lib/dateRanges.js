// Shifts a YYYY-MM-DD date back by N years, using UTC to avoid timezone
// drift. Dates that don't exist in the target year (Feb 29) roll forward to
// Mar 1, matching native Date behavior.
function shiftYears(dateStr, yearsBack) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCFullYear(d.getUTCFullYear() - yearsBack)
  return d.toISOString().slice(0, 10)
}

export function priorYearPeriod(startDate, endDate) {
  return { startDate: shiftYears(startDate, 1), endDate: shiftYears(endDate, 1) }
}

export function pastThreeYearsPeriods(startDate, endDate) {
  return [1, 2, 3].map((yearsBack) => ({
    startDate: shiftYears(startDate, yearsBack),
    endDate: shiftYears(endDate, yearsBack),
    yearsBack,
  }))
}

export function yearRange(startDate, endDate) {
  return {
    startYear: new Date(`${startDate}T00:00:00Z`).getUTCFullYear(),
    endYear: new Date(`${endDate}T00:00:00Z`).getUTCFullYear(),
  }
}
