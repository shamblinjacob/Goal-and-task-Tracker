// ── Holding stats from trades ─────────────────────────────────────────────────

export function computeHoldingStats(holding) {
  const trades = (holding.trades || []).slice().sort((a, b) => a.date.localeCompare(b.date))
  if (trades.length === 0) {
    const shares    = holding.shares    || 0
    const costBasis = holding.costBasis || 0
    return { shares, costBasis, avgCostPerShare: shares > 0 ? costBasis / shares : 0 }
  }
  let shares = 0, totalCost = 0
  for (const t of trades) {
    if (t.type === 'buy') {
      totalCost += t.shares * t.pricePerShare + (t.fee || 0)
      shares    += t.shares
    } else {
      const avg  = shares > 0 ? totalCost / shares : 0
      totalCost -= avg * t.shares
      shares    -= t.shares
    }
  }
  shares    = Math.max(0, shares)
  totalCost = Math.max(0, totalCost)
  return { shares, costBasis: totalCost, avgCostPerShare: shares > 0 ? totalCost / shares : 0 }
}

// ── Account balance helpers ───────────────────────────────────────────────────

export function computeAccountBalance(account, transactions) {
  return getAccountBalanceOnDate(account, transactions, new Date().toISOString().split('T')[0])
}

export function getAccountBalanceOnDate(account, transactions, date) {
  // If no openingBalance set, fall back to stored balance history
  if (account.openingBalance === undefined || account.openingBalance === null) {
    const history = (account.balanceHistory || []).filter(h => h.date <= date)
    if (history.length === 0) return account.balance || 0
    return history.slice().sort((a, b) => a.date.localeCompare(b.date)).at(-1).balance
  }

  let bal = account.openingBalance

  for (const tx of transactions) {
    if (!tx.date || tx.date > date) continue

    if (tx.type === 'transfer') {
      if (tx.accountId === account.id)   bal -= tx.amount
      if (tx.toAccountId === account.id) bal  = account.type === 'debt' ? bal - tx.amount : bal + tx.amount
    } else if (tx.accountId === account.id) {
      if (account.type === 'debt') {
        if (tx.type === 'expense') bal += tx.amount
      } else {
        if (tx.type === 'income')  bal += tx.amount
        if (tx.type === 'expense') bal -= tx.amount
      }
    }
  }
  return bal
}

// ── Holding value on a date ───────────────────────────────────────────────────

export function getHoldingValueOnDate(holding, date) {
  const history = (holding.valueHistory || [])
    .filter(h => h.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (history.length > 0) return history.at(-1).value

  // Fall back to cost basis reconstructed from trades
  const trades = (holding.trades || [])
    .filter(t => t.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (trades.length === 0) {
    return date >= (holding.createdAt || '').slice(0, 10) ? (holding.costBasis || 0) : 0
  }
  let shares = 0, totalCost = 0
  for (const t of trades) {
    if (t.type === 'buy') { totalCost += t.shares * t.pricePerShare + (t.fee || 0); shares += t.shares }
    else { const avg = shares > 0 ? totalCost / shares : 0; totalCost -= avg * t.shares; shares -= t.shares }
  }
  return Math.max(0, totalCost)
}

// ── Net worth history ─────────────────────────────────────────────────────────

export function buildNetWorthHistory(accounts, holdings, transactions, range) {
  const now      = new Date()
  const startStr = getRangeStart(range, now).toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  const dateSet = new Set([todayStr])

  for (const acc of accounts)
    for (const h of (acc.balanceHistory || []))
      if (h.date >= startStr) dateSet.add(h.date)

  for (const tx of transactions)
    if (tx.date >= startStr && tx.date <= todayStr) dateSet.add(tx.date)

  for (const h of holdings) {
    for (const v of (h.valueHistory || [])) if (v.date >= startStr) dateSet.add(v.date)
    for (const t of (h.trades    || [])) if (t.date >= startStr) dateSet.add(t.date)
  }

  const dates = [...dateSet].filter(d => d >= startStr && d <= todayStr).sort()
  if (dates.length === 0) return []

  return dates.map(date => {
    const acctValue = accounts.reduce((s, acc) => {
      const bal = getAccountBalanceOnDate(acc, transactions, date)
      return acc.type === 'debt' ? s - Math.max(0, bal) : s + bal
    }, 0)
    const investValue = holdings.reduce((s, h) => s + getHoldingValueOnDate(h, date), 0)
    return { date, value: acctValue + investValue }
  })
}

export function getRangeStart(range, now = new Date()) {
  const d = new Date(now)
  if (range === '30d') d.setDate(d.getDate() - 30)
  else if (range === '6m')  d.setMonth(d.getMonth() - 6)
  else if (range === '1y')  d.setFullYear(d.getFullYear() - 1)
  else if (range === '5y')  d.setFullYear(d.getFullYear() - 5)
  else d.setFullYear(2000)
  return d
}
