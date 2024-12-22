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

export function qsonToReg1test ({ operation, qsos, settings, handler }) {
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

  const actualQSOs = qsos.filter(qso => !qso.deleted)

  str += `[QSORecords;${actualQSOs.length}]\n`

  actualQSOs.forEach(qso => {
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
  })

  return str
}
