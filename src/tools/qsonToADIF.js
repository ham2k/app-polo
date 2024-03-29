import packageJson from '../../package.json'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'

export function qsonToADIF ({ operation, settings, qsos, handler, title }) {
  const common = {
    refs: operation.refs,
    grid: operation.grid,
    stationCall: operation.stationCall ?? settings.operatorCall
  }
  if (operation.stationCall !== settings.operatorCall) common.operatorCall = settings.operatorCall

  let str = ''

  str += `ADIF for ${title || operation?.title || 'Operation'} \n`
  str += adifField('ADIF_VER', '3.1.4', { newLine: true })
  str += adifField('PROGRAMID', 'Ham2K Portable Logger', { newLine: true })
  str += adifField('PROGRAMVERSION', packageJson.version, { newLine: true })
  str += '<EOH>\n'

  qsos.forEach(qso => {
    if (qso.deleted) return

    let handlerFieldCombinations
    if (handler?.adifFieldCombinationsForOneQSO) {
      handlerFieldCombinations = handler.adifFieldCombinationsForOneQSO({ qso, operation, common })
    } else if (handler?.adifFieldsForOneQSO) {
      handlerFieldCombinations = [handler.adifFieldsForOneQSO({ qso, operation, common })]
    } else {
      handlerFieldCombinations = [[]]
    }

    handlerFieldCombinations.forEach((combinationFields, index) => {
      const fields = adifFieldsForOneQSO(qso, operation, common, index * 1000)
      str += adifRow([...fields, ...combinationFields])
    })
  })

  return str
}

function adifFieldsForOneQSO (qso, operation, common, timeOfffset = 0) {
  return [
    { CALL: qso.their.call },
    { MODE: qso.mode ?? 'SSB' },
    { BAND: qso.band && qso.band !== 'other' ? qso.band : undefined },
    { FREQ: qso.freq ? (qso.freq / 1000).toFixed(6) : undefined },
    { QSO_DATE: fmtADIFDate(qso.startOnMillis + timeOfffset) },
    { TIME_ON: fmtADIFTime(qso.startOnMillis + timeOfffset) },
    { RST_RCVD: qso.their.sent },
    { RST_SENT: qso.our.sent },
    { STATION_CALLSIGN: qso.our.call ?? common.stationCall },
    { OPERATOR: common.operatorCall },
    { NOTES: qso.notes },
    { GRIDSQUARE: qso.their?.grid ?? qso.their?.guess?.grid },
    { MY_GRIDSQUARE: qso?.our?.grid ?? common.grid },
    { NAME: qso.their?.name ?? qso.their?.guess?.name },
    { DXCC: qso.their?.dxccCode ?? qso.their?.guess?.dxccCode },
    { COUNTRY: qso.their?.country ?? qso.their?.guess?.country },
    { STATE: qso.their?.state ?? qso.their?.guess?.state },
    { CQZ: qso.their?.cqZone ?? qso.their?.guess?.cqZone },
    { ITUZ: qso.their?.ituZone ?? qso.their?.guess?.ituZone },
    { ARRL_SECT: qso.their.arrlSection }
  ]
}

function adifRow (fields) {
  return fields
    .map(field => adifField(Object.keys(field)[0], Object.values(field)[0]))
    .join('') + '<EOR>\n'
}

function adifField (name, value, options = {}) {
  if (!value && !options.force) return ''
  if (typeof value !== 'string') value = value.toString()

  return `<${name}:${value?.length ?? 0}>${value}${options.newLine ? '\n' : ' '}`
}
