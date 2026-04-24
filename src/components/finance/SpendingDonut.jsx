function fmtShort(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

export default function SpendingDonut({ data, size = 160, label = 'this month' }) {
  const total = data.reduce((s, d) => s + d.amount, 0)
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <p className="text-xs text-gray-400 text-center">No spending<br />logged yet</p>
    </div>
  )

  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.33
  const sw = size * 0.14
  const circumference = 2 * Math.PI * r

  let cumPct = 0
  const segments = data.map(d => {
    const pct    = d.amount / total
    const dash   = pct * circumference
    const offset = -(cumPct * circumference)
    cumPct += pct
    return { ...d, dash, offset }
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${seg.dash.toFixed(2)} ${circumference.toFixed(2)}`}
            strokeDashoffset={seg.offset.toFixed(2)}
          />
        ))}
      </g>
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#111827" fontSize={size * 0.1} fontWeight="700">
        {fmtShort(total)}
      </text>
      <text x={cx} y={cy + size * 0.09} textAnchor="middle" fill="#9ca3af" fontSize={size * 0.075}>
        {label}
      </text>
    </svg>
  )
}
