/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function prepareTimeValue (t) {
  if (typeof t === 'number' || typeof t === 'string') {
    t = new Date(t)
  }
  return t
}

export function fmtShortTimeZulu (t, { showZ = true } = {}) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(11, 16) + (showZ ? 'z' : '')
  } else {
    return ''
  }
}

export function fmtTimeZulu (t, { showZ = true } = {}) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(11, 19) + (showZ ? 'z' : '')
  } else {
    return ''
  }
}

export function fmtDateZulu (t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 10)
  } else {
    return ''
  }
}

export function fmtDateTimeZuluDynamic (t, { now, compact } = { now: null, compact: false }) {
  t = prepareTimeValue(t)

  now = now || new Date()

  if (t && t.toLocaleTimeString) {
    const diffInDays = (now - t) / (1000 * 60 * 60 * 24)
    if (diffInDays < 1) {
      if (compact) {
        return fmtShortTimeZulu(t)
      } else {
        return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' ' + fmtShortTimeZulu(t)
      }
    } else if (diffInDays <= 7) {
      if (compact) {
        return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      } else {
        return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' ' + fmtShortTimeZulu(t)
      }
    } else if (diffInDays <= 365) {
      if (compact) {
        return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      } else {
        return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      }
    } else {
      if (compact) {
        return t.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      } else {
        return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      }
    }
  } else {
    return ''
  }
}

export function fmtDateTimeNice (t) {
  t = prepareTimeValue(t)

  if (t && t.toLocaleTimeString) {
    return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric', year: 'numeric' })
  } else {
    return ''
  }
}

export function fmtDateNice (t) {
  t = prepareTimeValue(t)

  if (t && t.toLocaleTimeString) {
    return t.toLocaleTimeString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } else {
    return ''
  }
}

export function fmtDateTimeDynamic (t, now = null) {
  t = prepareTimeValue(t)

  now = now || new Date()

  if (t && t.toLocaleTimeString) {
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

export function fmtDateTimeRelative (t, now = null) {
  t = prepareTimeValue(t)

  now = now || new Date()

  if (t && t.toLocaleTimeString) {
    if (t < now) {
      return `${fmtTimeBetween(t, now)} ago`
    } else {
      return `${fmtTimeBetween(t, now)} from now`
    }
  } else {
    return ''
  }
}

export function fmtADIFDate (t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 10).replace(/-/g, '')
  } else {
    return ''
  }
}

export function fmtADIFTime (t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(11, 16).replace(/:/g, '')
  } else {
    return ''
  }
}

export function fmtCabrilloDate (t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 10)
  } else {
    return ''
  }
}

export function fmtCabrilloTime (t) {
  return fmtADIFTime(t)
}

export function fmtISODate (t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    try {
      return t.toISOString().substring(0, 10)
    } catch (e) {
      return ''
    }
  } else {
    return ''
  }
}

export function fmtISODateTime (t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString()
  } else {
    return ''
  }
}

export function fmtTimeBetween (t1, t2) {
  t1 = prepareTimeValue(t1)
  t2 = prepareTimeValue(t2)

  if (t1 && t2) {
    const diff = t2 - t1
    if (diff < 0) {
      return ''
    } else if (diff < 1000) {
      return '0s'
    } else if (diff < 60 * 1000) {
      return `${Math.floor(diff / 1000)}s`
    } else if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}m ${Math.floor((diff % (60 * 1000)) / 1000)}s`
    } else if (diff < 1000 * 60 * 60 * 24) {
      return `${Math.floor(diff / (60 * 60 * 1000))}h ${Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))}m`
    } else {
      return `${Math.floor(diff / (60 * 60 * 24 * 1000))}d ${Math.floor((diff % (60 * 60 * 24 * 1000)) / (60 * 60 * 1000))}h`
    }
  } else {
    return ''
  }
}
