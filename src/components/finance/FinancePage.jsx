import { useState, useMemo, useEffect } from 'react'
import { useDataContext } from '../../context/DataContext'
import { computeHoldingStats, computeAccountBalance } from '../../utils/financeUtils'
import { toDateString, toMonthString } from '../../utils/dateUtils'
import Icon from '../shared/Icon'
import ConfirmDelete from '../shared/ConfirmDelete'
import Modal from '../shared/Modal'
import ProgressBar from '../shared/ProgressBar'
import NetWorthChart from './NetWorthChart'
import AccountSparkline from './AccountSparkline'

// ── Constants ─────────────────────────────────────────────────────────────────

const INVEST_ACCOUNT_TYPES = [
  { value: 'roth_ira', label: 'Roth IRA',  color: '#10b981' },
  { value: '401k',     label: '401(k)',    color: '#8b5cf6' },
  { value: 'hsa',      label: 'HSA',       color: '#f59e0b' },
  { value: 'taxable',  label: 'Taxable',   color: '#3b82f6' },
  { value: 'other',    label: 'Other',     color: '#6b7280' },
]

const ACCOUNT_TYPES = [
  { value: 'checking',   label: 'Checking',   color: '#3b82f6' },
  { value: 'savings',    label: 'Savings',    color: '#10b981' },
  { value: 'investment', label: 'Investment', color: '#8b5cf6' },
  { value: 'debt',       label: 'Debt',       color: '#ef4444' },
  { value: 'other',      label: 'Other',      color: '#6b7280' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtK(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

// ── Account Form ──────────────────────────────────────────────────────────────

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Current balance</label>
          <input type="number" step="0.01" value={form.balance} onChange={e => set('balance', e.target.value)}
            placeholder="0.00" className={inputCls} />
        </div>
      </div>
      <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
        style={{ background: '#3b82f6' }}>
        {initial.name ? 'Save changes' : 'Add account'}
      </button>
    </form>
  )
}

// ── Investment Form (simplified — no trades, just current value) ──────────────

function InvestmentForm({ initial = {}, onSubmit }) {
  const [form, setForm] = useState({
    name:         initial.name         || '',
    accountType:  initial.accountType  || 'roth_ira',
    currentValue: initial.currentValue || '',
  })
  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ ...form, currentValue: Number(form.currentValue) || 0 })
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account name *</label>
        <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Fidelity Roth IRA" className={inputCls} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.accountType} onChange={e => set('accountType', e.target.value)} className={inputCls + ' bg-white'}>
            {INVEST_ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current value</label>
          <input type="number" min="0" step="1" value={form.currentValue} onChange={e => set('currentValue', e.target.value)}
            placeholder="$0" className={inputCls} />
        </div>
      </div>
      <p className="text-xs text-gray-400">Update this value monthly when you do your check-in.</p>
      <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer hover:opacity-90"
        style={{ background: '#3b82f6' }}>
        {initial.name ? 'Save changes' : 'Add investment account'}
      </button>
    </form>
  )
}

// ── Account Row ───────────────────────────────────────────────────────────────

function AccountRow({ account, transactions, onEdit, onDelete }) {
  const meta   = ACCOUNT_TYPES.find(t => t.value === account.type) || ACCOUNT_TYPES[ACCOUNT_TYPES.length - 1]
  const isDebt = account.type === 'debt'
  const balance = computeAccountBalance(account, transactions)
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-2 h-8 rounded-full shrink-0" style={{ background: meta.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{account.name}</p>
        <p className="text-xs text-gray-400">{meta.label}</p>
      </div>
      <div className="text-right mr-1">
        <div className={`text-sm font-semibold tabular-nums ${isDebt ? 'text-red-500' : 'text-gray-900'}`}>
          {isDebt ? '−' : ''}{fmtK(Math.abs(balance))}
        </div>
        <AccountSparkline account={account} transactions={transactions} width={72} height={20} />
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(account)} className="p-1.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 cursor-pointer">
          <Icon name="edit" size={13} />
        </button>
        <ConfirmDelete onConfirm={() => onDelete(account.id)} size={13} />
      </div>
    </div>
  )
}

// ── Investment Row (simplified) ───────────────────────────────────────────────

function InvestmentRow({ holding, onEdit, onDelete }) {
  const at = INVEST_ACCOUNT_TYPES.find(t => t.value === holding.accountType) || INVEST_ACCOUNT_TYPES[INVEST_ACCOUNT_TYPES.length - 1]
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-2 h-8 rounded-full shrink-0" style={{ background: at.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{holding.name}</p>
        <p className="text-xs text-gray-400">{at.label}</p>
      </div>
      <div className="text-sm font-semibold text-gray-900 tabular-nums mr-1">
        {fmtK(holding.currentValue || 0)}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => onEdit(holding)} className="p-1.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 cursor-pointer">
          <Icon name="edit" size={13} />
        </button>
        <ConfirmDelete onConfirm={() => onDelete(holding.id)} size={13} />
      </div>
    </div>
  )
}

// ── Savings goal allocation — inline custom % input ───────────────────────────

function GoalProgressInput({ goalId, progress, checkInGoal }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  if (!editing) return (
    <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-1">
      Custom…
    </button>
  )
  return (
    <form onSubmit={e => {
      e.preventDefault()
      const n = Math.max(0, Math.min(100, Number(val)))
      if (!isNaN(n)) checkInGoal(goalId, n, 'Savings allocation')
      setEditing(false); setVal('')
    }} className="flex items-center gap-1">
      <input autoFocus type="number" min="0" max="100" value={val} onChange={e => setVal(e.target.value)}
        placeholder="%" className="w-14 border border-gray-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <button type="submit" className="text-xs text-blue-600 font-semibold cursor-pointer">Set</button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 cursor-pointer">✕</button>
    </form>
  )
}

// ── Monthly Check-in ──────────────────────────────────────────────────────────

function MonthlyCheckIn({ goals, checkInGoal }) {
  const currentMonth = toMonthString()

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savingsHistory') || '{}') } catch { return {} }
  })
  const cur = history[currentMonth] || {}
  const [income, setIncome] = useState(cur.income || '')
  const [saved,  setSaved]  = useState(cur.saved  || '')
  const [flash,  setFlash]  = useState(false)

  function handleSave() {
    const inc  = Number(income) || 0
    const sav  = Number(saved)  || 0
    const rate = inc > 0 ? Math.round((sav / inc) * 100) : null
    const next = { ...history, [currentMonth]: { income: inc, saved: sav, rate, updatedAt: new Date().toISOString() } }
    localStorage.setItem('savingsHistory', JSON.stringify(next))
    setHistory(next)
    setFlash(true)
    setTimeout(() => setFlash(false), 2000)
  }

  const previewRate = Number(income) > 0 ? Math.round((Number(saved) / Number(income)) * 100) : null

  // Last 6 months for the mini bar chart
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const m = toMonthString(d)
    months.push({ month: m, label: d.toLocaleDateString('en-US', { month: 'short' }), ...(history[m] || {}) })
  }
  const hasHistory = months.some(m => m.rate !== undefined)

  const activeGoals = goals.filter(g => g.status === 'active' && g.type !== 'weekly')

  return (
    <div className="space-y-3">

      {/* Income + savings form */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          {previewRate !== null && (
            <span className={`text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg ${
              previewRate >= 20 ? 'bg-green-50 text-green-700' :
              previewRate >= 10 ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-500'
            }`}>
              {previewRate}% saved
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Income (from YNAB)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
              <input type="number" min="0" step="1" value={income} onChange={e => setIncome(e.target.value)}
                placeholder="0" className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amount saved</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
              <input type="number" min="0" step="1" value={saved} onChange={e => setSaved(e.target.value)}
                placeholder="0" className="w-full border border-gray-200 rounded-lg pl-6 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
        </div>
        <button onClick={handleSave}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white cursor-pointer transition-colors"
          style={{ background: flash ? '#10b981' : '#3b82f6' }}>
          {flash ? 'Saved ✓' : 'Save check-in'}
        </button>
      </div>

      {/* Savings rate trend — mini bar chart */}
      {hasHistory && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Savings rate</p>
          <div className="flex items-end gap-1.5 h-14">
            {months.map(m => {
              const pct   = m.rate ?? 0
              const color = pct >= 20 ? '#10b981' : pct >= 10 ? '#f59e0b' : pct > 0 ? '#ef4444' : '#e5e7eb'
              const h     = m.rate !== undefined ? `${Math.max(4, Math.min(100, pct))}%` : '4px'
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end" style={{ height: '44px', position: 'relative' }}>
                    {m.rate !== undefined && (
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 tabular-nums whitespace-nowrap">
                        {pct}%
                      </span>
                    )}
                    <div className="w-full rounded-t-sm" style={{ height: h, background: color }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Allocate savings to goals */}
      {activeGoals.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-0.5">Allocate to goals</p>
          <p className="text-xs text-gray-400 mb-4">Update goal progress from this month's savings</p>
          <div className="space-y-4">
            {activeGoals.map(goal => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate flex-1 mr-3">{goal.title}</span>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">{goal.progress}%</span>
                </div>
                <ProgressBar value={goal.progress} color="#3b82f6" height={4} />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    onClick={() => checkInGoal(goal.id, Math.min(100, (goal.progress || 0) + 5), 'Savings allocation')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold cursor-pointer hover:bg-blue-100 transition-colors">
                    +5%
                  </button>
                  <button
                    onClick={() => checkInGoal(goal.id, Math.min(100, (goal.progress || 0) + 10), 'Savings allocation')}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold cursor-pointer hover:bg-blue-100 transition-colors">
                    +10%
                  </button>
                  <GoalProgressInput goalId={goal.id} progress={goal.progress} checkInGoal={checkInGoal} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Main FinancePage ──────────────────────────────────────────────────────────

export default function FinancePage({ fabTrigger = 0 }) {
  const {
    accounts, addAccount, updateAccount, updateAccountBalance, deleteAccount,
    holdings, addHolding, updateHolding, deleteHolding,
    transactions,
    goals, checkInGoal,
  } = useDataContext()

  const [showAcctForm, setShowAcctForm] = useState(false)
  const [showInvForm,  setShowInvForm]  = useState(false)
  const [editingAcct,  setEditingAcct]  = useState(null)
  const [editingHold,  setEditingHold]  = useState(null)
  const [activeTab,    setActiveTab]    = useState('checkin')

  useEffect(() => { if (fabTrigger > 0) setShowAcctForm(true) }, [fabTrigger])

  const totalInvested = useMemo(
    () => holdings.reduce((s, h) => s + (h.currentValue || 0), 0),
    [holdings]
  )
  const assets   = useMemo(() => accounts.filter(a => a.type !== 'debt').reduce((s, a) => s + computeAccountBalance(a, transactions), 0), [accounts, transactions])
  const debts    = useMemo(() => accounts.filter(a => a.type === 'debt').reduce((s, a) => s + Math.abs(computeAccountBalance(a, transactions)), 0), [accounts, transactions])
  const netWorth = assets + totalInvested - debts

  function handleAddAcct(data)  { addAccount(data); setShowAcctForm(false) }
  function handleEditAcct(data) {
    updateAccount(editingAcct.id, { name: data.name, type: data.type })
    if (Number(data.balance) !== editingAcct.balance) updateAccountBalance(editingAcct.id, data.balance)
    setEditingAcct(null)
  }
  function handleAddHold(data)  { addHolding({ ...data, trades: [] }); setShowInvForm(false) }
  function handleEditHold(data) {
    updateHolding(editingHold.id, { name: data.name, accountType: data.accountType, currentValue: Number(data.currentValue) || 0 })
    setEditingHold(null)
  }

  const hasAccounts    = accounts.length > 0
  const hasInvestments = holdings.length > 0
  const hasAny         = hasAccounts || hasInvestments

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Finance</h1>
        <p className="text-gray-400 text-xs mt-0.5">Monthly check-in · net worth snapshot</p>
      </div>

      {/* Net worth */}
      {hasAny && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-0.5">Net worth</p>
          <p className={`text-3xl font-bold tabular-nums ${netWorth >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {fmtK(netWorth)}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
            {assets > 0    && <span>Cash <span className="font-semibold text-gray-700 ml-1">{fmtK(assets)}</span></span>}
            {totalInvested > 0 && <span>Invested <span className="font-semibold text-gray-700 ml-1">{fmtK(totalInvested)}</span></span>}
            {debts > 0     && <span>Debt <span className="font-semibold text-red-500 ml-1">−{fmtK(debts)}</span></span>}
          </div>
        </div>
      )}

      {/* Net worth trend */}
      {hasAny && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Net worth trend</p>
          <NetWorthChart accounts={accounts} holdings={holdings} transactions={transactions} />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {[['checkin','Monthly check-in'], ['accounts','Accounts'], ['investments','Investments']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Monthly check-in */}
      {activeTab === 'checkin' && (
        <MonthlyCheckIn goals={goals} checkInGoal={checkInGoal} />
      )}

      {/* Accounts */}
      {activeTab === 'accounts' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cash accounts</h2>
            <button onClick={() => setShowAcctForm(true)}
              className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
              <Icon name="plus" size={12} /> Add
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            {!hasAccounts ? (
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
                  <AccountRow key={a.id} account={a} transactions={transactions} onEdit={setEditingAcct} onDelete={deleteAccount} />
                ))}
                {accounts.length > 1 && (
                  <div className="flex justify-between text-xs pt-3 mt-1 border-t border-gray-50">
                    <span className="text-gray-400">Net cash</span>
                    <span className={`font-semibold tabular-nums ${assets - debts >= 0 ? 'text-gray-700' : 'text-red-500'}`}>
                      {fmtK(assets - debts)}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  Update balances monthly — tap the edit icon and enter the current balance from your bank.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* Investments */}
      {activeTab === 'investments' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Investment accounts</h2>
            <button onClick={() => setShowInvForm(true)}
              className="text-xs font-medium text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
              <Icon name="plus" size={12} /> Add
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            {!hasInvestments ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400 mb-3">Track your Roth IRA, 401(k), and other investment accounts.</p>
                <button onClick={() => setShowInvForm(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                  Add account
                </button>
              </div>
            ) : (
              <>
                {holdings.map(h => (
                  <InvestmentRow key={h.id} holding={h} onEdit={setEditingHold} onDelete={deleteHolding} />
                ))}
                {holdings.length > 1 && (
                  <div className="flex justify-between text-xs pt-3 mt-1 border-t border-gray-50">
                    <span className="text-gray-400">Total invested</span>
                    <span className="font-semibold text-gray-700 tabular-nums">{fmtK(totalInvested)}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                  Update values monthly — just edit and enter the current balance from your brokerage.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* First-time empty state */}
      {!hasAny && activeTab !== 'checkin' && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <Icon name="trending-up" size={22} className="text-green-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Set up your accounts</p>
          <p className="text-xs text-gray-400 mb-4 max-w-xs mx-auto">
            Add your bank accounts and investment accounts to track net worth over time.
          </p>
          <button onClick={() => { setActiveTab('accounts'); setShowAcctForm(true) }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white cursor-pointer hover:bg-blue-700">
            Add first account
          </button>
        </div>
      )}

      {/* Modals */}
      {showAcctForm && <Modal title="Add account"            onClose={() => setShowAcctForm(false)}><AccountForm onSubmit={handleAddAcct} /></Modal>}
      {editingAcct  && <Modal title="Edit account"           onClose={() => setEditingAcct(null)}><AccountForm initial={editingAcct} onSubmit={handleEditAcct} /></Modal>}
      {showInvForm  && <Modal title="Add investment account" onClose={() => setShowInvForm(false)}><InvestmentForm onSubmit={handleAddHold} /></Modal>}
      {editingHold  && <Modal title="Edit investment"        onClose={() => setEditingHold(null)}><InvestmentForm initial={editingHold} onSubmit={handleEditHold} /></Modal>}
    </div>
  )
}
