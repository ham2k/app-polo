/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtTimestamp } from '@ham2k/lib-format-tools'

import { findRef } from './refTools'

const REG1TEST_MODE = {
  // Note, we don't support CW/SSB or SSB/CW split modes
  CW: 2,
  SSB: 1,
  FM: 6,
  AM: 5,
  RTTY: 7,
  SSTY: 8
}

export function qsonToReg1test ({ operation, qsos, settings, handler, combineSegmentRefs }) {
  const ref = findRef(operation, handler.key)

  let common = {
    refs: operation.refs,
    grid: operation.grid,
    state: operation.state,
    county: operation.county,
    stationCall: operation.stationCall ?? settings.operatorCall
  }

  let str = ''

  str += '[REG1TEST;1]\n'
  const defaultHeaders = {
    PCall: operation.stationCall ?? settings.operatorCall,
    RCall: operation.operatorCall ?? operation.stationCall ?? settings.operatorCall
  }

  let headers = {}
  if (handler.reg1testHeaders) {
    headers = handler.reg1testHeaders({ operation, settings, headers })
  }

  Object.entries({ ...defaultHeaders, ...headers }).forEach(([key, value]) => {
    if (value) str += `${key}=${value}\n`
  })

  if (operation.notes) {
    str += `[Remarks]\n${operation.notes}\n`
  }

  const actualCount = qsos.filter(qso => !qso.deleted && !qso.event).length

  str += `[QSORecords;${actualCount}]\n`

  for (const qso of qsos) {
    if (qso.deleted) continue
    if (qso.event) {
      if (qso.event.event === 'break' || qso.event.event === 'start') {
        if (combineSegmentRefs) {
          // Update all operation attributes, including regs
          operation = { ...operation, ...qso.event.operation }
          common = { ...common, ...qso.event.operation }
        } else {
          // Combine other attributes, but keep refs as initialized
          operation = { ...operation, ...qso.event.operation, refs: operation.refs }
          common = { ...common, ...qso.event.operation, refs: common.refs }
        }
      }
      continue
    }

    const defaultFields = {
      timeMillis: qso.startAtMillis,
      theirCall: qso.their.call,
      mode: qso.mode,
      band: qso.band,
      freq: qso.freq,
      rstSent: qso.our.sent,
      sequenceSent: qso.our.sequence,
      rstReceived: qso.their.sent,
      sequenceReceived: qso.their.sequence,
      exchangeReceived: qso.their.exchange,
      wwlReceived: qso.their.grid ?? qso.their.guess?.grid
    }

    let combinations = (handler.reg1testFieldsForOneQSO && handler.reg1testFieldsForOneQSO({ qso, operation, ref })) || [{}]

    if (!Array.isArray(combinations?.[0])) {
      combinations = [combinations]
    }
    combinations.forEach(fields => {
      const combinedFields = { ...defaultFields, ...fields }

      const qsoParts = []
      qsoParts.push(fmtTimestamp(combinedFields.timeMillis).substring(2, 8))
      qsoParts.push(fmtTimestamp(combinedFields.timeMillis).substring(8, 12))
      qsoParts.push(combinedFields.theirCall)
      qsoParts.push(REG1TEST_MODE[combinedFields.mode] || 0)
      qsoParts.push(combinedFields.rstSent)
      qsoParts.push(combinedFields.sequenceSent)
      qsoParts.push(combinedFields.rstReceived)
      qsoParts.push(combinedFields.sequenceReceived)
      qsoParts.push(combinedFields.exchangeReceived)
      qsoParts.push(combinedFields.wwlReceived)
      // We don't include any of the claimed points or multiplier fields

      str += combinedFields.join(';') + '\n'
    })
  }

  return str
}
