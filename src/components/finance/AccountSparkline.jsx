import { useMemo } from 'react'
import { getAccountBalanceOnDate } from '../../utils/financeUtils'

export default function AccountSparkline({ account, transactions, width = 80, height = 32 }) {
  const points = useMemo(() => {
    // Collect dates from balance history + linked transactions
    const dateSet = new Set()
    for (const h of (account.balanceHistory || [])) dateSet.add(h.date)
    for (const tx of transactions) {
      if (tx.accountId === account.id || tx.toAccountId === account.id) dateSet.add(tx.date)
    }
    // Always include today
    dateSet.add(new Date().toISOString().split('T')[0])

    const dates = [...dateSet].sort()
    if (dates.length < 2) return []

    // Keep last 60 entries max
    const recent = dates.slice(-60)
    return recent.map(date => ({ date, value: getAccountBalanceOnDate(account, transactions, date) }))
  }, [account, transactions])

  if (points.length < 2) return null

  const values   = points.map(p => p.value)
  const minVal   = Math.min(...values)
  const maxVal   = Math.max(...values)
  const valRange = maxVal - minVal || 1

  const xAt = i => (i / (points.length - 1)) * width
  const yAt = v => height - 2 - ((v - minVal) / valRange) * (height - 4)

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(' ')
  const areaD = `${lineD} L${xAt(points.length - 1).toFixed(1)},${height} L0,${height} Z`

  const trend = values.at(-1) - values[0]
  const color = account.type === 'debt'
    ? (trend <= 0 ? '#10b981' : '#ef4444')   // debt: going down is good
    : (trend >= 0 ? '#10b981' : '#ef4444')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={areaD} fill={color} opacity={0.1} />
      <path d={lineD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xAt(points.length - 1)} cy={yAt(values.at(-1))} r={2} fill={color} />
    </svg>
  )
}
