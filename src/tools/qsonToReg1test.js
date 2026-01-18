/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { findRef } from './refTools'
import { fmtTimestamp } from './timeFormats'

const REG1TEST_MODE = {
  // Note, we don't support CW/SSB or SSB/CW split modes
  CW: 2,
  SSB: 1,
  FM: 6,
  AM: 5,
  RTTY: 7,
  SSTY: 8
}

export function qsonToReg1test({ operation, qsos, settings, handler, combineSegmentRefs }) {
  const ref = findRef(operation, handler.key)

  let str = ''

  str += '[REG1TEST;1]\n'
  if (handler.reg1testHeaders) {
    str += handler
      .reg1testHeaders({ operation, settings, headers: [] })
      .map((header) => header[1] ? `${header[0]}=${header[1]}` : '')
      .filter(x => x)
      .join('\n') + '\n'
  }

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

    let combinations = handler.qsoToReg1testParts && handler.qsoToReg1testParts({ qso, operation, ref })
    if (!Array.isArray(combinations?.[0])) {
      combinations = [combinations]
    }
    combinations.forEach(parts => {
      const qsoParts = []
      qsoParts.push(fmtTimestamp(parts.timeMillis).substring(2, 8))
      qsoParts.push(fmtTimestamp(parts.timeMillis).substring(8, 12))
      qsoParts.push(parts.theirCall)
      qsoParts.push(REG1TEST_MODE[parts.mode] || 0)
      qsoParts.push(parts.rstSent)
      qsoParts.push(parts.sequenceSent)
      qsoParts.push(parts.rstReceived)
      qsoParts.push(parts.sequenceReceived)
      qsoParts.push(parts.exchangeReceived)
      qsoParts.push(parts.wwlReceived)
      // We don't include any of the claimed points or multiplier fields

      str += parts.join(';') + '\n'
    })
  }

  return str
}
