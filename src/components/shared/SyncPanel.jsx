import { useState } from 'react'
import { useDataContext } from '../../context/DataContext'

export default function SyncPanel() {
  const { workspaceId, isFirebaseConfigured, joinWorkspace } = useDataContext()
  const [copied, setCopied] = useState(false)
  const [input, setInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(workspaceId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleJoin(e) {
    e.preventDefault()
    if (input.trim().length < 4) return
    joinWorkspace(input)
    setInput('')
    setShowJoin(false)
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
        <div className="font-semibold mb-0.5">Sync not set up</div>
        <div className="text-amber-600 leading-snug">Follow the setup guide to sync across devices.</div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block shrink-0" />
        <span className="font-semibold text-blue-800">Syncing across devices</span>
      </div>

      <div>
        <div className="text-blue-600 mb-1">Your sync code:</div>
        <div className="flex items-center gap-2">
          <code className="font-bold text-blue-900 text-sm tracking-widest bg-white border border-blue-200 rounded-lg px-2 py-1">
            {workspaceId}
          </code>
          <button
            onClick={copyCode}
            className={`text-xs px-2 py-1 rounded-lg cursor-pointer font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-blue-200 text-blue-800 hover:bg-blue-300'}`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {!showJoin ? (
        <button
          onClick={() => setShowJoin(true)}
          className="text-blue-600 hover:underline cursor-pointer text-xs"
        >
          Use a different code →
        </button>
      ) : (
        <form onSubmit={handleJoin} className="space-y-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Enter code e.g. ABC123"
            maxLength={12}
            className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            autoFocus
          />
          <div className="flex gap-1.5">
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-1 text-xs font-medium cursor-pointer hover:bg-blue-700">
              Connect
            </button>
            <button type="button" onClick={() => setShowJoin(false)} className="px-2 text-gray-400 hover:text-gray-600 cursor-pointer">
              ✕
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
