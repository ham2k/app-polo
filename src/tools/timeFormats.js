/*
 * Copyright ©️ 2024, 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import GLOBAL from '../GLOBAL'

export function prepareTimeValue(t) {
  if (typeof t === 'number' || typeof t === 'string') {
    t = new Date(t)
  }
  return t
}

const FALLBACK_WEEKDAY = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday'
}

const FALLBACK_WEEKDAY_ABBR = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun'
}

const FALLBACK_MONTH_ABBR = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec'
}

const FALLBACK_MONTH = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December'
}

const FALLBACK_ORDINAL_DAY = {
  1: '1st',
  2: '2nd',
  3: '3rd',
}

export function dateTimeInterpolationParts(t, { utc = false } = {}) {
  const hours = utc ? t.getUTCHours() : t.getHours()
  const minutes = utc ? t.getUTCMinutes() : t.getMinutes()
  const seconds = utc ? t.getUTCSeconds() : t.getSeconds()
  const weekdayNumberSundayZero = ((utc ? t.getUTCDay() : t.getDay()) + 1 % 7) - 1
  const weekdayNumber = weekdayNumberSundayZero === 0 ? 7 : weekdayNumberSundayZero
  const month = (utc ? t.getUTCMonth() : t.getMonth()) + 1
  const day = utc ? t.getUTCDate() : t.getDate()
  const year = utc ? t.getUTCFullYear() : t.getFullYear()

  return {
    upperZulu: utc ? 'Z' : '',
    lowerZulu: utc ? 'z' : '',
    hours,
    hours12: hours % 12 || 12,
    hoursZero: hours.toString().padStart(2, '0'),
    minutes,
    minutesZero: minutes.toString().padStart(2, '0'),
    seconds,
    secondsZero: seconds.toString().padStart(2, '0'),
    ampm: hours < 12 ? 'AM' : 'PM',
    ampmLower: hours < 12 ? 'am' : 'pm',
    day,
    dayZero: day.toString().padStart(2, '0'),
    dayOrd: GLOBAL?.t?.(`general.formatting.ordinalDay.${day}`, FALLBACK_ORDINAL_DAY[day] || `${day}th`) || FALLBACK_ORDINAL_DAY[day] || `${day}th`,
    weekdayNumber,
    weekday: GLOBAL?.t?.(`general.formatting.weekday.${weekdayNumber}`, FALLBACK_WEEKDAY[weekdayNumber]) || FALLBACK_WEEKDAY[weekdayNumber],
    weekdayAbbr: GLOBAL?.t?.(`general.formatting.weekdayAbbr.${weekdayNumber}`, FALLBACK_WEEKDAY_ABBR[weekdayNumber]) || FALLBACK_WEEKDAY_ABBR[weekdayNumber],
    month,
    monthZero: month.toString().padStart(2, '0'),
    monthName: GLOBAL?.t?.(`general.formatting.month.${month}`, FALLBACK_MONTH[month]) || FALLBACK_MONTH[month],
    monthAbbr: GLOBAL?.t?.(`general.formatting.monthAbbr.${month}`, FALLBACK_MONTH_ABBR[month]) || FALLBACK_MONTH_ABBR[month],
    year,
  }
}

export function fmtShortTimeZulu(t, { showZ = true } = {}) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(11, 16) + (showZ ? 'z' : '')
  } else {
    return ''
  }
}

export function fmtTimeZulu(t, { showZ = true, compact = false } = {}) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    if (compact) {
      return t.toISOString().substring(11, 16) + (showZ ? 'z' : '')
    } else {
      return t.toISOString().substring(11, 19) + (showZ ? 'z' : '')
    }
  } else {
    return ''
  }
}

export function fmtDateZulu(t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 10)
  } else {
    return ''
  }
}

export function fmtDateTimeDynamic(t, { now = null, compact = false, utc = false } = {}) {
  t = prepareTimeValue(t)

  now = now || new Date()

  if (t) {
    const diffInDays = (now - t) / (1000 * 60 * 60 * 24)
    const interpolation = dateTimeInterpolationParts(t, { utc })
    interpolation.time = GLOBAL?.t?.('general.formatting.time.short', interpolation) || `${interpolation.hoursZero}:${interpolation.minutesZero}${interpolation.lowerZulu}`

    if (diffInDays < 1) {
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.dateTime.varShortUnder1Day`, '{{time}}', interpolation) || `${interpolation.time}`
      } else {
        return GLOBAL?.t?.(`general.formatting.dateTime.varUnder1Day`, '{{time}} {{weekday}} {{dayOrd}}', interpolation) || `${interpolation.time} ${interpolation.weekday} ${interpolation.dayOrd}`
      }
    } else if (diffInDays <= 7) {
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.dateTime.varShortUnder7Days`, '{{time}} {{weekdayAbbr}} {{day}}', interpolation) || `${interpolation.time} ${interpolation.weekdayAbbr} ${interpolation.day}`
      } else {
        return GLOBAL?.t?.(`general.formatting.dateTime.varUnder7Days`, '{{time}} {{weekday}} {{dayOrd}}', interpolation) || `${interpolation.time} ${interpolation.weekday} ${interpolation.dayOrd}`
      }
    } else if (diffInDays <= 274) { // 9 months
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.dateTime.varShortUnder9Months`, '{{time}} {{monthAbbr}} {{day}}', interpolation) || `${interpolation.time} ${interpolation.monthAbbr} ${interpolation.day}`
      } else {
        return GLOBAL?.t?.(`general.formatting.dateTime.varUnder9Months`, '{{time}} {{monthName}} {{dayOrd}}', interpolation) || `${interpolation.time} ${interpolation.monthName} ${interpolation.dayOrd}`
      }
    } else {
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.dateTime.varShortOver9Months`, '{{time}} {{monthAbbr}} {{day}} {{year}}', interpolation) || `${interpolation.time} ${interpolation.monthAbbr} ${interpolation.day} ${interpolation.year}`
      } else {
        return GLOBAL?.t?.(`general.formatting.dateTime.varOver9Months`, '{{time}} {{monthName}} {{dayOrd}} {{year}}', interpolation) || `${interpolation.time} ${interpolation.monthName} ${interpolation.dayOrd} ${interpolation.year}`
      }
    }
  } else {
    return ''
  }
}

export function fmtDateTimeDynamicZulu(t, { now = null, compact = false } = {}) {
  return fmtDateTimeDynamic(t, { now, compact, utc: true })
}

export function fmtDateDynamic(t, { now = null, compact = false, utc = false } = {}) {
  t = prepareTimeValue(t)
  now = now || new Date()

  if (t) {
    const interpolation = dateTimeInterpolationParts(t, { utc })
    const diffInDays = (now - t) / (1000 * 60 * 60 * 24)
    const absDiffInDays = Math.abs(diffInDays)

    if (diffInDays > -1 && diffInDays <= 0) {
      return GLOBAL?.t?.(['general.formatting.time.tomorrow', 'Tomorrow']) || 'Tomorrow'
    } else if (diffInDays > 0 && diffInDays <= 1) {
      return GLOBAL?.t?.(['general.formatting.time.today', 'Today']) || 'Today'
    } else if (diffInDays <= 2) {
      return GLOBAL?.t?.(['general.formatting.time.yesterday', 'Yesterday']) || 'Yesterday'
    } else if (absDiffInDays <= 7) {
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.date.varShortUnder7Days`, '{{weekdayAbbr}} {{day}}', interpolation) || `${interpolation.weekdayAbbr} ${interpolation.day}`
      } else {
        return GLOBAL?.t?.(`general.formatting.date.varUnder7Days`, '{{weekday}} {{dayOrd}}', interpolation) || `${interpolation.weekday} ${interpolation.dayOrd}`
      }
    } else if (absDiffInDays <= 274) { // 9 months
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.date.varShortUnder9Months`, '{{monthAbbr}} {{day}}', interpolation) || `${interpolation.monthAbbr} ${interpolation.day}`
      } else {
        return GLOBAL?.t?.(`general.formatting.date.varUnder9Months`, '{{monthName}} {{dayOrd}}', interpolation) || `${interpolation.monthName} ${interpolation.dayOrd}`
      }
    } else {
      if (compact) {
        return GLOBAL?.t?.(`general.formatting.date.varShortOver9Months`, '{{monthAbbr}} {{day}} {{year}}', interpolation) || `${interpolation.monthAbbr} ${interpolation.day} ${interpolation.year}`
      } else {
        return GLOBAL?.t?.(`general.formatting.date.varOver9Months`, '{{monthName}} {{year}}', interpolation) || `${interpolation.monthName} ${interpolation.year}`
      }
    }
  } else {
    return ''
  }
}

export function fmtDateDynamicZulu(t, { now = null, compact = false } = {}) {
  return fmtDateDynamic(t, { now, compact, utc: true })
}

export function fmtDateTimeNice(t, { utc = false } = {}) {
  t = prepareTimeValue(t)

  if (t) {
    const interpolation = dateTimeInterpolationParts(t, { utc })
    interpolation.time = GLOBAL?.t?.('general.formatting.time.short', interpolation) || `${interpolation.hoursZero}:${interpolation.minutesZero}${interpolation.lowerZulu}`

    return GLOBAL?.t?.(`general.formatting.dateTime.nice`, '{{time}} {{month}} {{dayOrd}} {{year}}', interpolation)
      || `${interpolation.time} ${interpolation.month} ${interpolation.dayOrd}, ${interpolation.year}`
  } else {
    return ''
  }
}

export function fmtDateTimeNiceZulu(t) {
  return fmtDateTimeNice(t, { utc: true })
}

export function fmtDateNice(t, { utc = false }) {
  t = prepareTimeValue(t)

  if (t) {
    const interpolation = dateTimeInterpolationParts(t, { utc })

    return GLOBAL?.t?.(`general.formatting.date.nice`, '{{monthName}} {{dayOrd}}, {{year}}', interpolation)
      || `${interpolation.month} ${interpolation.dayOrd}, ${interpolation.year}`
  } else {
    return ''
  }
}

export function fmtDateNiceZulu(t) {
  return fmtDateNice(t, { utc: true })
}

export function fmtDateFull(t, { compact = false, utc = false }) {
  t = prepareTimeValue(t)

  if (t) {
    const interpolation = dateTimeInterpolationParts(t, { utc })

    if (compact) {
      return GLOBAL?.t?.(`general.formatting.date.fullShort`, '{{weekdayAbbr}} {{monthAbbr}} {{day}}, {{year}}', interpolation)
        || `${interpolation.weekdayAbbr} ${interpolation.monthAbbr} ${interpolation.day}, ${interpolation.year}`
    }
    else {
      return GLOBAL?.t?.(`general.formatting.date.full`, '{{weekday}} {{month}} {{dayOrd}}, {{year}}', interpolation)
        || `${interpolation.weekday} ${interpolation.month} ${interpolation.dayOrd}, ${interpolation.year}`
    }
  } else {
    return ''
  }
}

export function fmtDateFullZulu(t, { compact = false } = {}) {
  return fmtDateFull(t, { compact, utc: true })
}

export function fmtDateTimeRelative(t, { now = null, roundTo = false } = {}) {
  t = prepareTimeValue(t)

  now = now || new Date()

  if (t && t.toLocaleTimeString) {
    if (t < now) {
      const time = fmtTimeBetween(t, now, { roundTo })
      return GLOBAL?.t?.(['general.formatting.time.ago', '{{time}} ago'], { time }) || `${time} ago`
    } else {
      const time = fmtTimeBetween(t, now, { roundTo })
      return GLOBAL?.t?.(['general.formatting.time.fromNow', '{{time}} from now'], { time }) || `${time} from now`
    }
  } else {
    return ''
  }
}

export function fmtTimestamp(t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 19).replace(/[-:T]/g, '')
  } else {
    return ''
  }
}

export function fmtADIFDate(t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 10).replace(/-/g, '')
  } else {
    return ''
  }
}

export function fmtADIFTime(t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(11, 19).replace(/:/g, '')
  } else {
    return ''
  }
}

export function fmtCabrilloDate(t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 10)
  } else {
    return ''
  }
}

export function fmtCabrilloTime(t) {
  return fmtADIFTime(t).substring(0, 4)
}

export function fmtISODate(t) {
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

export function fmtISODateTime(t) {
  t = prepareTimeValue(t)

  if (t && t.toISOString) {
    return t.toISOString().substring(0, 19) + 'Z'
  } else {
    return ''
  }
}

export function fmtTimeBetween(t1, t2, { roundTo = false } = {}) {
  t1 = prepareTimeValue(t1)
  t2 = prepareTimeValue(t2)

  if (t1 && t2) {
    let diff = t2 - t1

    if (roundTo === 'minutes') {
      diff = Math.round(diff / (60 * 1000)) * (60 * 1000)
    } else if (roundTo === 'hours') {
      diff = Math.round(diff / (60 * 60 * 1000)) * (60 * 60 * 1000)
    }

    if (diff < 0) {
      return ''
    } else if (diff < 1000) {
      return GLOBAL?.t?.(['general.formatting.time.shortSeconds', '{{s}}s'], { s: 0 }) || '0s'
    } else if (diff < 60 * 1000) {
      const s = Math.floor(diff / 1000)
      return GLOBAL?.t?.(['general.formatting.time.shortSeconds', '{{s}}s'], { s }) || `${s}s`
    } else if (diff < 60 * 60 * 1000) {
      if (roundTo === 'minutes') {
        const m = Math.floor(diff / (60 * 1000))
        return GLOBAL?.t?.(['general.formatting.time.shortMinutes', '{{m}}m'], { m }) || `${m}m`
      } else {
        const m = Math.floor(diff / (60 * 1000))
        const s = Math.floor((diff % (60 * 1000)) / 1000)
        return GLOBAL?.t?.(['general.formatting.time.shortMinutesAndSeconds', '{{m}}m {{s}}s'], { m, s }) || `${m}m ${s}s`
      }
    } else if (diff < 1000 * 60 * 60 * 24) {
      if (roundTo === 'hours') {
        const h = Math.floor(diff / (60 * 60 * 1000))
        return GLOBAL?.t?.(['general.formatting.time.shortHours', '{{h}}h'], { h }) || `${h}h`
      } else {
        const h = Math.floor(diff / (60 * 60 * 1000))
        const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
        return GLOBAL?.t?.(['general.formatting.time.shortHoursAndMinutes', '{{h}}h {{m}}m'], { h, m }) || `${h}h ${m}m`
      }
    } else {
      const d = Math.floor(diff / (60 * 60 * 24 * 1000))
      const h = Math.floor((diff % (60 * 60 * 24 * 1000)) / (60 * 60 * 1000))
      return GLOBAL?.t?.(['general.formatting.time.shortDaysAndHours', '{{d}}d {{h}}h'], { d, h }) || `${d}d ${h}h`
    }
  } else {
    return ''
  }
}

export function fmtDateTimeNiceRange(t1, t2, { utc = false } = {}) {
  t1 = prepareTimeValue(t1)
  t2 = prepareTimeValue(t2)
  const interpolation = {
    niceTime1: fmtDateTimeNice(t1, { utc }),
    niceTime2: fmtDateTimeNice(t2, { utc }),
  }
  return GLOBAL?.t?.(`general.formatting.dateTime.niceRange`, '{{niceTime1}} - {{niceTime2}}', interpolation) || `${interpolation.niceTime1} - ${interpolation.niceTime2}`
}

