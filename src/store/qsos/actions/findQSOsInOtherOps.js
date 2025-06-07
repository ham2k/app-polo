/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { dbSelectAll } from '../../db/db'
import { prepareQSORow } from './qsosDB'

export async function findQSOsInOtherOps (calls, options = {}) {
  const whereClauses = []
  const whereArgs = []

  if (options.startMillis) {
    whereClauses.push('qsos.startOnMillis >= ?')
    whereArgs.push(options.startMillis)
  }

  if (options.endMillis) {
    whereClauses.push('qsos.startOnMillis <= ?')
    whereArgs.push(options.endMillis)
  }

  const uuid = options.uuid ?? options.operation?.uuid

  // TODO: Rename `startOnMillis` to `startAtMillis` in the database
  let rows = await dbSelectAll(
    `
    SELECT
      qsos.key, qsos.ourCall, qsos.theirCall, qsos.operation, qsos.startOnMillis, qsos.band, qsos.mode, qsos.data
    FROM
      qsos
    LEFT OUTER JOIN operations ON operations.uuid = qsos.operation
    WHERE
      (operations.uuid IS NOT NULL AND qsos.operation <> 'historical' AND qsos.operation <> '${uuid}')  -- avoid orphaned qsos
      AND (operations.deleted = 0 OR operations.deleted IS NULL)
      AND (qsos.deleted = 0 OR qsos.deleted IS NULL)
      AND qsos.theirCall IN (${calls.map(c => `'${c}'`).join(',')})
      AND ${whereClauses.join(' AND ')}
    `,
    whereArgs
  )

  rows = rows.filter(row => !row.deleted)
  rows.forEach(row => {
    if (row.startOnMillis) {
      row.startAtMillis = row.startOnMillis
      delete row.startOnMillis
    }
  })

  return rows.map(row => prepareQSORow(row))
}
