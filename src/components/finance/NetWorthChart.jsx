import { useState, useMemo } from 'react'
import { buildNetWorthHistory } from '../../utils/financeUtils'

const RANGES = [
  { key: '30d', label: '30D' },
  { key: '6m',  label: '6M'  },
  { key: '1y',  label: '1Y'  },
  { key: '5y',  label: '5Y'  },
  { key: 'all', label: 'All' },
]

function fmt(n) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

function fmtDate(dateStr, range) {
  const d = new Date(dateStr + 'T12:00:00')
  if (range === '30d') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (range === 'all' || range === '5y') return d.toLocaleDateString('en-US', { year: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function NetWorthChart({ accounts, holdings, transactions }) {
  const [range, setRange] = useState('6m')

  const data = useMemo(
    () => buildNetWorthHistory(accounts, holdings, transactions, range),
    [accounts, holdings, transactions, range]
  )

  if (data.length < 2) return (
    <div className="text-center py-8">
      <p className="text-xs text-gray-400 leading-relaxed">
        Not enough data yet for a trend. Add transactions linked to accounts, or update account
        balances — the chart builds as you use the app.
      </p>
    </div>
  )

  const values   = data.map(d => d.value)
  const minVal   = Math.min(...values)
  const maxVal   = Math.max(...values)
  const valRange = maxVal - minVal || 1
  const current  = values.at(-1)
  const first    = values[0]
  const delta    = current - first
  const deltaPct = first !== 0 ? (delta / Math.abs(first)) * 100 : 0

  const W = 320, H = 140
  const pad = { t: 10, b: 26, l: 50, r: 10 }
  const cW  = W - pad.l - pad.r
  const cH  = H - pad.t - pad.b

  const xAt = i => pad.l + (i / (data.length - 1)) * cW
  const yAt = v => pad.t + (1 - (v - minVal) / valRange) * cH

  const lineD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(' ')
  const areaD = `${lineD} L${xAt(data.length - 1).toFixed(1)},${H - pad.b} L${xAt(0).toFixed(1)},${H - pad.b} Z`

  const color = delta >= 0 ? '#10b981' : '#ef4444'

  // Pick ~4 evenly-spaced x-axis labels
  const labelIdxs = Array.from({ length: 4 }, (_, i) => Math.round(i * (data.length - 1) / 3))
    .filter((v, i, a) => a.indexOf(v) === i)

  // Y-axis labels at min, mid, max
  const yLabels = [minVal, minVal + valRange / 2, maxVal]

  return (
    <div>
      {/* Header: current value + delta */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(current)}</div>
          <div className={`text-xs font-medium mt-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {delta >= 0 ? '+' : ''}{fmt(delta)} ({deltaPct.toFixed(1)}%) over period
          </div>
        </div>
        {/* Range selector */}
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`text-xs px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${range === r.key ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* Y-axis gridlines + labels */}
        {yLabels.map((v, i) => {
          const yy = yAt(v)
          return (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} stroke="#f3f4f6" strokeWidth={1} />
              <text x={pad.l - 4} y={yy + 3.5} textAnchor="end" fill="#9ca3af" fontSize={8}>{fmt(v)}</text>
            </g>
          )
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#nw-grad)" />

        {/* Line */}
        <path d={lineD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* End dot */}
        <circle cx={xAt(data.length - 1)} cy={yAt(current)} r={3.5} fill={color} />

        {/* X-axis labels */}
        {labelIdxs.map((idx, i) => (
          <text key={idx}
            x={xAt(idx)} y={H - 4}
            textAnchor={i === 0 ? 'start' : i === labelIdxs.length - 1 ? 'end' : 'middle'}
            fill="#9ca3af" fontSize={8}>
            {fmtDate(data[idx].date, range)}
          </text>
        ))}
      </svg>
    </div>
  )
}
