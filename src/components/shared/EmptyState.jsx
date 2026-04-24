import Icon from './Icon'

export default function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-gray-400 text-xs mb-5 max-w-xs">{subtitle}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer hover:opacity-90"
          style={{ background: '#3b82f6' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
