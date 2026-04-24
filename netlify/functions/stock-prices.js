const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

// Fetch a Yahoo Finance session crumb + cookies needed for authenticated API calls
async function getYahooCrumb() {
  const pageRes = await fetch('https://finance.yahoo.com/', {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  const rawCookies = typeof pageRes.headers.getSetCookie === 'function'
    ? pageRes.headers.getSetCookie()
    : (pageRes.headers.get('set-cookie') || '').split(/,(?=[^ ])/)

  const cookies = rawCookies.map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...BROWSER_HEADERS, Cookie: cookies, Accept: 'text/plain' },
  })

  if (!crumbRes.ok) throw new Error(`crumb fetch failed: ${crumbRes.status}`)
  const crumb = (await crumbRes.text()).trim()
  if (!crumb || crumb.includes('<')) throw new Error('invalid crumb response')

  return { crumb, cookies }
}

// Primary: batch v7 quote endpoint (requires crumb)
async function fetchViaV7(tickers, crumb, cookies) {
  const symbols = tickers.map(t => encodeURIComponent(t)).join(',')
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&crumb=${encodeURIComponent(crumb)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName`

  const res = await fetch(url, {
    headers: { ...BROWSER_HEADERS, Cookie: cookies, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`v7 returned ${res.status}`)

  const data = await res.json()
  const quotes = data?.quoteResponse?.result || []
  const prices = {}
  for (const q of quotes) {
    prices[q.symbol] = {
      price:     q.regularMarketPrice,
      change:    q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      name:      q.shortName || q.symbol,
    }
  }
  return prices
}

// Fallback: individual v8 chart calls (no crumb needed, but one request per ticker)
async function fetchViaV8(tickers) {
  const results = await Promise.all(
    tickers.map(async ticker => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=2d`
      const res = await fetch(url, { headers: { ...BROWSER_HEADERS, Accept: 'application/json' } })
      if (!res.ok) return null
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) return null
      const prev  = meta.chartPreviousClose || meta.regularMarketPreviousClose || 0
      const price = meta.regularMarketPrice  || 0
      return [ticker, {
        price,
        change:    price - prev,
        changePct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        name:      meta.shortName || ticker,
      }]
    })
  )
  const prices = {}
  for (const r of results) {
    if (r) prices[r[0]] = r[1]
  }
  return prices
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { tickers } = await req.json()
    if (!Array.isArray(tickers) || tickers.length === 0) return Response.json({})

    const upper = tickers.map(t => t.toUpperCase())

    // Try authenticated v7 first
    try {
      const { crumb, cookies } = await getYahooCrumb()
      const prices = await fetchViaV7(upper, crumb, cookies)
      return Response.json(prices)
    } catch (e) {
      // Fall through to v8 fallback
    }

    // Fallback to v8 chart per ticker
    const prices = await fetchViaV8(upper)
    if (Object.keys(prices).length === 0) {
      return Response.json({ error: 'Could not fetch prices from Yahoo Finance. Try again in a few minutes.' }, { status: 502 })
    }
    return Response.json(prices)

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
