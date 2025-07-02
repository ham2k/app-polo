/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../package.json'
import { findBestHook } from '../extensions/registry'
import { basePartialTemplates, compileTemplateForOperation, extraDataForTemplates, templateContextForOneExport } from '../store/operations'
import { selectExportSettings } from '../store/settings'
import { sanitizeToISO8859 } from './stringTools'
import { fmtADIFDate, fmtADIFTime } from './timeFormats'

import { adifModeAndSubmodeForMode, frequencyForBand, modeForFrequency } from '@ham2k/lib-operation-data'

export function qsonToADIF ({ operation, settings, qsos, handler, format, title, exportType, ADIFNotesTemplate, ADIFCommentTemplate, ADIFQslMsgTemplate }) {
  const templates = {
    key: `${handler.key}-${format}-${exportType ?? 'export'}`
  }

  const defaultSettings = selectExportSettings({ settings }, 'default')
  const handlerSettings = selectExportSettings({ settings }, templates.key, (handler?.defaultExportSettings && handler?.defaultExportSettings()))

  templates.exportSettings = { ...defaultSettings, ...handlerSettings }
  const privateData = (templates.exportSettings.privateData ?? handlerSettings.privateDataDefault)

  templates.context = templateContextForOneExport({ settings, operation, handler })
  templates.partials = basePartialTemplates({ settings })
  templates.data = extraDataForTemplates({ settings })

  templates.notesTemplate = compileTemplateForOperation(templates.exportSettings?.ADIFNotesTemplate || ADIFNotesTemplate || '{{>ADIFNotes}}', templates)
  templates.commentsTemplate = compileTemplateForOperation(templates.exportSettings?.ADIFCommentTemplate || ADIFCommentTemplate || '{{>ADIFComment}}', templates)
  templates.qslmsgTemplate = compileTemplateForOperation(templates.exportSettings?.ADIFQslMsgTemplate || ADIFQslMsgTemplate || '{{>ADIFQslMsg}}', templates)

  const common = {
    refs: operation.refs,
    grid: operation.grid,
    stationCall: operation.stationCall ?? settings.operatorCall,
    templates
  }

  if (operation.stationCall !== settings.operatorCall) {
    common.operatorCall = settings.operatorCall
  }
  if (operation.local?.operatorCall || operation.operatorCall) {
    common.operatorCall = operation.local?.operatorCall || operation.operatorCall
  }

  let str = ''
  str += `ADIF for ${title || ([common.stationCall, operation?.title, operation.subTitle].filter(x => x).join(' ')) || 'Operation'} \n`
  str += adifField('ADIF_VER', '3.1.4', { newLine: true })
  str += adifField('PROGRAMID', 'Ham2K Portable Logger', { newLine: true })
  str += adifField('PROGRAMVERSION', packageJson.version, { newLine: true })
  if (operation.userTitle && privateData) str += adifField('X_HAM2K_OP_TITLE', escapeForHeader(operation.userTitle), { newLine: true })
  if (operation.notes && privateData) str += adifField('X_HAM2K_OP_NOTES', escapeForHeader(operation.notes), { newLine: true })
  if (handler.adifFieldsForHeader) {
    str += escapeForHeader(handler.adifFieldsForHeader({ qsos, operation, common, mainHandler: true, privateData, templates }) ?? []).join('\n')
  }
  if (handler?.adifHeaderComment) str += escapeForHeader(handler.adifHeaderComment({ qsos, operation, common, mainHandler: true, privateData, templates })) + '\n'
  str += '<EOH>\n'

  qsos.forEach(qso => {
    if (qso.deleted) return

    // Get the base handler's field combinations for this QSO
    // it might return an array of arrays,
    // meaning this QSO has to be represented by multiple ADIF rows (think POTA P2P, or QSO Party county line operations)
    let handlerFieldCombinations
    if (handler?.adifFieldCombinationsForOneQSO) {
      handlerFieldCombinations = handler.adifFieldCombinationsForOneQSO({ qso, operation, common, exportType, mainHandler: true, privateData, templates })
    } else if (handler?.adifFieldsForOneQSO) {
      handlerFieldCombinations = [handler.adifFieldsForOneQSO({ qso, operation, common, exportType, mainHandler: true, templates, privateData })]
    } else {
      handlerFieldCombinations = [[]]
    }

    if (handlerFieldCombinations === false || handlerFieldCombinations[0] === false) return

    // Now, for each field combination, we will generate an ADIF row
    handlerFieldCombinations.forEach((combinationFields, n) => {
      // We start with the general ADIF fields
      let fields = adifFieldsForOneQSO({ qso, operation, common, privateData, templates, timeOffset: n * 1000 })
      // Then we append the fields from the main handler's combinations
      fields = fields.concat(combinationFields)

      // And finally, we look at any handlers for other refs in the operation, or refs in the QSO itself
      // and ask them for more fields to add to this QSO.
      ;[...qso.refs || [], ...operation.refs || []].forEach(ref => {
        const secondaryRefHandler = findBestHook(`ref:${ref.type}`)

        if (secondaryRefHandler?.key === handler.key) return // Skip if it happens to be the same as the main handler

        if (secondaryRefHandler && secondaryRefHandler.key !== handler.key && secondaryRefHandler.adifFieldsForOneQSO) {
          const refFields = secondaryRefHandler.adifFieldsForOneQSO({ qso, operation, common, exportType, ref, privateData, templates }) || []
          refFields.forEach(refField => {
            const existingField = fields.find(field => Object.keys(field)[0] === Object.keys(refField)[0])
            if (existingField) {
              // If another field with the same name already exists. Keep the first one defined and ignore this one
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

function adifFieldsForOneQSO ({ qso, operation, common, privateData, templates, timeOffset }) {
  timeOffset = timeOffset ?? 0
  const fields = [
    { CALL: qso.their.call },
    ...modeToADIF(qso.mode, qso.freq, qso?.our),
    { BAND: qso.band && qso.band !== 'other' ? qso.band : undefined },
    { FREQ: ((Number(qso.freq ?? frequencyForBand(qso.band, qso.mode)) / 1000).toFixed(6)) }, // Round to six decimals (Hz)
    { TX_PWR: qso.power },
    { QSO_DATE: fmtADIFDate(qso.startAtMillis + timeOffset) },
    { TIME_ON: fmtADIFTime(qso.startAtMillis + timeOffset) },
    { RST_RCVD: qso.their.sent },
    { RST_SENT: qso.our.sent },
    { SRX_STRING: qso.their.exchange },
    { STX_STRING: qso.our.exchange },
    { STATION_CALLSIGN: qso.our.call || common.stationCall },
    { OPERATOR: qso.our.operatorCall || common.operatorCall || qso.our.call || common.stationCall },
    { GRIDSQUARE: privateData && (qso.their?.grid ?? qso.their?.guess?.grid) },
    { MY_GRIDSQUARE: privateData && (qso?.our?.grid ?? common.grid) },
    { NAME: privateData && (qso.their?.name ?? qso.their?.guess?.name) },
    { DXCC: qso.their?.dxccCode ?? qso.their?.guess?.dxccCode },
    { QTH: privateData && (qso.their?.city ?? qso.their?.guess?.city) },
    { COUNTRY: qso.their?.country ?? qso.their?.guess?.country },
    { STATE: qso.their?.state ?? qso.their?.guess?.state },
    { CQZ: qso.their?.cqZone ?? qso.their?.guess?.cqZone },
    { ITUZ: qso.their?.ituZone ?? qso.their?.guess?.ituZone },
    { ARRL_SECT: qso.their.arrlSection }
  ]

  const templateContext = { ...templates.context, qso: { ...qso, notes: privateData ? qso.notes : '' } }
  let val
  if (templates.notesTemplate) {
    try {
      val = templates.notesTemplate(templateContext, { data: templates.data, partials: templates.partials })
      val = val.replaceAll(/\s+/g, ' ').trim()
    } catch (e) {
      console.error('Error compiling notes template', e)
      val = `ERROR: ${e.message}`
    }
    if (val) fields.push({ NOTES: val })
  }
  if (templates.commentsTemplate) {
    try {
      val = templates.commentsTemplate(templateContext, { data: templates.data, partials: templates.partials })
      val = val.replaceAll(/\s+/g, ' ').trim()
    } catch (e) {
      console.error('Error compiling comments template', e)
      val = `ERROR: ${e.message}`
    }
    if (val) fields.push({ COMMENT: val })
  }
  if (templates.qslmsgTemplate) {
    try {
      val = templates.qslmsgTemplate(templateContext, { data: templates.data, partials: templates.partials })
      val = val.replaceAll(/\s+/g, ' ').trim()
    } catch (e) {
      console.error('Error compiling qslmsg template', e)
      val = `ERROR: ${e.message}`
    }
    if (val) fields.push({ QSLMSG: val })
  }

  return fields
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
