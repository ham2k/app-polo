import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'

import { fetchAndProcessURL } from "../../../store/dataFiles/actions/dataFileFS"
import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute } from '../../../store/db/db'

export function registerSKCCMembershipData() {
  registerDataFile({
    key: 'skcc-membership',
    name: 'SKCC: Membership',
    description: 'Database of all SKCC members',
    infoURL: 'https://www.skccgroup.com/',
    icon: 'file-key-outline',
    maxAgeInDays: 2,
    enabledByDefault: false,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.skccgroup.com/membership_data/skccdata.txt'

      return await fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const headers = parseSKCCHeaders(lines.shift())

          const db = await database()
          await dbExecute('UPDATE skccMembers SET updated = 0')

          const inserts = lines
            .map(line => parseSKCCRow(line, headers))
            .filter(row => row.SKCCNR && row.SKCCNR !== '')
            .map(row => {
              const joinDate = parseSKCCDate(row.JOINDATE)
              const centDate = parseSKCCDate(row.CENTDATE)
              const tribDate = parseSKCCDate(row.TRIBDATE)
              const tx8Date = parseSKCCDate(row.TX8DATE)
              const senDate = parseSKCCDate(row.SENDATE)
              const query = `
            INSERT into skccMembers
              (skcc, skccNr, call, name, qth, spc, oldCall, dxCode, joinDate, centDate, tribDate, tx8Date, senDate, dxEntity, updated)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT DO
            UPDATE SET
              skccNr = ?, call = ?, name = ?, qth = ?, spc = ?, oldCall = ?, dxCode = ?, joinDate = ?, centDate = ?, tribDate = ?, tx8Date = ?, senDate = ?, dxEntity = ?, updated = 1
            `
              const args = [row.SKCC, row.SKCCNR, row.CALL, row.NAME, row.QTH, row.SPC, row.OLDCALL, row.DXCODE, joinDate, centDate, tribDate, tx8Date, senDate, row.DXENTITY]
              return { query, args }
            })
          const totalMembers = inserts.length

          const startTime = Date.now()
          let processedMembers = 0
          while (inserts.length > 0) {
            await new Promise((resolve, reject) => {
              db.transaction(transaction => {
                inserts.splice(0, 797).forEach(({ query, args }) => {
                  transaction.executeSql(query, args, (_, resultSet) => { processedMembers += resultSet.rowsAffected })
                })
              }, (error) => {
                reject(error)
              }, () => {
                resolve()
              })
            })

            options.onStatus && await options.onStatus({
              key,
              definition,
              status: 'progress',
              progress: `Loaded \`${fmtNumber(processedMembers)}\` members.\n\n\`${fmtPercent(Math.min(processedMembers / totalMembers, 1), 'integer')}\` • ${fmtNumber((totalMembers - processedMembers) * ((Date.now() - startTime) / 1000) / processedMembers, 'oneDecimal')} seconds left.`
            })
          }

          await dbExecute('DELETE FROM skccMembers WHERE updated = 0')

          return { totalMembers }
        }
      })
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM skccMembers')
    }
  })
}

function parseSKCCHeaders(row) {
  if (!row) {
    return []
  }

  return row.split('|')
}

function parseSKCCRow(row, headers) {
  const parts = row.split('|')
  const obj = {}

  headers.forEach((column, index) => {
    obj[column] = parts[index]
  })

  return obj
}

function parseSKCCDate(date) {
  if (!date) {
    return
  }

  const parts = date.split(' ')
  if (parts.length !== 3) {
    console.warn(`Unexpected SKCC date format: ${date}`)
    return
  }

  const [day, month, year] = parts
  return [year, month, day].join('-')
}
