export default function ProgressBar({ value, color = '#3b82f6', height = 8, showLabel = false }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="w-full">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height, background: '#e5e7eb' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <div className="text-right text-xs text-gray-500 mt-1">{pct}%</div>
      )}
    </div>
  )
}
