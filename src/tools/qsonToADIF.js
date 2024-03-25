import packageJson from '../../package.json'
import { filterRefs } from './refTools'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'
import { refHandlers } from '../plugins/loadPlugins'

export function qsonToADIF ({ operation, settings, qsos }) {
  const common = {
    activationRef: operation.activationRef,
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
    str += oneQSOtoADIFWithActivityMultiples(qso, operation, common)
  })

  return str
}

// When a QSO has multiple POTA refs we need to generate multiple ADIF QSOs,
// one for each reference, and fudge the time by one second for each one
function oneQSOtoADIFWithActivityMultiples (qso, operation, common) {
  const huntingType = refHandlers[common?.activationRef.type]?.huntingType
  const huntingRefs = huntingType ? filterRefs(qso, huntingType) : qso.refs
  let str = ''

  if (huntingRefs.length === 0) {
    str += oneQSOtoADIF(qso, operation, common)
  } else {
    huntingRefs.forEach((huntingRef, i) => {
      str += oneQSOtoADIF(qso, operation, { ...common, huntingRef }, i * 1000)
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
  str += adifField('STATION_CALLSIGN', qso.our.call ?? common.stationCall)
  str += adifField('OPERATOR', common.operatorCall)
  str += adifField('NOTES', qso.notes)
  str += adifField('GRIDSQUARE', qso.their?.grid ?? qso.their?.guess?.grid)
  str += adifField('MY_GRIDSQUARE', qso?.our?.grid ?? common.grid)

  str += adifField('NAME', qso.their?.name ?? qso.their?.guess?.name)
  str += adifField('DXCC', qso.their?.dxccCode ?? qso.their?.guess?.dxccCode)
  str += adifField('COUNTRY', qso.their?.country ?? qso.their?.guess?.country)
  str += adifField('STATE', qso.their?.state ?? qso.their?.guess?.state)
  str += adifField('CQZ', qso.their?.cqZone ?? qso.their?.guess?.cqZone)
  str += adifField('ITUZ', qso.their?.ituZone ?? qso.their?.guess?.ituZone)

  str += adifField('ARRL_SECT', qso.their.arrlSection)

  str += refHandlers[common?.activationRef?.type]?.activationADIF ? refHandlers[common.activationRef.type]?.activationADIF(common.activationRef) : ''
  str += refHandlers[common?.huntingRef?.type]?.huntingADIF ? refHandlers[common.huntingRef.type]?.huntingADIF(common.huntingRef) : ''

  str += '<EOR>\n'
  return str
}

export function adifField (name, value, options = {}) {
  if (!value && !options.force) return ''
  if (typeof value !== 'string') value = value.toString()

  return `<${name}:${value?.length ?? 0}>${value}${options.newLine ? '\n' : ' '}`
}
