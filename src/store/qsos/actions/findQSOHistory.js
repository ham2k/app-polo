import { dbSelectAll } from '../../db/db'

export async function findQSOHistory (call) {
  let qsos = await dbSelectAll(
    `
    SELECT
      qsos.key, qsos.ourCall, qsos.theirCall, qsos.operation, qsos.startOnMillis, qsos.band, qsos.mode, qsos.data
    FROM
      qsos
    INNER JOIN operations ON operations.uuid = qsos.operation -- avoid orphaned qsos
    WHERE qsos.theirCall = ?
    ORDER BY startOnMillis DESC
    `,
    [call]
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
