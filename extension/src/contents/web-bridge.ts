import type { PlasmoCSConfig } from 'plasmo'

export const config: PlasmoCSConfig = {
  matches: [
    'http://localhost:5173/*',
    'http://localhost:5174/*',
    'http://localhost:5175/*',
    'http://localhost:3000/*',
    'http://localhost:4173/*',
  ],
  run_at: 'document_idle',
}

chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
  if (chrome.runtime.lastError) return
  const extId = chrome.runtime.id
  if (extId) {
    window.localStorage.setItem('cb_extension_id', extId)
    window.dispatchEvent(new CustomEvent('multipublish:extension-id', { detail: extId }))
  }
})
