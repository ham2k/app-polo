import { dbSelectAll } from '../../db/db'

export async function findQSOHistory (call) {
  const qsos = await dbSelectAll(
    'SELECT key, ourCall, theirCall, operation, startOnMillis, band, mode FROM qsos WHERE theirCall = ? ORDER BY startOnMillis DESC', [call]
  )

  return qsos
}
