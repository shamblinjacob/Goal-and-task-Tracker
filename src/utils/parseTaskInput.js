// Best-effort natural-language parser for voice-captured tasks.
// Extracts due date and priority from common English phrasings, strips
// those phrases from the title, and returns a clean { title, dueDate, priority }.
//
// Examples:
//   "email landlord tomorrow"              → { title: "Email landlord", dueDate: "2026-04-28", priority: "medium" }
//   "urgent: call dentist"                 → { title: "Call dentist", dueDate: null, priority: "high" }
//   "submit expenses by friday"            → { title: "Submit expenses", dueDate: "2026-05-01", priority: "medium" }
//   "in 3 days pick up dry cleaning asap"  → { title: "Pick up dry cleaning", dueDate: "2026-04-30", priority: "high" }

import { toDateString } from './dateUtils'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

export function parseTaskInput(rawText) {
  let text = String(rawText || '').trim()
  if (!text) return { title: '', dueDate: null, priority: 'medium' }

  let priority = 'medium'
  let dueDate  = null

  // Priority — strip the phrase
  const HIGH_RE = /\b(urgent(ly)?|asap|right away|important|high[\s-]?priority)\b[:,]?\s*/gi
  const LOW_RE  = /\b(someday|whenever|low[\s-]?priority|no rush)\b[:,]?\s*/gi
  if (HIGH_RE.test(text)) { priority = 'high'; text = text.replace(HIGH_RE, '') }
  else if (LOW_RE.test(text)) { priority = 'low';  text = text.replace(LOW_RE, '') }

  // Date phrases — try most specific first, replace in place

  // "in N days/weeks"
  const inMatch = text.match(/\bin (\d+)\s*(days?|weeks?)\b/i)
  if (inMatch) {
    const n = Number(inMatch[1])
    const days = /week/i.test(inMatch[2]) ? n * 7 : n
    dueDate = dateOffset(days)
    text = text.replace(inMatch[0], '')
  }

  // ISO date "2026-04-30"
  if (!dueDate) {
    const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
    if (iso) { dueDate = iso[1]; text = text.replace(iso[0], '') }
  }

  // Day-of-week ("monday", "next monday")
  if (!dueDate) {
    const dow = text.match(/\b(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i)
    if (dow) {
      const target = DAY_NAMES.indexOf(dow[1].toLowerCase())
      const today  = new Date().getDay()
      let diff = target - today
      if (diff <= 0 || /next/i.test(dow[0])) diff += 7
      dueDate = dateOffset(diff)
      text = text.replace(dow[0], '')
    }
  }

  // "next week" / "this week"
  if (!dueDate) {
    if (/\bnext week\b/i.test(text)) { dueDate = dateOffset(7); text = text.replace(/\bnext week\b/i, '') }
    else if (/\bthis week\b/i.test(text)) {
      // End of this week (Friday)
      const today = new Date().getDay()
      const friday = today === 0 ? 5 : today <= 5 ? 5 - today : 0
      if (friday > 0) dueDate = dateOffset(friday)
      text = text.replace(/\bthis week\b/i, '')
    }
  }

  // "today", "tonight", "tomorrow"
  if (!dueDate) {
    if (/\btoday\b/i.test(text) || /\btonight\b/i.test(text)) {
      dueDate = dateOffset(0); text = text.replace(/\b(today|tonight)\b/i, '')
    } else if (/\btomorrow\b/i.test(text)) {
      dueDate = dateOffset(1); text = text.replace(/\btomorrow\b/i, '')
    }
  }

  // Clean up dangling prepositions/articles left behind by phrase removal
  let title = text
    .replace(/\s+(by|on|at|for|due)\s*(?=$|,|\.)/gi, '')
    .replace(/[\s,;:.\-]+/g, ' ')   // collapse whitespace + stray punctuation
    .replace(/^[\s,;:.\-]+|[\s,;:.\-]+$/g, '')
    .trim()

  if (title) title = title[0].toUpperCase() + title.slice(1)

  return { title, dueDate, priority }
}
