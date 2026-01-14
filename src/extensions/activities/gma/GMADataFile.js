/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const GMAData = {}

export function registerGMADataFile() {
  registerDataFile({
    key: 'gma-all-summits',
    name: 'GMA: All Summits',
    description: 'Database of all GMA references',
    infoURL: 'https://www.cqgma.org/smtdsp.php',
    icon: 'file-image-outline',
    maxAgeInDays: 100,
    fetch: async (args) => {
      const { key, definition, options } = args
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.cqgma.org/gma_summits.csv'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const versionRow = lines.shift()
          const headers = parseGMACSVRow(lines.shift()).filter(x => x).map(x => x.trim())

          let totalSummits = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['gma'])
          })

          const startTime = Date.now()
          let processedLines = 0
          const totalLines = lines.length

          while (lines.length > 0) {
            const batch = lines.splice(0, 797)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const line of batch) {
                    const row = parseGMACSVRow(line, { headers })
                    if (row.deleted === '0') {
                      const lon = Number.parseFloat(row.Longitude)
                      const lat = Number.parseFloat(row.Latitude)
                      const grid = !row['Maidenhead Locator'] ? locationToGrid6(lat, lon) : row['Maidenhead Locator'].replace(/[A-Z]{2}$/, x => x.toLowerCase())
                      const data = {
                        ref: row.Reference.toUpperCase(),
                        prefix: row.Reference.split('/')[0],
                        name: row.Name,
                        grid,
                        altitude: Number.parseInt(row['Height (m)'], 10),
                        lat,
                        lon
                      }

                      totalSummits++
                      transaction.executeSql(`
                        INSERT INTO lookups
                          (category, subCategory, key, name, data, lat, lon, flags, updated)
                        VALUES
                          (?, ?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT DO
                        UPDATE SET
                          subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                        `, ['gma', data.prefix, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.prefix, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['gma'])
          })

          return {
            totalSummits,
            version: versionRow
          }
        }
      })
    },
    onLoad: (data) => {
      GMAData.totalSummits = data.totalSummits
      GMAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['gma'])
    }
  })
}

export async function gmaFindOneByReference(ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['gma', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function gmaFindAllByName(dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['gma', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function gmaFindAllByLocation(dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['gma', lat - delta, lat + delta, lon - delta, lon + delta],
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

function parseGMACSVRow(row, options) {
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
