const CATEGORY_COLORS = {
  health:   '#10b981',
  career:   '#3b82f6',
  personal: '#8b5cf6',
  finance:  '#f59e0b',
  learning: '#ec4899',
  other:    '#6b7280',
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function GoalProgressChart({ goal, width = 280, height = 72 }) {
  const color = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS.other
  const checkIns = goal.checkIns || []

  // Build timeline: [start at 0, ...each check-in, current progress now]
  const startTime = new Date(goal.createdAt).getTime()
  const nowTime   = Date.now()
  const points = [
    { t: startTime, v: 0 },
    ...checkIns.map(c => ({ t: new Date(c.date + 'T12:00:00').getTime(), v: c.progress })),
  ]
  // Add current point if latest checkIn isn't today
  const lastCheckInTime = checkIns.length ? new Date(checkIns[checkIns.length - 1].date + 'T12:00:00').getTime() : startTime
  if (nowTime - lastCheckInTime > 86400000) {
    points.push({ t: nowTime, v: goal.progress })
  } else if (points[points.length - 1].v !== goal.progress) {
    points.push({ t: nowTime, v: goal.progress })
  }

  const target = goal.targetDate ? new Date(goal.targetDate + 'T12:00:00').getTime() : nowTime
  const spanEnd = Math.max(nowTime, target)
  const spanRange = Math.max(1, spanEnd - startTime)

  const pad = 4
  const xAt = t => pad + ((t - startTime) / spanRange) * (width - pad * 2)
  const yAt = v => (height - pad) - (v / 100) * (height - pad * 2)

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(p.t).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${xAt(points[points.length-1].t).toFixed(1)},${height - pad} L${xAt(points[0].t).toFixed(1)},${height - pad} Z`

  const latest = points[points.length - 1]
  const previous = points[points.length - 2]
  const delta = previous ? latest.v - previous.v : 0

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block">
        {/* Grid lines */}
        {[25, 50, 75].map(v => (
          <line key={v} x1={pad} x2={width - pad} y1={yAt(v)} y2={yAt(v)} stroke="#f3f4f6" strokeWidth={1} strokeDasharray="2 3" />
        ))}
        {/* Today marker if target is in the future */}
        {goal.targetDate && spanEnd > nowTime && (
          <line x1={xAt(nowTime)} x2={xAt(nowTime)} y1={pad} y2={height - pad} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {/* Filled area under line */}
        <path d={areaD} fill={color} opacity={0.08} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={xAt(p.t)} cy={yAt(p.v)} r={i === points.length - 1 ? 3.5 : 2.5} fill="white" stroke={color} strokeWidth={1.5} />
        ))}
      </svg>

      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{formatDate(goal.createdAt)}</span>
        <span className="text-gray-500 font-medium">
          {latest.v}%
          {delta !== 0 && (
            <span className={`ml-1.5 ${delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          )}
        </span>
        <span>{goal.targetDate ? formatDate(goal.targetDate) : 'Today'}</span>
      </div>
    </div>
  )
}
