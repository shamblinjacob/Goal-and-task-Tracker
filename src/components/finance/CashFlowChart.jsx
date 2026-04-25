import { toMonthString } from '../../utils/dateUtils'

function fmt(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

export default function CashFlowChart({ transactions, height = 120 }) {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push({
      key:      toMonthString(d),
      label:    d.toLocaleDateString('en-US', { month: 'short' }),
      income:   0,
      expenses: 0,
    })
  }

  for (const tx of transactions) {
    const month = months.find(m => m.key === tx.date?.slice(0, 7))
    if (!month) continue
    if (tx.type === 'income')  month.income   += tx.amount
    else                       month.expenses += tx.amount
  }

  const maxVal = Math.max(...months.flatMap(m => [m.income, m.expenses]), 1)
  const padL = 36, padR = 8, padT = 8, padB = 24
  const totalW = 320
  const chartW = totalW - padL - padR
  const chartH = height - padT - padB
  const groupW = chartW / months.length
  const barW   = Math.min(groupW * 0.35, 14)

  function barH(val) { return (val / maxVal) * chartH }
  function x(i, offset) { return padL + i * groupW + groupW / 2 + offset }
  function y(val) { return padT + chartH - barH(val) }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${totalW} ${height}`} preserveAspectRatio="none">
      {/* Gridlines */}
      {[0.25, 0.5, 0.75, 1].map(f => {
        const yy = padT + chartH - f * chartH
        return (
          <line key={f} x1={padL} x2={totalW - padR} y1={yy} y2={yy}
            stroke="#f3f4f6" strokeWidth={1} />
        )
      })}

      {/* Y-axis labels */}
      {[0.5, 1].map(f => (
        <text key={f} x={padL - 3} y={padT + chartH - f * chartH + 3.5}
          textAnchor="end" fill="#9ca3af" fontSize={8}>
          {fmt(maxVal * f)}
        </text>
      ))}

      {months.map((m, i) => (
        <g key={m.key}>
          {/* Income bar */}
          {m.income > 0 && (
            <rect
              x={x(i, -barW - 1)} y={y(m.income)}
              width={barW} height={barH(m.income)}
              rx={2} fill="#10b981" opacity={0.85}
            />
          )}
          {/* Expense bar */}
          {m.expenses > 0 && (
            <rect
              x={x(i, 1)} y={y(m.expenses)}
              width={barW} height={barH(m.expenses)}
              rx={2} fill="#ef4444" opacity={0.75}
            />
          )}
          {/* Month label */}
          <text x={x(i, 0)} y={height - 5}
            textAnchor="middle" fill="#9ca3af" fontSize={9}>
            {m.label}
          </text>
        </g>
      ))}

      {/* Legend */}
      <g>
        <rect x={padL} y={2} width={7} height={7} rx={1} fill="#10b981" opacity={0.85} />
        <text x={padL + 10} y={9} fill="#6b7280" fontSize={8}>Income</text>
        <rect x={padL + 52} y={2} width={7} height={7} rx={1} fill="#ef4444" opacity={0.75} />
        <text x={padL + 62} y={9} fill="#6b7280" fontSize={8}>Expenses</text>
      </g>
    </svg>
  )
}
