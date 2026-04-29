import { toDateString } from './dateUtils'

// Merchant name → category
const MERCHANT_MAP = {
  // food & dining
  chipotle: 'food', starbucks: 'food', 'mcdonalds': 'food', "mcdonald's": 'food',
  subway: 'food', 'taco bell': 'food', 'chick-fil-a': 'food', chickfila: 'food',
  panera: 'food', dominos: 'food', "domino's": 'food', 'pizza hut': 'food',
  'whole foods': 'food', kroger: 'food', publix: 'food', aldi: 'food',
  safeway: 'food', "trader joe's": 'food', 'trader joes': 'food',
  walmart: 'food', costco: 'food',
  doordash: 'food', 'uber eats': 'food', grubhub: 'food', instacart: 'food',
  // transport
  uber: 'transport', lyft: 'transport',
  shell: 'transport', exxon: 'transport', bp: 'transport', chevron: 'transport',
  speedway: 'transport', 'circle k': 'transport',
  // subscriptions
  netflix: 'subscriptions', spotify: 'subscriptions', hulu: 'subscriptions',
  'amazon prime': 'subscriptions', disney: 'subscriptions', 'disney+': 'subscriptions',
  max: 'subscriptions', 'hbo max': 'subscriptions',
  'apple music': 'subscriptions', 'apple tv': 'subscriptions',
  // shopping
  amazon: 'shopping', target: 'shopping', ebay: 'shopping', etsy: 'shopping',
  // health
  cvs: 'health', walgreens: 'health', rite: 'health',
  // entertainment
  amc: 'entertainment', fandango: 'entertainment', ticketmaster: 'entertainment',
}

function inferCategory(text) {
  const lower = text.toLowerCase()
  for (const [keyword, cat] of Object.entries(MERCHANT_MAP)) {
    if (lower.includes(keyword)) return cat
  }
  if (/restaurant|diner|cafe|coffee|lunch|dinner|breakfast|groceries|grocery|food|eat/i.test(lower)) return 'food'
  if (/gas|fuel|bus|train|transit|parking|toll/i.test(lower)) return 'transport'
  if (/gym|doctor|dentist|pharmacy|medicine|health|prescription/i.test(lower)) return 'health'
  if (/shop|store|mall/i.test(lower)) return 'shopping'
  if (/netflix|spotify|subscription|streaming|hulu/i.test(lower)) return 'subscriptions'
  if (/rent|mortgage|electric|water|internet|phone|utility|bill/i.test(lower)) return 'utilities'
  if (/movie|concert|game|sport|entertainment/i.test(lower)) return 'entertainment'
  return 'other'
}

function matchAccount(text, accounts) {
  if (!accounts.length) return null
  const lower = text.toLowerCase()
  // Type-based hints first (most common in speech)
  if (/credit card|credit|cc/.test(lower)) return accounts.find(a => a.type === 'debt') || null
  if (/debit|checking/.test(lower))        return accounts.find(a => a.type === 'checking') || null
  if (/savings|saving/.test(lower))        return accounts.find(a => a.type === 'savings') || null
  // Account name match (longer names first to avoid short-name false positives)
  const sorted = [...accounts].sort((a, b) => b.name.length - a.name.length)
  for (const acct of sorted) {
    if (lower.includes(acct.name.toLowerCase())) return acct
  }
  return null
}

// Parse a natural-language transaction utterance.
// Returns { type, amount, description, category, accountId } or null if nothing useful.
export function parseTransactionInput(rawText, accounts = []) {
  const text = String(rawText || '').trim()
  if (!text) return null

  const lower = text.toLowerCase()

  // Type: income or expense
  const incomeKws = ['earned', 'received', 'got paid', 'paycheck', 'deposited', 'income', 'refund', 'reimburs']
  const type = incomeKws.some(kw => lower.includes(kw)) ? 'income' : 'expense'

  // Amount: "$10.50", "10.50 dollars", "10 bucks"
  let amount = null
  const amtMatch = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)|(?<![a-z])([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?)/i)
  if (amtMatch) {
    amount = parseFloat((amtMatch[1] || amtMatch[2]).replace(/,/g, ''))
  }
  if (amount === null) {
    // Fallback: first standalone number
    const numM = text.match(/(?:^|\s)([\d]+(?:\.\d{1,2})?)(?=\s|$)/)
    if (numM) amount = parseFloat(numM[1])
  }

  // Merchant/description: text after "at/on/from/to/for", ending at "and/with/using/on my" or end
  let description = ''
  const mMatch = text.match(/\b(?:at|from|on|to|for)\s+([A-Za-z&'][A-Za-z0-9&'\s.-]{0,40}?)(?=\s+(?:and\b|with\b|using\b|on\s+my\b)|[,.]|$)/i)
  if (mMatch) {
    description = mMatch[1].trim()
  } else {
    // Strip noise and use remainder
    let cleaned = text
      .replace(/\$\s*[\d,]+(?:\.\d{1,2})?/g, '')
      .replace(/[\d,]+(?:\.\d{1,2})?(?:\s*(?:dollars?|bucks?))?/gi, '')
      .replace(/\b(?:i|me|my)\b/gi, '')
      .replace(/\b(?:spent|paid|bought|used|charged|earned|received|deposited|owe)\b/gi, '')
      .replace(/\b(?:credit\s*card|debit\s*card|credit|debit|checking|savings|bank)\b/gi, '')
      .replace(/\b(?:at|from|for|on|to|with|using|and|the|a|an)\b/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleaned) description = cleaned
  }

  if (description) {
    description = description.trim()
    description = description.charAt(0).toUpperCase() + description.slice(1)
  }

  const category  = type === 'income' ? 'paycheck' : inferCategory(description + ' ' + lower)
  const account   = matchAccount(text, accounts)

  return {
    type,
    amount,
    description,
    category,
    accountId: account?.id || null,
  }
}
