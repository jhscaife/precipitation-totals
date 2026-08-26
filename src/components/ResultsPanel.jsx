import StationBadge from './StationBadge.jsx'

function fmtInches(n) {
  if (n === null || n === undefined) return '—'
  return `${n.toFixed(2)}"`
}

function fmtDiff(n) {
  if (n === null || n === undefined) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}"`
}

function fmtRange(start, end) {
  return `${start} to ${end}`
}

export default function ResultsPanel({ result }) {
  const { main, comparison } = result

  return (
    <div className="results">
      <section className="result-card">
        <h2>Main period</h2>
        <p className="result-range">{fmtRange(main.startDate, main.endDate)}</p>
        <p className="result-total">{fmtInches(main.totalInches)}</p>
        <StationBadge station={main.station} coverage={main.coverage} incomplete={main.incomplete} />
      </section>

      {comparison && comparison.type === 'priorYear' && (
        <section className="result-card">
          <h2>Same period, prior year</h2>
          {comparison.error ? (
            <p className="result-error">{comparison.error}</p>
          ) : (
            <>
              <p className="result-range">{fmtRange(comparison.startDate, comparison.endDate)}</p>
              <p className="result-total">{fmtInches(comparison.totalInches)}</p>
              <p className={`result-diff ${comparison.diffInches >= 0 ? 'positive' : 'negative'}`}>
                {fmtDiff(comparison.diffInches)} vs. main period
              </p>
              <StationBadge
                station={comparison.station}
                coverage={comparison.coverage}
                incomplete={comparison.incomplete}
              />
            </>
          )}
        </section>
      )}

      {comparison && comparison.type === 'avg3yr' && (
        <section className="result-card">
          <h2>Same period, average of past 3 years</h2>
          <p className="result-total">{fmtInches(comparison.avgTotalInches)}</p>
          {comparison.diffInches !== null && (
            <p className={`result-diff ${comparison.diffInches >= 0 ? 'positive' : 'negative'}`}>
              {fmtDiff(comparison.diffInches)} vs. main period
            </p>
          )}
          {comparison.yearsAveraged < 3 && (
            <p className="result-warning">
              Only {comparison.yearsAveraged} of 3 years had usable data.
            </p>
          )}
          <div className="sub-periods">
            {comparison.periods.map((p) => (
              <div key={p.yearsBack} className="sub-period">
                <p className="sub-period-range">
                  {p.error ? `${p.yearsBack} year(s) back` : fmtRange(p.startDate, p.endDate)}
                </p>
                {p.error ? (
                  <p className="result-error">{p.error}</p>
                ) : (
                  <>
                    <p className="sub-period-total">{fmtInches(p.totalInches)}</p>
                    <StationBadge station={p.station} coverage={p.coverage} incomplete={p.incomplete} />
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
