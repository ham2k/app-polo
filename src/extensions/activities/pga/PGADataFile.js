/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fmtDateNice } from '../../../tools/timeFormats'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const PGAData = {}

export function registerPGADataFile () {
  registerDataFile({
    key: 'pga-gminas',
    name: 'PGA: Gminas',
    description: 'Database of all PGA references',
    infoURL: 'https://pga-zawody.pzk.pl/lista.php',
    icon: 'file-powerpoint-outline',
    maxAgeInDays: 100,
    enabledByDefault: false,
    fetch: async (args) => {
      const { key, definition, options } = args
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.sq7acp.pl/files/PGA_LIST.csv'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const headers = parsePGACSVRow(lines.shift()).filter(x => x).map(x => x.trim())

          let totalGminas = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['pga'])
          })

          const startTime = Date.now()
          let processedLines = 0
          const totalLines = lines.length

          while (lines.length > 0) {
            const batch = lines.splice(0, 197)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const line of batch) {
                    const row = parsePGACSVRow(line, { headers })
                    if (row.ACTIVE === 'YES') {
                      const lon = Number.parseFloat(row.LONG)
                      const lat = Number.parseFloat(row.LAT)
                      const data = {
                        ref: row['PGA REF.'],
                        name: row.GMINA,
                        grid: row['GRID LOCATOR'],
                        county: row.POWIAT,
                        province: row.VOIVODESHIP,
                        lat,
                        lon
                      }

                      totalGminas++
                      transaction.executeSql(`
                        INSERT INTO lookups
                          (category, subCategory, key, name, data, lat, lon, flags, updated)
                        VALUES
                          (?, ?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT DO
                        UPDATE SET
                          subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                        `, ['pga', data.county, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.county, data.name, JSON.stringify(data), data.lat, data.lon, 1]
                      )
                    }
                    processedLines++
                  }
                  options.onStatus && await options.onStatus({
                    key,
                    definition,
                    status: 'progress',
                    progress: `Loaded \`${fmtNumber(processedLines)}\` references.\n\n\`${fmtPercent(Math.min(processedLines / totalLines, 1), 'integer')}\` • ${fmtNumber((totalLines - processedLines) * ((Date.now() - startTime) / 1000) / processedLines, 'oneDecimal')} seconds left.`
                  })
                  resolve()
                })
              }, 0)
            }))()
          }

          db.transaction(transaction => {
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['pga'])
          })

          return {
            totalGminas,
            version: fmtDateNice(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      PGAData.totalGminas = data.totalGminas
      PGAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['pga'])
    }
  })
}

export async function pgaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['pga', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function pgaFindAllByName (name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['pga', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function pgaFindAllByLocation (lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['pga', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

const CSV_ROW_REGEX = /(?:"((?:[^"]|"")*)"|([^",]*))(?:,|\s*$)/g
// (?:              # Start of non-capturing group for each column
//   "((?:[^"]|"")*)" #   Match a quoted string, capturing the contents
//   |              #   Or
//   ([^",]*)         #   Match an unquoted string
// )                # End of non-capturing group for each column
// (?:,|\s*$)       # Match either a comma or the end of the line

function parsePGACSVRow (row, options) {
  const parts = [...row.matchAll(CSV_ROW_REGEX)].map(match => match[1]?.replaceAll('""', '"') ?? match[2] ?? '')

  if (options?.headers) {
    const obj = {}
    options.headers.forEach((column, index) => {
      obj[column] = parts[index]
    })
    return obj
  } else {
    return parts
  }
}
