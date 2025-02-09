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

import { adifModeAndSubmodeForMode, frequencyForBand, modeForFrequency } from '@ham2k/lib-operation-data'

export function qsonToADIF ({ operation, settings, qsos, handler, title, exportType }) {
  const common = {
    refs: operation.refs,
    grid: operation.grid,
    stationCall: operation.stationCall ?? settings.operatorCall
  }
  const operationWithoutRefs = { ...operation, refs: [] }

  if (operation.stationCall !== settings.operatorCall) {
    common.operatorCall = settings.operatorCall
  }
  if (operation.local?.operatorCall || operation.operatorCall) {
    common.operatorCall = operation.local?.operatorCall || operation.operatorCall
  }

  let str = ''

  str += `ADIF for ${title || (common.stationCall + ' ' + operation?.title) || 'Operation'} \n`
  str += adifField('ADIF_VER', '3.1.4', { newLine: true })
  str += adifField('PROGRAMID', 'Ham2K Portable Logger', { newLine: true })
  str += adifField('PROGRAMVERSION', packageJson.version, { newLine: true })
  if (operation.userTitle) str += adifField('X_HAM2K_OP_TITLE', escapeForHeader(operation.userTitle), { newLine: true })
  if (operation.notes) str += adifField('X_HAM2K_OP_NOTES', escapeForHeader(operation.notes), { newLine: true })
  if (handler.adifFieldsForHeader) {
    str += escapeForHeader(handler.adifFieldsForHeader({ qsos, operation, common, mainHandler: true }) ?? []).join('\n')
  }
  if (handler?.adifHeaderComment) str += escapeForHeader(handler.adifHeaderComment({ qsos, operation, common, mainHandler: true })) + '\n'
  str += '<EOH>\n'

  qsos.forEach(qso => {
    if (qso.deleted) return

    let handlerFieldCombinations
    if (handler?.adifFieldCombinationsForOneQSO) {
      handlerFieldCombinations = handler.adifFieldCombinationsForOneQSO({ qso, operation, common, exportType, mainHandler: true })
    } else if (handler?.adifFieldsForOneQSO) {
      handlerFieldCombinations = [handler.adifFieldsForOneQSO({ qso, operation, common, exportType, mainHandler: true })]
    } else {
      handlerFieldCombinations = [[]]
    }

    if (handlerFieldCombinations === false || handlerFieldCombinations[0] === false) return

    handlerFieldCombinations.forEach((combinationFields, index) => {
      let fields = adifFieldsForOneQSO(qso, operation, common, index * 1000)
      fields = fields.concat(combinationFields)

      ;(qso.refs || []).forEach(ref => {
        const exportHandler = findBestHook(`ref:${ref.type}`)
        if (exportHandler && exportHandler.key !== handler.key && exportHandler.adifFieldsForOneQSO) {
          const refFields = exportHandler.adifFieldsForOneQSO({ qso, operation: operationWithoutRefs, common, exportType, ref }) || []
          refFields.forEach(refField => {
            const existingField = fields.find(field => Object.keys(field)[0] === Object.keys(refField)[0])
            if (existingField) {
              // Another field with the same name already exists. Keep the first one defined and ignore this one
              // unless it is `false`, in which case the field should be removed.
              if (refField[1] === false) {
                existingField[1] = false
              }
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

function escapeForHeader (str) {
  if (!str) return ''
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function modeToADIF (mode, freq, qsoInfo) {
  const modeAndSubmode = adifModeAndSubmodeForMode(mode)
  if (modeAndSubmode.length > 1) {
    return [{ MODE: modeAndSubmode[0] }, { SUBMODE: modeAndSubmode[1] }]
  } else if (mode) {
    return [{ MODE: mode }]
  } else if (freq) {
    return [{ MODE: modeForFrequency(freq, qsoInfo) ?? 'SSB' }]
  } else {
    return [{ MODE: 'SSB' }]
  }
}

function adifFieldsForOneQSO (qso, operation, common, timeOfffset = 0) {
  return [
    { CALL: qso.their.call },
    ...modeToADIF(qso.mode, qso.freq, qso?.our),
    { BAND: qso.band && qso.band !== 'other' ? qso.band : undefined },
    { FREQ: ((qso.freq || frequencyForBand(qso.band, qso.mode)) / 1000).toFixed(6) },
    { TX_PWR: qso.power },
    { QSO_DATE: fmtADIFDate(qso.startAtMillis + timeOfffset) },
    { TIME_ON: fmtADIFTime(qso.startAtMillis + timeOfffset) },
    { RST_RCVD: qso.their.sent },
    { RST_SENT: qso.our.sent },
    { SRX_STRING: qso.their.exchange },
    { STX_STRING: qso.our.exchange },
    { STATION_CALLSIGN: qso.our.call || common.stationCall },
    { OPERATOR: qso.our.operatorCall || common.operatorCall || qso.our.call || common.stationCall },
    { NOTES: qso.notes },
    { COMMENT: qso.notes },
    { GRIDSQUARE: qso.their?.grid ?? qso.their?.guess?.grid },
    { MY_GRIDSQUARE: qso?.our?.grid ?? common.grid },
    { NAME: qso.their?.name ?? qso.their?.guess?.name },
    { DXCC: qso.their?.dxccCode ?? qso.their?.guess?.dxccCode },
    { QTH: qso.their?.city ?? qso.their?.guess?.city },
    { COUNTRY: qso.their?.country ?? qso.their?.guess?.country },
    { STATE: qso.their?.state ?? qso.their?.guess?.state },
    { CQZ: qso.their?.cqZone ?? qso.their?.guess?.cqZone },
    { ITUZ: qso.their?.ituZone ?? qso.their?.guess?.ituZone },
    { ARRL_SECT: qso.their.arrlSection }
  ]
}

function adifRow (fields) {
  return fields
    .filter(field => field[1] !== false)
    .map(field => adifField(Object.keys(field)[0], Object.values(field)[0]))
    .join('') + '<EOR>\n'
}

function adifField (name, value, options = {}) {
  if (!value && !options.force) return ''
  if (typeof value !== 'string') value = value.toString()

  value = sanitizeToISO8859(value)

  return `<${name}:${value?.length ?? 0}>${value}${options.newLine ? '\n' : ' '}`
}
