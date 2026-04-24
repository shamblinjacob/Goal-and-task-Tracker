import { useState, useMemo, useCallback } from 'react'
import { useDataContext } from '../../context/DataContext'
import { computeHoldingStats, computeAccountBalance } from '../../utils/financeUtils'
import Icon from '../shared/Icon'
import Modal from '../shared/Modal'
import ProgressBar from '../shared/ProgressBar'
import SpendingDonut from './SpendingDonut'
import CashFlowChart from './CashFlowChart'
import NetWorthChart from './NetWorthChart'
import AccountSparkline from './AccountSparkline'

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATS = [
  { value: 'food',          label: 'Food & Dining',    color: '#f59e0b' },
  { value: 'housing',       label: 'Housing',          color: '#3b82f6' },
  { value: 'transport',     label: 'Transport',        color: '#8b5cf6' },
  { value: 'health',        label: 'Health & Fitness', color: '#10b981' },
  { value: 'entertainment', label: 'Entertainment',    color: '#ec4899' },
  { value: 'shopping',      label: 'Shopping',         color: '#f97316' },
  { value: 'subscriptions', label: 'Subscriptions',    color: '#6366f1' },
  { value: 'utilities',     label: 'Utilities',        color: '#14b8a6' },
  { value: 'education',     label: 'Education',        color: '#a855f7' },
  { value: 'other',         label: 'Other',            color: '#6b7280' },
]

const INCOME_CATS = [
  { value: 'paycheck',          label: 'Paycheck',          color: '#10b981' },
  { value: 'freelance',         label: 'Freelance',         color: '#3b82f6' },
  { value: 'investment_income', label: 'Investment Income', color: '#8b5cf6' },
  { value: 'refund',            label: 'Refund',            color: '#f59e0b' },
  { value: 'other',             label: 'Other Income',      color: '#6b7280' },
]

const INVEST_ACCOUNT_TYPES = [
  { value: 'roth_ira', label: 'Roth IRA', color: '#10b981' },
  { value: 'taxable',  label: 'Taxable',  color: '#3b82f6' },
  { value: '401k',     label: '401(k)',   color: '#8b5cf6' },
  { value: 'hsa',      label: 'HSA',      color: '#f59e0b' },
  { value: 'other',    label: 'Other',    color: '#6b7280' },
]

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Checking',   color: '#3b82f6' },
  { value: 'savings',    label: 'Savings',    color: '#10b981' },
  { value: 'investment', label: 'Investment', color: '#8b5cf6' },
  { value: 'debt',       label: 'Debt',       color: '#ef4444' },
  { value: 'other',      label: 'Other',      color: '#6b7280' },
]

const RECUR_FREQS = [
  { value: 'weekly',    label: 'Weekly' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Monthly' },
  { value: 'yearly',    label: 'Yearly' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0)
}

function fmtK(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7)
}

function catMeta(type, category) {
  const list = type === 'income' ? INCOME_CATS : EXPENSE_CATS
  return list.find(c => c.value === category) || list[list.length - 1]
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

// ── Transaction Form ──────────────────────────────────────────────────────────

function TransactionForm({ initial = {}, onSubmit, accounts = [] }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    type:        initial.type        || 'expense',
    date:        initial.date        || today,
    description: initial.description || '',
    amount:      initial.amount      || '',
    category:    initial.category    || 'food',
    note:        initial.note        || '',
    recurring:   initial.recurring   || false,
    recurFreq:   (initial.recurring && initial.recurring.freq) || 'monthly',
    accountId:   initial.accountId   || '',
    toAccountId: initial.toAccountId || '',
  })

  function set(f, v) {
    setForm(prev => {
      const next = { ...prev, [f]: v }
      if (f === 'type') {
        next.category    = v === 'income' ? 'paycheck' : 'food'
        next.toAccountId = ''
      }
      return next
    })
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount) return
    if (form.type === 'transfer' && !form.toAccountId) return
    const data = {
      ...form,
      amount:      Math.abs(Number(form.amount)),
      recurring:   form.recurring ? { freq: form.recurFreq } : false,
      accountId:   form.accountId   || null,
      toAccountId: form.toAccountId || null,
    }
    delete data.recurFreq
    onSubmit(data)
  }

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  const assetAccounts = accounts.filter(a => a.type !== 'debt')
  const debtAccounts  = accounts.filter(a => a.type === 'debt')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {['expense', 'income', 'transfer'].map(t => (
          <button key={t} type="button" onClick={() => set('type', t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors capitalize ${form.type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)}
            placeholder="0.00" className={inputCls} required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
        <input type="text" value={form.description} onChange={e => set('description', e.target.value)}
          placeholder={
            form.type === 'income'   ? 'e.g. Bi-weekly paycheck' :
            form.type === 'transfer' ? 'e.g. Discover CC payment' :
            'e.g. Whole Foods'
          }
          className={inputCls} required />
      </div>

      {/* Account linking */}
      {form.type === 'transfer' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From account *</label>
            <select value={form.accountId} onChange={e => set('accountId', e.target.value)} className={inputCls + ' bg-white'} required>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To account *</label>
            <select value={form.toAccountId} onChange={e => set('toAccountId', e.target.value)} className={inputCls + ' bg-white'} required>
              <option value="">Select account</option>
              {accounts.filter(a => a.id !== form.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Affects account <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select value={form.accountId} onChange={e => set('accountId', e.target.value)} className={inputCls + ' bg-white'}>
              <option value="">None</option>
              {form.type === 'expense'
                ? accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                : assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
              }
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls + ' bg-white'}>
              {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {form.type !== 'transfer' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optional" className={inputCls} />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.recurring} onChange={e => set('recurring', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
              <span className="text-sm text-gray-700">Recurring</span>
            </label>
            {form.recurring && (
              <select value={form.recurFreq} onChange={e => set('recurFreq', e.target.value)}
                className="ml-2 flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                {RECUR_FREQS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      <button type="submit"
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
        style={{ background: form.type === 'transfer' ? '#8b5cf6' : '#3b82f6' }}>
        {initial.description ? 'Save changes' : form.type === 'transfer' ? 'Record transfer' : `Add ${form.type}`}
      </button>
    </form>
  )
}

// ── Holding Form ──────────────────────────────────────────────────────────────

function HoldingForm({ initial = {}, onSubmit }) {
  const [form, setForm] = useState({
    ticker:       initial.ticker       || '',
    name:         initial.name         || '',
    shares:       initial.shares       || '',
    costBasis:    initial.costBasis    || '',
    currentValue: initial.currentValue || '',
    accountType:  initial.accountType  || 'roth_ira',
  })
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.ticker.trim() && !form.name.trim()) return
    onSubmit({ ...form, name: form.name || form.ticker })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ticker / Symbol</label>
          <input type="text" value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())}
            placeholder="e.g. VTI, AAPL" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account type</label>
          <select value={form.accountType} onChange={e => set('accountType', e.target.value)} className={inputCls + ' bg-white'}>
            {INVEST_ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name / Description</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Vanguard Total Stock Market ETF" className={inputCls} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shares</label>
          <input type="number" min="0" step="any" value={form.shares} onChange={e => set('shares', e.target.value)}
            placeholder="0" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost basis</label>
          <input type="number" min="0" step="0.01" value={form.costBasis} onChange={e => set('costBasis', e.target.value)}
            placeholder="$0.00" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current value</label>
          <input type="number" min="0" step="0.01" value={form.currentValue} onChange={e => set('currentValue', e.target.value)}
            placeholder="$0.00" className={inputCls} />
        </div>
      </div>
      <p className="text-xs text-gray-400">Update "Current value" periodically to track gains/losses.</p>

      <button type="submit"
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
        style={{ background: '#3b82f6' }}>
        {initial.ticker ? 'Save changes' : 'Add holding'}
      </button>
    </form>
  )
}

// ── Account Form (balance accounts) ──────────────────────────────────────────

function AccountForm({ initial = {}, onSubmit }) {
  const [form, setForm] = useState({
    name:    initial.name    || '',
    type:    initial.type    || 'checking',
    balance: initial.balance ?? '',
  })
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ ...form, balance: Number(form.balance) || 0 })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account name *</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Chase Checking" className={inputCls} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls + ' bg-white'}>
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
          <input type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)}
            placeholder="0.00" className={inputCls} />
        </div>
      </div>
      <button type="submit"
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
        style={{ background: '#3b82f6' }}>
        {initial.name ? 'Save changes' : 'Add account'}
      </button>
    </form>
  )
}

// ── Transaction Row ───────────────────────────────────────────────────────────

function TxRow({ tx, onEdit, onDelete }) {
  const meta = catMeta(tx.type, tx.category)
  const isIncome = tx.type === 'income'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + '20' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
          {tx.recurring && (
            <span className="shrink-0 text-xs text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
              {tx.recurring.freq}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{tx.date}</span>
          <span className="text-xs text-gray-400" style={{ color: meta.color }}>{meta.label}</span>
          {tx.note && <span className="text-xs text-gray-400 truncate max-w-24">{tx.note}</span>}
        </div>
      </div>
      <span className={`text-sm font-semibold tabular-nums shrink-0 ${isIncome ? 'text-green-600' : 'text-gray-800'}`}>
        {isIncome ? '+' : '-'}{fmt(tx.amount)}
      </span>
      <div className="flex gap-0.5 shrink-0">
        <button onClick={() => onEdit(tx)} className="p-1.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 cursor-pointer">
          <Icon name="edit" size={13} />
        </button>
        <button onClick={() => onDelete(tx.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer">
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Trade Form ────────────────────────────────────────────────────────────────

function TradeForm({ holding, onClose }) {
  const { addTrade } = useDataContext()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'buy', date: today, shares: '', pricePerShare: '', fee: '' })
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  const total = form.shares && form.pricePerShare
    ? (Number(form.shares) * Number(form.pricePerShare) + Number(form.fee || 0))
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.shares || !form.pricePerShare) return
    await addTrade(holding.id, form)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {['buy', 'sell'].map(t => (
          <button key={t} type="button" onClick={() => set('type', t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors capitalize ${form.type === t ? (t === 'buy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Shares</label>
          <input type="number" min="0.0001" step="any" value={form.shares} onChange={e => set('shares', e.target.value)}
            placeholder="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Price / share</label>
          <input type="number" min="0.01" step="0.01" value={form.pricePerShare} onChange={e => set('pricePerShare', e.target.value)}
            placeholder="$0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fee (optional)</label>
          <input type="number" min="0" step="0.01" value={form.fee} onChange={e => set('fee', e.target.value)}
            placeholder="$0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {total !== null && (
        <p className="text-xs text-gray-500 text-right">
          Total: <span className="font-semibold text-gray-800">{fmt(total)}</span>
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit"
          className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white cursor-pointer hover:opacity-90 ${form.type === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}>
          Log {form.type}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Holding Row ───────────────────────────────────────────────────────────────

function HoldingRow({ holding, onEdit, onDelete, livePrice }) {
  const { deleteTrade } = useDataContext()
  const [showTrade,   setShowTrade]   = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const stats    = computeHoldingStats(holding)
  const price    = livePrice?.price ?? holding.currentPrice
  const curValue = price && stats.shares > 0 ? stats.shares * price : holding.currentValue
  const gain     = curValue - stats.costBasis
  const gainPct  = stats.costBasis > 0 ? (gain / stats.costBasis) * 100 : 0
  const dayChg   = livePrice ? livePrice.change * stats.shares : null

  const trades   = (holding.trades || []).slice().sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="border-b border-gray-50 last:border-0 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {holding.ticker && (
              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                {holding.ticker}
              </span>
            )}
            <span className="text-sm font-medium text-gray-800 truncate">{holding.name || holding.ticker}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 tabular-nums">
              {stats.shares > 0 ? `${parseFloat(stats.shares.toFixed(4))} shares` : 'No shares'}
            </span>
            {price && (
              <span className="text-xs text-gray-500 tabular-nums">
                @ {fmt(price)}/sh
                {livePrice && (
                  <span className={`ml-1 ${livePrice.changePct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {livePrice.changePct >= 0 ? '+' : ''}{livePrice.changePct?.toFixed(2)}%
                  </span>
                )}
              </span>
            )}
            {stats.costBasis > 0 && (
              <span className="text-xs text-gray-400">avg cost {fmt(stats.avgCostPerShare)}/sh</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-gray-900 tabular-nums">{fmtK(curValue)}</div>
          {stats.costBasis > 0 && curValue > 0 && (
            <div className={`text-xs font-medium tabular-nums ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {gain >= 0 ? '+' : ''}{fmtK(gain)} ({gainPct.toFixed(1)}%)
            </div>
          )}
          {dayChg !== null && (
            <div className={`text-xs tabular-nums ${dayChg >= 0 ? 'text-green-500' : 'text-red-400'}`}>
              {dayChg >= 0 ? '+' : ''}{fmt(dayChg)} today
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 mt-2">
        <button onClick={() => { setShowTrade(v => !v); setShowHistory(false) }}
          className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100 cursor-pointer">
          Buy / Sell
        </button>
        {trades.length > 0 && (
          <button onClick={() => { setShowHistory(v => !v); setShowTrade(false) }}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 cursor-pointer">
            History ({trades.length})
          </button>
        )}
        <div className="ml-auto flex gap-0.5">
          <button onClick={() => onEdit(holding)} className="p-1.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 cursor-pointer">
            <Icon name="edit" size={13} />
          </button>
          <button onClick={() => onDelete(holding.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer">
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      {/* Inline trade form */}
      {showTrade && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <TradeForm holding={holding} onClose={() => setShowTrade(false)} />
        </div>
      )}

      {/* Trade history */}
      {showHistory && trades.length > 0 && (
        <div className="mt-2 space-y-1">
          {trades.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-xs text-gray-500 py-1 border-b border-gray-50 last:border-0">
              <span className={`font-semibold px-1.5 py-0.5 rounded ${t.type === 'buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {t.type}
              </span>
              <span className="tabular-nums">{parseFloat(t.shares.toFixed(4))} sh</span>
              <span className="tabular-nums">@ {fmt(t.pricePerShare)}</span>
              {t.fee > 0 && <span className="text-gray-400">+{fmt(t.fee)} fee</span>}
              <span className="text-gray-400 ml-1">{t.date}</span>
              <button onClick={() => deleteTrade(holding.id, t.id)}
                className="ml-auto p-0.5 rounded text-gray-300 hover:text-red-400 cursor-pointer">
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Account Balance Row ───────────────────────────────────────────────────────

function AccountRow({ account, transactions, onEdit, onDelete, onMakePayment }) {
  const meta    = ACCOUNT_TYPES.find(t => t.value === account.type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1]
  const isDebt  = account.type === 'debt'
  const balance = computeAccountBalance(account, transactions)

  return (
    <div className="border-b border-gray-50 last:border-0 py-3">
      <div className="flex items-center gap-3">
        <div className="w-2 h-8 rounded-full shrink-0" style={{ background: meta.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{account.name}</p>
          <p className="text-xs text-gray-400">{meta.label}</p>
        </div>
        <div className="text-right mr-1">
          <div className={`text-sm font-semibold tabular-nums ${isDebt ? 'text-red-500' : 'text-gray-900'}`}>
            {isDebt ? '−' : ''}{fmtK(Math.abs(balance))}
          </div>
          <AccountSparkline account={account} transactions={transactions} width={80} height={24} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isDebt && balance > 0 && (
            <button onClick={() => onMakePayment(account)}
              className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 font-medium hover:bg-green-100 cursor-pointer">
              Pay
            </button>
          )}
          <button onClick={() => onEdit(account)} className="p-1.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 cursor-pointer">
            <Icon name="edit" size={13} />
          </button>
          <button onClick={() => onDelete(account.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 cursor-pointer">
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main FinancePage ──────────────────────────────────────────────────────────

export default function FinancePage() {
  const {
    transactions, addTransaction, updateTransaction, deleteTransaction,
    holdings,     addHolding,     updateHolding,     deleteHolding,
    accounts,     addAccount,     updateAccount,      updateAccountBalance, deleteAccount,
  } = useDataContext()

  const [showTxForm,   setShowTxForm]   = useState(false)
  const [showHoldForm, setShowHoldForm] = useState(false)
  const [showAcctForm, setShowAcctForm] = useState(false)
  const [editingTx,    setEditingTx]    = useState(null)
  const [editingHold,  setEditingHold]  = useState(null)
  const [editingAcct,  setEditingAcct]  = useState(null)
  const [txFilter,     setTxFilter]     = useState('all')
  const [txLimit,      setTxLimit]      = useState(10)
  const [livePrices,   setLivePrices]   = useState({})   // { ticker: { price, change, changePct } }
  const [refreshing,   setRefreshing]   = useState(false)
  const [priceError,   setPriceError]   = useState('')
  const [priceTs,      setPriceTs]      = useState(null)
  const [paymentAcct,  setPaymentAcct]  = useState(null)

  const month = thisMonth()

  // ── Price refresh ─────────────────────────────────────────────────────────

  const refreshPrices = useCallback(async () => {
    const tickers = [...new Set(holdings.filter(h => h.ticker).map(h => h.ticker))]
    if (!tickers.length) return
    setRefreshing(true)
    setPriceError('')
    try {
      const res = await fetch('/.netlify/functions/stock-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLivePrices(data)
      setPriceTs(new Date())
    } catch (err) {
      setPriceError(err.message === 'Failed to fetch' ? 'Could not reach price service.' : err.message)
    }
    setRefreshing(false)
  }, [holdings])

  // ── Computed ──────────────────────────────────────────────────────────────

  const monthTxs    = transactions.filter(t => t.date?.startsWith(month))
  const monthIncome = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthSpend  = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthNet    = monthIncome - monthSpend
  const savingsRate = monthIncome > 0 ? Math.round((monthNet / monthIncome) * 100) : 0

  const spendByCategory = useMemo(() => {
    const map = {}
    for (const tx of monthTxs.filter(t => t.type === 'expense')) {
      map[tx.category] = (map[tx.category] || 0) + tx.amount
    }
    return EXPENSE_CATS
      .filter(c => map[c.value] > 0)
      .map(c => ({ ...c, amount: map[c.value] }))
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, month])

  // Use live prices where available for totals
  const holdingStats = useMemo(() => holdings.map(h => {
    const stats    = computeHoldingStats(h)
    const lp       = livePrices[h.ticker]
    const curValue = lp && stats.shares > 0 ? stats.shares * lp.price : (h.currentValue || 0)
    return { ...h, _stats: stats, _curValue: curValue }
  }), [holdings, livePrices])

  const totalInvested  = holdingStats.reduce((s, h) => s + h._curValue, 0)
  const totalCostBasis = holdingStats.reduce((s, h) => s + h._stats.costBasis, 0)
  const totalGain      = totalInvested - totalCostBasis

  const holdingsByAccount = useMemo(() => {
    const groups = {}
    for (const h of holdingStats) {
      if (!groups[h.accountType]) groups[h.accountType] = []
      groups[h.accountType].push(h)
    }
    return groups
  }, [holdingStats])

  const assets   = useMemo(() => accounts.filter(a => a.type !== 'debt').reduce((s, a) => s + computeAccountBalance(a, transactions), 0), [accounts, transactions])
  const debts    = useMemo(() => accounts.filter(a => a.type === 'debt').reduce((s, a) => s + Math.abs(computeAccountBalance(a, transactions)), 0), [accounts, transactions])
  const netWorth = assets + totalInvested - debts

  const filteredTxs = useMemo(() => {
    let list = [...transactions].sort((a, b) => b.date?.localeCompare(a.date))
    if (txFilter === 'expense')   list = list.filter(t => t.type === 'expense')
    if (txFilter === 'income')    list = list.filter(t => t.type === 'income')
    if (txFilter === 'recurring') list = list.filter(t => !!t.recurring)
    return list
  }, [transactions, txFilter])

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleAddTx(data)  { addTransaction(data);             setShowTxForm(false)   }
  function handleEditTx(data) { updateTransaction(editingTx.id, data); setEditingTx(null) }

  function handleAddHold(data)  { addHolding(data);             setShowHoldForm(false)   }
  function handleEditHold(data) { updateHolding(editingHold.id, data); setEditingHold(null) }

  function handleAddAcct(data)  { addAccount(data); setShowAcctForm(false) }
  function handleEditAcct(data) {
    updateAccount(editingAcct.id, { name: data.name, type: data.type })
    if (Number(data.balance) !== editingAcct.balance) updateAccountBalance(editingAcct.id, data.balance)
    setEditingAcct(null)
  }
  function handlePayment(data)  { addTransaction(data); setPaymentAcct(null) }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-400 text-xs mt-0.5">Track every dollar in and out</p>
      </div>

      {/* Monthly snapshot */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="text-xs text-gray-400 mb-1">Income</div>
          <div className="text-base font-bold text-green-600 tabular-nums leading-tight">{fmtK(monthIncome)}</div>
          <div className="text-xs text-gray-400 mt-0.5">this month</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="text-xs text-gray-400 mb-1">Spent</div>
          <div className="text-base font-bold text-red-500 tabular-nums leading-tight">{fmtK(monthSpend)}</div>
          <div className="text-xs text-gray-400 mt-0.5">this month</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div className="text-xs text-gray-400 mb-1">Net</div>
          <div className={`text-base font-bold tabular-nums leading-tight ${monthNet >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {monthNet >= 0 ? '+' : ''}{fmtK(monthNet)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {monthIncome > 0 ? `${savingsRate}% saved` : 'this month'}
          </div>
        </div>
      </div>

      {/* Net worth summary */}
      {(accounts.length > 0 || holdings.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Net worth</p>
              <p className={`text-2xl font-bold tabular-nums ${netWorth >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmtK(netWorth)}</p>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-xs text-gray-400">Invested <span className="font-semibold text-gray-700 ml-1">{fmtK(totalInvested)}</span></div>
              <div className="text-xs text-gray-400">Cash <span className="font-semibold text-gray-700 ml-1">{fmtK(assets)}</span></div>
              {debts > 0 && <div className="text-xs text-gray-400">Debt <span className="font-semibold text-red-500 ml-1">-{fmtK(debts)}</span></div>}
            </div>
          </div>
          {totalCostBasis > 0 && (
            <div className={`text-xs mt-2 font-medium ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              Investments {totalGain >= 0 ? '+' : ''}{fmtK(totalGain)} ({totalCostBasis > 0 ? ((totalGain / totalCostBasis) * 100).toFixed(1) : 0}%) total return
            </div>
          )}
        </div>
      )}

      {/* Net worth trend */}
      {(accounts.length > 0 || holdings.length > 0) && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Net worth trend</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <NetWorthChart accounts={accounts} holdings={holdings} transactions={transactions} />
          </div>
        </section>
      )}

      {/* Spending breakdown */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Spending this month</h2>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {spendByCategory.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No expenses logged this month.</p>
          ) : (
            <div className="flex gap-4 items-start">
              <div className="shrink-0">
                <SpendingDonut data={spendByCategory} size={130} />
              </div>
              <div className="flex-1 min-w-0 space-y-2 py-1">
                {spendByCategory.map(cat => (
                  <div key={cat.value}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
                        <span className="text-xs text-gray-600 truncate">{cat.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800 tabular-nums ml-2 shrink-0">{fmtK(cat.amount)}</span>
                    </div>
                    <ProgressBar value={(cat.amount / monthSpend) * 100} color={cat.color} height={3} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Cash flow chart */}
      {transactions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">6-month cash flow</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <CashFlowChart transactions={transactions} />
          </div>
        </section>
      )}

      {/* Transactions */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transactions</h2>
          <button onClick={() => setShowTxForm(true)}
            className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
            <Icon name="plus" size={12} /> Add
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-3">
          {[['all','All'],['expense','Expenses'],['income','Income'],['recurring','Recurring']].map(([v, l]) => (
            <button key={v} onClick={() => setTxFilter(v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${txFilter === v ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {filteredTxs.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-400 mb-3">No transactions yet. Log income and expenses to see your spending breakdown.</p>
              <button onClick={() => setShowTxForm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                Add first transaction
              </button>
            </div>
          ) : (
            <>
              {filteredTxs.slice(0, txLimit).map(tx => (
                <TxRow key={tx.id} tx={tx} onEdit={setEditingTx} onDelete={deleteTransaction} />
              ))}
              {filteredTxs.length > txLimit && (
                <button onClick={() => setTxLimit(n => n + 20)}
                  className="w-full mt-2 py-2 text-xs text-blue-500 hover:underline cursor-pointer">
                  Show {Math.min(20, filteredTxs.length - txLimit)} more
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Investments */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Investments</h2>
          <div className="flex items-center gap-2">
            {holdings.some(h => h.ticker) && (
              <button onClick={refreshPrices} disabled={refreshing}
                className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50">
                <Icon name="rotate-ccw" size={11} />
                {refreshing ? 'Refreshing…' : 'Refresh prices'}
              </button>
            )}
            <button onClick={() => setShowHoldForm(true)}
              className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
              <Icon name="plus" size={12} /> Add holding
            </button>
          </div>
        </div>

        {priceTs && (
          <p className="text-xs text-gray-400 mb-2">
            Prices as of {priceTs.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {' · '}delayed 15 min
          </p>
        )}
        {priceError && (
          <p className="text-xs text-red-500 mb-2">{priceError}</p>
        )}

        {holdings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center py-6">
            <p className="text-xs text-gray-400 mb-3">Track your stocks, ETFs, and retirement accounts here. Includes Roth IRA, 401(k), and taxable accounts.</p>
            <button onClick={() => setShowHoldForm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
              Add first holding
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {INVEST_ACCOUNT_TYPES.filter(at => holdingsByAccount[at.value]).map(at => {
              const group      = holdingsByAccount[at.value]
              const groupTotal = group.reduce((s, h) => s + h._curValue, 0)
              const groupBasis = group.reduce((s, h) => s + h._stats.costBasis, 0)
              const groupGain  = groupTotal - groupBasis
              return (
                <div key={at.value} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: at.color }} />
                      <span className="text-sm font-semibold text-gray-800">{at.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtK(groupTotal)}</span>
                      {groupBasis > 0 && (
                        <span className={`text-xs ml-2 font-medium tabular-nums ${groupGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {groupGain >= 0 ? '+' : ''}{fmtK(groupGain)}
                        </span>
                      )}
                    </div>
                  </div>
                  {group.map(h => (
                    <HoldingRow key={h.id} holding={h} onEdit={setEditingHold} onDelete={deleteHolding}
                      livePrice={livePrices[h.ticker] || null} />
                  ))}
                </div>
              )
            })}

            {/* Totals bar */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Total invested</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{fmtK(totalInvested)}</span>
              </div>
              {totalCostBasis > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Return vs cost basis {fmtK(totalCostBasis)}</span>
                    <span className={`font-medium ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {totalGain >= 0 ? '+' : ''}{fmtK(totalGain)}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.min(100, Math.max(0, (totalInvested / Math.max(totalInvested, totalCostBasis)) * 100))}
                    color={totalGain >= 0 ? '#10b981' : '#ef4444'}
                    height={4}
                  />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Click any current value to update it.</p>
            </div>
          </div>
        )}
      </section>

      {/* Cash accounts */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Accounts & Balances</h2>
          <button onClick={() => setShowAcctForm(true)}
            className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
            <Icon name="plus" size={12} /> Add account
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          {accounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400 mb-3">Track checking, savings, and debt balances here.</p>
              <button onClick={() => setShowAcctForm(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                Add account
              </button>
            </div>
          ) : (
            <>
              {accounts.map(a => (
                <AccountRow key={a.id} account={a} transactions={transactions} onEdit={setEditingAcct} onDelete={deleteAccount} onMakePayment={setPaymentAcct} />
              ))}
              <div className="flex justify-between text-xs pt-3 mt-1 border-t border-gray-50">
                <span className="text-gray-400">Net (excl. investments)</span>
                <span className={`font-semibold tabular-nums ${assets - debts >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
                  {fmtK(assets - debts)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Balances update automatically from linked transactions. Use the edit icon to adjust the opening balance.</p>
            </>
          )}
        </div>
      </section>

      {/* Discover card note */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-blue-700 font-medium mb-1">Discover card auto-import</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Automatic transaction import from Discover (and other banks) requires a service like Plaid. This is on the roadmap — for now, log transactions manually or use the recurring feature for regular expenses.
        </p>
      </div>

      {/* Modals */}
      {showTxForm   && <Modal title="Add transaction" onClose={() => setShowTxForm(false)}><TransactionForm onSubmit={handleAddTx} accounts={accounts} /></Modal>}
      {editingTx    && <Modal title="Edit transaction" onClose={() => setEditingTx(null)}><TransactionForm initial={editingTx} onSubmit={handleEditTx} accounts={accounts} /></Modal>}
      {paymentAcct  && <Modal title={`Pay ${paymentAcct.name}`} onClose={() => setPaymentAcct(null)}><TransactionForm initial={{ type: 'transfer', toAccountId: paymentAcct.id, description: `${paymentAcct.name} payment` }} onSubmit={handlePayment} accounts={accounts} /></Modal>}
      {showHoldForm && <Modal title="Add holding" onClose={() => setShowHoldForm(false)}><HoldingForm onSubmit={handleAddHold} /></Modal>}
      {editingHold  && <Modal title="Edit holding" onClose={() => setEditingHold(null)}><HoldingForm initial={editingHold} onSubmit={handleEditHold} /></Modal>}
      {showAcctForm && <Modal title="Add account" onClose={() => setShowAcctForm(false)}><AccountForm onSubmit={handleAddAcct} /></Modal>}
      {editingAcct  && <Modal title="Edit account" onClose={() => setEditingAcct(null)}><AccountForm initial={editingAcct} onSubmit={handleEditAcct} /></Modal>}
    </div>
  )
}
