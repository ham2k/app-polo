export function fmtShortTimeZulu (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  if (t) {
    return t.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit' }) + 'z'
  } else {
    return ''
  }
}

export function fmtTimeZulu (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  if (t) {
    return t.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 'z'
  } else {
    return ''
  }
}

export function fmtTimeNice (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  if (t) {
    return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } else {
    return ''
  }
}
