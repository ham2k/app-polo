import { fmtDateZulu } from '../../../tools/timeFormats'
import { dbSelectAll } from '../../db/db'

export async function findQSOHistory (call, options = {}) {
  const whereClauses = ['qsos.theirCall = ?']
  const whereArgs = [call]

  if (options.onDate) {
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
    whereArgs
  )

  qsos = qsos.filter(qso => {
    if (qso.deleted === undefined) {
      const data = JSON.parse(qso.data)
      return !data.deleted
    } else {
      return !qso.deleted
    }
  })
  return qsos
}
