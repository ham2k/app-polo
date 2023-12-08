export function fmtShortTimeZulu (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  return t.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' Z'
}
