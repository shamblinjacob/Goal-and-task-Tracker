export default function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-xs">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer"
          style={{ background: '#3b82f6' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
