/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../package.json'
import { findBestHook } from '../extensions/registry'
import { sanitizeToISO8859 } from './stringTools'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'

import { adifModeAndSubmodeForMode } from '@ham2k/lib-operation-data'

export function qsonToADIF ({ operation, settings, qsos, handler, otherHandlers, title }) {
  const common = {
    refs: operation.refs,
    grid: operation.grid,
    stationCall: operation.stationCall ?? settings.operatorCall
  }
  const operationWithoutRefs = { ...operation, refs: [] }

  if (operation.stationCall !== settings.operatorCall) common.operatorCall = settings.operatorCall

  let str = ''

  str += `ADIF for ${title || operation?.title || 'Operation'} \n`
  if (handler?.adifHeaderComment) str += handler.adifHeaderComment({ qsos, operation, common })
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
      let fields = adifFieldsForOneQSO(qso, operation, common, index * 1000)
      fields = fields.concat(combinationFields)

      ;(qso.refs || []).forEach(ref => {
        const exportHandler = findBestHook(`ref:${ref.type}`)
        if (exportHandler && exportHandler.key !== handler.key && exportHandler.adifFieldsForOneQSO) {
          const refFields = exportHandler.adifFieldsForOneQSO({ qso, operation: operationWithoutRefs, common })
          refFields.forEach(refField => {
            if (fields.find(field => Object.keys(field)[0] === Object.keys(refField)[0])) {
              // Another field with the same name already exists
            } else {
              fields = fields.concat([refField])
            }
          })
        }
      })

      str += adifRow(fields)
    })
  })

  return str
}

function modeToADIF (mode) {
  const modeAndSubmode = adifModeAndSubmodeForMode(mode)
  if (modeAndSubmode.length > 1) {
    return [{ MODE: modeAndSubmode[0] }, { SUBMODE: modeAndSubmode[1] }]
  } else {
    return [{ MODE: mode ?? 'SSB' }]
  }
}

function adifFieldsForOneQSO (qso, operation, common, timeOfffset = 0) {
  return [
    { CALL: qso.their.call },
    ...modeToADIF(qso.mode),
    { BAND: qso.band && qso.band !== 'other' ? qso.band : undefined },
    { FREQ: qso.freq ? (qso.freq / 1000).toFixed(6) : undefined },
    { QSO_DATE: fmtADIFDate(qso.startOnMillis + timeOfffset) },
    { TIME_ON: fmtADIFTime(qso.startOnMillis + timeOfffset) },
    { RST_RCVD: qso.their.sent },
    { RST_SENT: qso.our.sent },
    { STATION_CALLSIGN: qso.our.call ?? common.stationCall },
    { OPERATOR: qso.our.operatorCall ?? common.operatorCall },
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

  value = sanitizeToISO8859(value)

  return `<${name}:${value?.length ?? 0}>${value}${options.newLine ? '\n' : ' '}`
}
