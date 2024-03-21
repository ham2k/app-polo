import packageJson from '../../package.json'
import { filterRefs, findRef } from './refTools'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'

export function qsonToADIF ({ operation, settings, qsos }) {
  const potaActivationRef = findRef(operation, 'potaActivation')
  const sotaActivationRef = findRef(operation, 'sotaActivation')

  const common = {
    potaActivation: potaActivationRef?.ref,
    sotaActivation: sotaActivationRef?.ref,
    grid: operation.grid,
    stationCall: operation.stationCall ?? settings.operatorCall
  }
  if (operation.stationCall !== settings.operatorCall) common.operatorCall = settings.operatorCall

  let str = ''

  str += 'ADIF for Operation \n'
  str += adifField('ADIF_VER', '3.1.4', { newLine: true })
  str += adifField('PROGRAMID', 'Ham2K Portable Logger', { newLine: true })
  str += adifField('PROGRAMVERSION', packageJson.version, { newLine: true })
  str += '<EOH>\n'

  qsos.forEach(qso => {
    if (qso.deleted) return

    str += oneQSOtoADIFWithPOTAMultiples(qso, operation, common)
  })

  return str
}

// When a QSO has multiple POTA refs we need to generate multiple ADIF QSOs,
// one for each reference, and fudge the time by one second for each one
function oneQSOtoADIFWithPOTAMultiples (qso, operation, common) {
  const potaRefs = filterRefs(qso, 'pota')
  const sotaRef = findRef(qso, 'sota')
  let str = ''

  if (sotaRef) common = { ...common, sota: sotaRef.ref }

  if (potaRefs.length === 0) {
    str += oneQSOtoADIF(qso, operation, common)
  } else {
    potaRefs.forEach((potaRef, i) => {
      str += oneQSOtoADIF(qso, operation, { ...common, pota: potaRef.ref }, i * 1000)
    })
  }

  return str
}

function oneQSOtoADIF (qso, operation, common, timeOfffset = 0) {
  let str = ''
  str += adifField('CALL', qso.their.call)
  if (qso.band && qso.band !== 'other') str += adifField('BAND', qso.band)
  if (qso.freq) str += adifField('FREQ', (qso.freq / 1000).toFixed(6))
  str += adifField('MODE', qso.mode ?? 'SSB')
  str += adifField('QSO_DATE', fmtADIFDate(qso.startOnMillis + timeOfffset))
  str += adifField('TIME_ON', fmtADIFTime(qso.startOnMillis + timeOfffset))
  str += adifField('RST_RCVD', qso.their.sent)
  str += adifField('RST_SENT', qso.our.sent)
  str += adifField('STATION_CALLSIGN', common.stationCall)
  str += adifField('OPERATOR', qso.our.call ?? common.operatorCall)
  str += adifField('OPERATOR', common.operatorCall)
  str += adifField('NOTES', qso.notes)
  if (qso.grid) str += adifField('GRIDSQUARE', qso.grid)
  else if (common?.grid) str += adifField('MY_GRIDSQUARE', common.grid)

  if (qso.their?.arrlSection) str += adifField('ARRL_SECT', qso.their.arrlSection)

  if (common?.potaActivation) {
    str += adifField('MY_SIG', 'POTA')
    str += adifField('MY_SIG_INFO', common.potaActivation)
    str += adifField('MY_POTA_REF', common.potaActivation)
  }

  if (common?.pota) {
    str += adifField('SIG', 'POTA')
    str += adifField('SIG_INFO', common.pota)
    str += adifField('POTA_REF', common.pota)
  }

  if (common?.sotaActivation) {
    str += adifField('MY_SOTA_REF', common.sotaActivation)
  }

  if (common?.sota) {
    str += adifField('SOTA_REF', common.sota)
  }

  str += '<EOR>\n'
  return str
}

function adifField (name, value, options = {}) {
  if (!value && !options.force) return ''
  if (typeof value !== 'string') value = value.toString()

  return `<${name}:${value?.length ?? 0}>${value}${options.newLine ? '\n' : ' '}`
}
