import { findRef } from './refTools'
import { fmtCabrilloDate, fmtCabrilloTime } from './timeFormats'

export function qsonToCabrillo ({ operation, qsos, settings, activity }) {
  const ref = findRef(operation, activity.key)

  let str = ''

  str += 'START-OF-LOG: 3.0\n'
  if (activity.cabrilloHeaders) {
    str += activity.cabrilloHeaders({ operation, settings, headers: [] }).join('\n')
  }

  qsos.forEach(qso => {
    const parts = ['QSO:']
    parts.push(cabrilloFreq(qso).padEnd(5, ' '))
    parts.push(cabrilloMode(qso).padEnd(2, ' '))
    parts.push(fmtCabrilloDate(qso?.startOnMillis ?? qso?.endOnMillis).padEnd(10, ' '))
    parts.push(fmtCabrilloTime(qso?.startOnMillis ?? qso?.endOnMillis).padEnd(4, ' '))
    activity.qsoToCabrilloParts && activity.qsoToCabrilloParts({ qso, operation, ref, parts })

    str += parts.join(' ') + '\n'
  })

  str += 'END-OF-LOG\n'
  return str
}

const DEFAULT_FREQUENCIES_PER_BAND = {
  '160m': '1800',
  '80m': '3500',
  '60m': '5332', // Not a Cabrillo Standard
  '30m': '10100', // Not a Cabrillo Standard
  '40m': '7000',
  '20m': '14000',
  '17m': '18068', // Not a Cabrillo Standard
  '15m': '21000',
  '12m': '24890', // Not a Cabrillo Standard
  '10m': '28000',
  '6m': '50',
  '4m': '70',
  '2m': '144',
  '70cm': '432',
  '33cm': '902',
  '23cm': '1.2G',
  '13cm': '2.3G'
}

function cabrilloFreq (qso) {
  if (qso.freq) return `${qso.freq}`
  else return DEFAULT_FREQUENCIES_PER_BAND[qso.band] ?? '0'
}

function cabrilloMode (qso) {
  if (qso?.mode === 'SSB') return 'PH'
  else if (qso?.mode === 'USB') return 'PH'
  else if (qso?.mode === 'LSB') return 'PH'
  else if (qso?.mode === 'AM') return 'PH'
  else if (qso?.mode === 'FM') return 'PH'
  else if (qso?.mode === 'CW') return 'CW'
  else return 'DG'
}
