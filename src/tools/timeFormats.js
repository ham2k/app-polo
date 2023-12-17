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

export function fmtDateTimeNice (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  if (t) {
    return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' })
  } else {
    return ''
  }
}

export function fmtDateNice (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  if (t) {
    return t.toLocaleTimeString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } else {
    return ''
  }
}

export function fmtDateTimeDynamic (t, now = null) {
  if (typeof t === 'number') {
    t = new Date(t)
  }

  now = now || new Date()

  if (t) {
    const diffInDays = (now - t) / (1000 * 60 * 60 * 24)
    if (diffInDays < 0) {
      return fmtDateTimeNice(t)
    } else if (diffInDays < 1) {
      return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    } else if (diffInDays < 7) {
      return t.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', hour: '2-digit' })
    } else if (diffInDays < 365) {
      return t.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
    } else {
      return t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    }
  } else {
    return ''
  }
}

export function fmtADIFDate (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }
  if (t) {
    return t.toISOString().substring(0, 10).replace(/-/g, '')
  } else {
    return ''
  }
}

export function fmtADIFTime (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }
  if (t) {
    return t.toISOString().substring(11, 16).replace(/:/g, '')
  } else {
    return ''
  }
}

export function fmtISODate (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }
  if (t) {
    return t.toISOString().substring(0, 10)
  } else {
    return ''
  }
}

export function fmtISODateTime (t) {
  if (typeof t === 'number') {
    t = new Date(t)
  }
  if (t) {
    return t.toISOString()
  } else {
    return ''
  }
}
