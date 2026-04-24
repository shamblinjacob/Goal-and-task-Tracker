import { useState } from 'react'
import { useDataContext } from '../../context/DataContext'
import Icon from '../shared/Icon'
import Modal from '../shared/Modal'

const TYPES = [
  { value: 'checking',   label: 'Checking',   color: '#3b82f6' },
  { value: 'savings',    label: 'Savings',    color: '#10b981' },
  { value: 'investment', label: 'Investment', color: '#8b5cf6' },
  { value: 'debt',       label: 'Debt',       color: '#ef4444' },
  { value: 'other',      label: 'Other',      color: '#6b7280' },
]

const TYPE_META = Object.fromEntries(TYPES.map(t => [t.value, t]))

function fmt(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function AccountForm({ initial = {}, onSubmit }) {
  const [form, setForm] = useState({
    name:    initial.name    || '',
    type:    initial.type    || 'checking',
    balance: initial.balance ?? '',
  })
  function set(f, v) { setForm(prev => ({ ...prev, [f]: v })) }
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ ...form, balance: Number(form.balance) || 0 })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account name *</label>
        <input
          type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Chase Checking"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
          <input
            type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)}
            placeholder="0.00"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
      <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90" style={{ background: '#3b82f6' }}>
        {initial.name ? 'Save changes' : 'Add account'}
      </button>
    </form>
  )
}

function AccountRow({ account, onEdit, onDelete, onUpdateBalance }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(account.balance)
  const meta = TYPE_META[account.type] || TYPE_META.other
  const isDebt = account.type === 'debt'

  const history = account.balanceHistory || []
  const previous = history.length > 1 ? history[history.length - 2].balance : null
  const delta = previous !== null ? account.balance - previous : 0

  function submit(e) {
    e.preventDefault()
    onUpdateBalance(account.id, Number(val))
    setEditing(false)
  }

  return (
    <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-3">
      <div className="w-1 h-10 rounded-full" style={{ background: meta.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900 truncate">{account.name}</span>
          <span className="text-xs text-gray-400">{meta.label}</span>
        </div>
        {!editing ? (
          <button onClick={() => { setEditing(true); setVal(account.balance) }} className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer flex items-center gap-1.5">
            <span className={`font-semibold tabular-nums ${isDebt ? 'text-red-500' : 'text-gray-900'}`}>
              {isDebt ? '−' : ''}{fmt(Math.abs(account.balance))}
            </span>
            {delta !== 0 && (
              <span className={`text-xs ${((!isDebt && delta > 0) || (isDebt && delta < 0)) ? 'text-green-500' : 'text-red-500'}`}>
                {delta > 0 ? '+' : ''}{fmt(delta)}
              </span>
            )}
          </button>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-1.5">
            <input
              type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)} autoFocus
              className="w-24 text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 tabular-nums"
            />
            <button type="submit" className="text-xs text-blue-600 font-medium cursor-pointer">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 cursor-pointer">Cancel</button>
          </form>
        )}
      </div>
      <button onClick={() => onEdit(account)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 cursor-pointer transition-colors">
        <Icon name="edit" size={14} />
      </button>
      <button onClick={() => onDelete(account.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer transition-colors">
        <Icon name="trash" size={14} />
      </button>
    </div>
  )
}

function NetWorthSparkline({ accounts }) {
  // Aggregate balanceHistory across all accounts (excluding debt from positive net worth)
  const dateMap = new Map()
  for (const acc of accounts) {
    for (const entry of acc.balanceHistory || []) {
      const existing = dateMap.get(entry.date) || 0
      const contribution = acc.type === 'debt' ? -Math.abs(entry.balance) : entry.balance
      dateMap.set(entry.date, existing + contribution)
    }
  }
  const points = Array.from(dateMap.entries()).sort().map(([date, v]) => ({ date, v }))
  if (points.length < 2) return null

  const width = 280, height = 50
  const min = Math.min(...points.map(p => p.v))
  const max = Math.max(...points.map(p => p.v))
  const range = max - min || 1
  const xAt = i => (i / (points.length - 1)) * width
  const yAt = v => height - ((v - min) / range) * height
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(' ')
  const trend = points[points.length - 1].v - points[0].v

  return (
    <div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block">
        <path d={pathD} fill="none" stroke={trend >= 0 ? '#10b981' : '#ef4444'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function FinanceSection() {
  const { accounts, addAccount, updateAccount, updateAccountBalance, deleteAccount } = useDataContext()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  const assets = accounts.filter(a => a.type !== 'debt').reduce((s, a) => s + a.balance, 0)
  const debts  = accounts.filter(a => a.type === 'debt').reduce((s, a) => s + Math.abs(a.balance), 0)
  const netWorth = assets - debts

  function handleAdd(data) { addAccount(data); setShowForm(false) }
  function handleEdit(data) {
    const prevBalance = editing.balance
    updateAccount(editing.id, { name: data.name, type: data.type })
    if (Number(data.balance) !== prevBalance) updateAccountBalance(editing.id, data.balance)
    setEditing(null)
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="dollar" size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Finance</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
          >
            <Icon name="plus" size={12} /> Add account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-gray-400 mb-3 max-w-xs mx-auto">
              Track balances across checking, savings, investments, and debt. Update manually for now — automatic bank sync requires a paid integration.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
            >
              Add your first account
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <div className="text-xs text-gray-400">Net worth</div>
                <div className={`text-lg font-bold tabular-nums ${netWorth >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(netWorth)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Assets</div>
                <div className="text-lg font-bold text-green-600 tabular-nums">{fmt(assets)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Debt</div>
                <div className="text-lg font-bold text-red-500 tabular-nums">{fmt(debts)}</div>
              </div>
            </div>

            <NetWorthSparkline accounts={accounts} />

            <div className="space-y-2 mt-3">
              {accounts.map(a => (
                <AccountRow key={a.id} account={a} onEdit={setEditing} onDelete={deleteAccount} onUpdateBalance={updateAccountBalance} />
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Click a balance to update it. Changes are snapshotted daily so you can see your net worth trend.
            </p>
          </>
        )}
      </div>

      {showForm && <Modal title="Add account" onClose={() => setShowForm(false)}><AccountForm onSubmit={handleAdd} /></Modal>}
      {editing   && <Modal title="Edit account" onClose={() => setEditing(null)}><AccountForm initial={editing} onSubmit={handleEdit} /></Modal>}
    </>
  )
}
