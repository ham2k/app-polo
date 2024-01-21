import packageJson from '../../package.json'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'

export function qsonToADIF ({ operation, qsos }) {
  const commonRefs = operation.refs || []

  let str = ''

  str += 'ADIF for Operation \n'
  str += adifField('ADIF_VER', '3.1.4', { newLine: true })
  str += adifField('PROGRAMID', 'Ham2K Portable Logger', { newLine: true })
  str += adifField('PROGRAMVERSION', packageJson.version, { newLine: true })
  str += '<EOH>\n'

  qsos.forEach(qso => {
    str += oneQSOtoADIFWithPOTAMultiples(qso, commonRefs)
  })

  return str
}

// When a QSO has multiple POTA refs (either activatiors or hunters) we need to generate
// one ADIF QSO for each combination, and fudge the time by one second for each one
function oneQSOtoADIFWithPOTAMultiples (qso, commonRefs) {
  const potaActivationRefs = (commonRefs || []).filter(ref => ref.type === 'potaActivation')
  const potaRefs = (qso?.refs || []).filter(ref => ref.type === 'pota')
  let str = ''

  if (potaActivationRefs.length === 0) {
    if (potaRefs.length === 0) {
      str += oneQSOtoADIF(qso)
    } else {
      potaRefs.forEach((potaRef, i) => {
        str += oneQSOtoADIF(qso, { pota: potaRef.ref }, i * 1000)
      })
    }
  } else {
    potaActivationRefs.forEach((activationRef, i) => {
      if (potaRefs.length === 0) {
        str += oneQSOtoADIF(qso, { potaActivation: activationRef.ref }, i * 1000)
      } else {
        potaRefs.forEach((potaRef, j) => {
          str += oneQSOtoADIF(qso, { potaActivation: activationRef.ref, pota: potaRef.ref }, ((i * potaRefs.length) + j) * 1000)
        })
      }
    })
  }
  return str
}

function oneQSOtoADIF (qso, potaRefs = {}, timeOfffset = 0) {
  let str = ''
  str += adifField('CALL', qso.their.call)
  if (qso.band && qso.band !== 'other') str += adifField('BAND', qso.band)
  if (qso.freq) str += adifField('FREQ', qso.freq / 1000)
  str += adifField('MODE', qso.mode ?? 'SSB')
  str += adifField('QSO_DATE', fmtADIFDate(qso.startOnMillis + timeOfffset))
  str += adifField('TIME_ON', fmtADIFTime(qso.startOnMillis + timeOfffset))
  str += adifField('RST_RCVD', qso.their.sent)
  str += adifField('RST_SENT', qso.our.sent)
  str += adifField('OPERATOR', qso.our.call)
  str += adifField('NOTES', qso.our.notes)

  if (potaRefs.potaActivation) {
    str += adifField('MY_SIG', 'POTA')
    str += adifField('MY_SIG_INFO', potaRefs.potaActivation)
  }

  if (potaRefs.pota) {
    str += adifField('SIG', 'POTA')
    str += adifField('SIG_INFO', potaRefs.pota)
  }

  str += '<EOR>\n'
  return str
}

function adifField (name, value, options = {}) {
  if (!value && !options.force) return ''
  if (typeof value !== 'string') value = value.toString()

  return `<${name}:${value?.length ?? 0}>${value}${options.newLine ? '\n' : ' '}`
}
