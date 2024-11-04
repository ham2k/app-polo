/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtDateZulu } from '../../../tools/timeFormats'
import { dbSelectAll } from '../../db/db'
import { prepareQSORow } from './qsosDB'

export async function findQSOHistory (call, options = {}) {
  const whereClauses = ['qsos.theirCall = ?']
  const whereArgs = [call]

  if (options.onDate) {
    // TODO: Rename `startOnMillis` to `startAtMillis` in the database
    whereClauses.push("strftime('%Y-%m-%d', qsos.startOnMillis / 1000, 'unixepoch') = ?")
    whereArgs.push(fmtDateZulu(options.onDate))
  }

  if (options.band) {
    whereClauses.push('qsos.band = ?')
    whereArgs.push(options.band)
  }

  if (options.mode) {
    whereClauses.push('qsos.mode = ?')
    whereArgs.push(options.mode)
  }

  // TODO: Rename `startOnMillis` to `startAtMillis` in the database
  let qsos = await dbSelectAll(
    `
    SELECT
      qsos.key, qsos.ourCall, qsos.theirCall, qsos.operation, qsos.startOnMillis, qsos.band, qsos.mode, qsos.data
    FROM
      qsos
    LEFT OUTER JOIN operations ON operations.uuid = qsos.operation
    WHERE
      (operations.uuid IS NOT NULL OR qsos.operation = 'historical')  -- avoid orphaned qsos
      AND ${whereClauses.join(' AND ')}
    ORDER BY startOnMillis DESC
    `,
    whereArgs,
    { row: prepareQSORow }
  )

  qsos = qsos.filter(qso => !qso.deleted)

  return qsos
}
