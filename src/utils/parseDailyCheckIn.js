// Parses a free-form daily check-in utterance into:
//   matchedHabits — active habits whose names are mentioned in the speech
//   tasks         — structured tasks extracted from "also add a task…" clauses
//
// Examples:
//   "I woke up, weighed myself, took my creatine"
//     → matchedHabits: [{...Wake up}, {...Weigh myself}, {...Take creatine}]
//   "I meditated. Also add a task low priority finish assignment by thursday"
//     → matchedHabits: [{...Meditate}], tasks: [{title:"Finish assignment", dueDate:"...", priority:"low"}]

import { parseTaskInput } from './parseTaskInput'

const STOP_WORDS = new Set([
  'a','an','the','i','my','me','and','or','to','of','in','on','at','for',
  'with','is','it','that','this','by','be','as','up','am','are','was',
  'were','been','have','has','do','did','get','got','its','their','our',
])

const IRREGULAR = {
  woke:'wake',    woken:'wake',
  weighed:'weigh',
  took:'take',    taken:'take',
  started:'start',
  ran:'run',      running:'run',
  ate:'eat',      eating:'eat',   eaten:'eat',
  drank:'drink',  drinking:'drink', drunk:'drink',
  made:'make',    making:'make',
  went:'go',      going:'go',     gone:'go',
  slept:'sleep',  sleeping:'sleep',
  exercised:'exercise', exercising:'exercise',
  meditated:'meditate', meditating:'meditate',
  wrote:'write',  written:'write', writing:'write',
  read:'read',    reading:'read',
  tracked:'track', tracking:'track', tracks:'track',
  logged:'log',   logging:'log',
  completed:'complete', completing:'complete',
  finished:'finish',    finishing:'finish',
  checked:'check',      checking:'check',
  worked:'work',        working:'work',
  stretched:'stretch',  stretching:'stretch',
  walked:'walk',        walking:'walk',
  ran:'run',
  lifted:'lift',        lifting:'lift',
  cooked:'cook',        cooking:'cook',
  cleaned:'clean',      cleaning:'clean',
  journaled:'journal',  journaling:'journal',
  studied:'study',      studying:'study',
  practiced:'practice', practicing:'practice',
  consumed:'consume',
  weighed:'weigh',
}

function normalize(word) {
  const w = word.toLowerCase()
  if (IRREGULAR[w]) return IRREGULAR[w]
  return w.replace(/ing$/, '').replace(/ed$/, '').replace(/s$/, '')
}

function significantWords(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .map(normalize)
}

// Marks the start of a task-addition clause
const TASK_SPLIT_RE = /\b(?:also\s+)?(?:add(?:ing)?|create|log)\s+(?:a\s+)?(?:new\s+)?(?:task|reminder|to-?do)|\bremind\s+me\s+to\b/i

// Strip filler connector phrases that surround the actual task description
function preCleanTaskText(text) {
  let t = text.trim()
  const fillers = [
    /^that\s+is\s+(a\s+)?/i,
    /^and\s+it\s+is\s+to\s*/i,
    /^it\s+is\s+to\s*/i,
    /^it\s+is\s*/i,
    /^for\s+me\s+to\s*/i,
  ]
  // Strip any mid-sentence connectors too
  t = t.replace(/\band\s+it\s+is\s+to\s*/gi, ' ')
  t = t.replace(/\bit\s+is\s+to\s*/gi, ' ')
  // Then strip leading connectors iteratively
  let prev = null
  while (prev !== t) {
    prev = t
    for (const re of fillers) t = t.replace(re, '').trim()
  }
  return t.replace(/\s+/g, ' ').trim()
}

export function parseDailyCheckIn(rawText, habits) {
  const text = String(rawText || '').trim()
  if (!text) return { matchedHabits: [], tasks: [] }

  // Split at the first task-addition phrase
  const splitMatch = text.match(TASK_SPLIT_RE)
  let habitText = text
  const taskTexts = []

  if (splitMatch) {
    const idx = text.search(TASK_SPLIT_RE)
    habitText = text.slice(0, idx).trim()
    taskTexts.push(text.slice(idx + splitMatch[0].length).trim())
  }

  // Match habits whose title keywords appear in the speech
  const speechWords = new Set(significantWords(habitText))
  const activeHabits = (habits || []).filter(h => !h.archived)

  const matchedHabits = activeHabits.filter(habit => {
    const habitWords = significantWords(habit.title)
    return habitWords.length > 0 && habitWords.some(w => w.length > 2 && speechWords.has(w))
  })

  // Parse each task clause
  const tasks = taskTexts
    .map(t => parseTaskInput(preCleanTaskText(t)))
    .filter(t => t.title)

  return { matchedHabits, tasks }
}
