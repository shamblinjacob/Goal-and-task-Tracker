// Best-effort natural-language parser for voice-captured goals.
// Extracts category and target date from common phrasings, strips them from
// the title, and returns { title, description, category, targetDate }.
//
// Examples:
//   "Run a half marathon by October, health goal"
//     → { title: "Run a half marathon", category: "health", targetDate: "2026-10-31" }
//   "Learn Spanish by end of year, learning"
//     → { title: "Learn Spanish", category: "learning", targetDate: "2026-12-31" }
//   "Save 10000 dollars finance goal"
//     → { title: "Save 10000 dollars", category: "finance" }

import { toDateString } from './dateUtils'

const CATEGORY_KEYWORDS = {
  health:   ['health', 'fitness', 'exercise', 'workout', 'physical', 'weight', 'gym'],
  career:   ['career', 'work', 'job', 'professional', 'business'],
  personal: ['personal', 'life', 'self'],
  finance:  ['finance', 'financial', 'money', 'savings', 'invest', 'budget'],
  learning: ['learning', 'study', 'education', 'learn', 'skill', 'course', 'language'],
  other:    ['other'],
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december']

function detectCategory(text) {
  const lower = text.toLowerCase()
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const w of words) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) return { category: cat, matchedWord: w }
    }
  }
  return null
}

function lastDayOfMonth(year, monthIndex) {
  const d = new Date(year, monthIndex + 1, 0)
  return toDateString(d)
}

function detectTargetDate(text) {
  const lower = text.toLowerCase()
  const today = new Date()
  const year  = today.getFullYear()

  // "end of year" / "end of the year"
  let m = lower.match(/\bend of (?:the )?year\b/)
  if (m) return { targetDate: `${year}-12-31`, matchedText: m[0] }

  // "end of {month}"
  m = lower.match(/\bend of (?:the )?(january|february|march|april|may|june|july|august|september|october|november|december)\b/)
  if (m) {
    const mi = MONTHS.indexOf(m[1])
    const targetYear = mi < today.getMonth() ? year + 1 : year
    return { targetDate: lastDayOfMonth(targetYear, mi), matchedText: m[0] }
  }

  // "by {month} [day]" or "by the end of {month}"
  m = lower.match(/\bby (?:the end of )?(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{1,2}))?(?:[a-z]{2})?\b/)
  if (m) {
    const mi  = MONTHS.indexOf(m[1])
    const day = m[2] ? Number(m[2]) : null
    const targetYear = (mi < today.getMonth() || (mi === today.getMonth() && day && day < today.getDate()))
      ? year + 1 : year
    if (day) {
      const dd = String(day).padStart(2, '0')
      const mm = String(mi + 1).padStart(2, '0')
      return { targetDate: `${targetYear}-${mm}-${dd}`, matchedText: m[0] }
    }
    return { targetDate: lastDayOfMonth(targetYear, mi), matchedText: m[0] }
  }

  // "in N months/years"
  m = lower.match(/\bin (\d+)\s*(months?|years?)\b/)
  if (m) {
    const n = Number(m[1])
    const d = new Date(today)
    if (/year/.test(m[2])) d.setFullYear(d.getFullYear() + n)
    else                   d.setMonth(d.getMonth() + n)
    return { targetDate: toDateString(d), matchedText: m[0] }
  }

  // "by next year"
  if (/\bby next year\b/.test(lower)) {
    return { targetDate: `${year + 1}-12-31`, matchedText: 'by next year' }
  }

  // ISO date
  m = lower.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (m) return { targetDate: m[1], matchedText: m[0] }

  return null
}

export function parseGoalInput(rawText) {
  let text = String(rawText || '').trim()
  if (!text) return { title: '', description: '', category: 'personal', targetDate: '' }

  const dateMatch = detectTargetDate(text)
  const targetDate = dateMatch?.targetDate || ''
  if (dateMatch) text = text.replace(new RegExp(dateMatch.matchedText, 'i'), '')

  const catMatch = detectCategory(text)
  const category = catMatch?.category || 'personal'
  if (catMatch) {
    // Strip phrases like "health goal" / "fitness category" / "learning"
    text = text.replace(new RegExp(`\\b${catMatch.matchedWord}\\s+(goal|category)\\b`, 'i'), '')
    text = text.replace(new RegExp(`\\b(goal|category)\\s+${catMatch.matchedWord}\\b`, 'i'), '')
    text = text.replace(new RegExp(`,?\\s*\\b${catMatch.matchedWord}\\b\\s*$`, 'i'), '')
  }

  let title = text
    .replace(/\s+(by|on|for|due)\s*(?=$|,|\.)/gi, '')
    .replace(/[\s,;:.\-]+/g, ' ')
    .replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, '')
    .trim()

  if (title) title = title[0].toUpperCase() + title.slice(1)

  return { title, description: '', category, targetDate }
}
