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

export const SOTAData = {}

export function registerSOTADataFile () {
  registerDataFile({
    key: 'sota-all-summits',
    name: 'SOTA: All Summits',
    description: 'Database of all SOTA references',
    infoURL: 'https://www.sotadata.org.uk/en/summits',
    icon: 'file-image-outline',
    maxAgeInDays: 100,
    enabledByDefault: false,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.sotadata.org.uk/summitslist.csv'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const versionRow = lines.shift()
          const headers = parseSOTACSVRow(lines.shift()).filter(x => x)

          let totalSummits = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['sota'])
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
                    const row = parseSOTACSVRow(line, { headers })
                    if (row.SummitCode && row.ValidTo === '31/12/2099') {
                      const lon = Number.parseFloat(row.Longitude) || 0
                      const lat = Number.parseFloat(row.Latitude) || 0
                      const data = {
                        ref: row.SummitCode.toUpperCase(),
                        grid: locationToGrid6(lat, lon),
                        altitude: Number.parseInt(row.AltM, 10),
                        region: row.RegionName,
                        association: row.AssociationName,
                        lat,
                        lon
                      }
                      if (data.ref !== row.SummitName) data.name = row.SummitName

                      totalSummits++
                      transaction.executeSql(`
                        INSERT INTO lookups
                          (category, subCategory, key, name, data, lat, lon, flags, updated)
                        VALUES
                          (?, ?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT DO
                        UPDATE SET
                          subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                        `, ['sota', data.region, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.region, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['sota'])
          })

          return {
            totalSummits,
            version: versionRow
          }
        }
      })
    },
    onLoad: (data) => {
      if (data.regions) return false // Old data - TODO: Remove this after a few months

      SOTAData.totalSummits = data.totalSummits
      SOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['sota'])
    }
  })
}

export async function sotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['sota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function sotaFindAllByName (dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['sota', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function sotaFindAllByLocation (dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['sota', lat - delta, lat + delta, lon - delta, lon + delta],
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

function parseSOTACSVRow (row, options) {
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
