export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { tickers } = await req.json()
    if (!Array.isArray(tickers) || tickers.length === 0) return Response.json({})

    const symbols = tickers.map(t => encodeURIComponent(t.toUpperCase())).join(',')
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoalTracker/1.0)',
        'Accept': 'application/json',
      },
    })

    if (!res.ok) return Response.json({ error: `Yahoo Finance returned ${res.status}` }, { status: 502 })

    const data = await res.json()
    const quotes = data?.quoteResponse?.result || []

    const prices = {}
    for (const q of quotes) {
      prices[q.symbol] = {
        price:      q.regularMarketPrice,
        change:     q.regularMarketChange,
        changePct:  q.regularMarketChangePercent,
        name:       q.shortName || q.symbol,
      }
    }

    return Response.json(prices)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
