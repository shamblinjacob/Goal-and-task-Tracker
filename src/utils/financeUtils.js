// Compute shares and cost basis from trade history using average cost method.
// Falls back to manually-entered values if no trades exist.
export function computeHoldingStats(holding) {
  const trades = (holding.trades || []).slice().sort((a, b) => a.date.localeCompare(b.date))

  if (trades.length === 0) {
    const shares = holding.shares || 0
    const costBasis = holding.costBasis || 0
    return {
      shares,
      costBasis,
      avgCostPerShare: shares > 0 ? costBasis / shares : 0,
    }
  }

  let shares = 0
  let totalCost = 0

  for (const t of trades) {
    if (t.type === 'buy') {
      totalCost += t.shares * t.pricePerShare + (t.fee || 0)
      shares    += t.shares
    } else {
      const avgCost = shares > 0 ? totalCost / shares : 0
      totalCost -= avgCost * t.shares
      shares    -= t.shares
    }
  }

  shares    = Math.max(0, shares)
  totalCost = Math.max(0, totalCost)

  return {
    shares,
    costBasis:       totalCost,
    avgCostPerShare: shares > 0 ? totalCost / shares : 0,
  }
}
