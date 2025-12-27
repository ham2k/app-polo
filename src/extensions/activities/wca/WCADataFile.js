/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/*
 * Based on https://docs.google.com/spreadsheets/d/16-GsekTXYlwdZy9Ho5vaZjKAON4WtCdzRiTSMMDtUJg/edit?gid=0#gid=0
 * as provided by ON4VT Danny
 * and extracted to polo.ham2k.com/data/activities/wca/all-castles.csv
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import GLOBAL from '../../../GLOBAL'

import { fmtDateTimeNiceZulu } from '../../../tools/timeFormats'
import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'
import { Info } from './WCAInfo'
import { configureReanimatedLogger } from 'react-native-reanimated'

export const WCAData = {}

export function registerWCADataFile() {
  registerDataFile({
    key: 'wca-all-castles',
    name: 'WCA: All Castles',
    description: 'Database of all WCA references',
    infoURL: 'https://wcagroup.org/',
    icon: 'file-certificate-outline',
    maxAgeInDays: 100,
    enabledByDefault: false,
    fetch: async (args) => {
      const { key, definition, options } = args
      options.onStatus && await options.onStatus({
        key, definition, status: 'progress',
        progress: GLOBAL?.t?.(
          'extensions.dataFiles.loading.downloadingRawData',
          'Downloading raw data…'
        ) || 'Downloading raw data…'
      })

      const url = 'https://polo.ham2k.com/data/activities/wca/all-castles.csv'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const headers = parseWCACSVRow(lines.shift()).filter(x => x).map(x => x.trim())

          let totalRefs = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['wca'])
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
                    const row = parseWCACSVRow(line, { headers })

                    if (row['REF'] && Info.referenceRegex.test(row['REF'])) {
                      let lon, lat, grid
                      if (row['COORDINATES'] && row['COORDINATES'].includes(',')) {
                        const [latStr, lonStr] = row['COORDINATES'].split(',')
                        lon = Number.parseFloat(lonStr)
                        lat = Number.parseFloat(latStr)
                        grid = locationToGrid6(lat, lon)
                      }
                      const data = {
                        ref: row['REF'].toUpperCase(),
                        prefix: row['PREFIX'],
                        name: row['CLEAN NAME'],
                        location: row['CLEAN LOCATION'],
                        grid,
                        lat,
                        lon
                      }

                      totalRefs++
                      transaction.executeSql(`
                        INSERT INTO lookups
                          (category, subCategory, key, name, data, lat, lon, flags, updated)
                        VALUES
                          (?, ?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT DO
                        UPDATE SET
                          subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                        `, ['wca', data.prefix, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.prefix, data.name, JSON.stringify(data), data.lat, data.lon, 1]
                      )
                    }
                    processedLines++
                  }

                  options.onStatus && await options.onStatus({
                    key,
                    definition,
                    status: 'progress',
                    progress: GLOBAL?.t?.(
                      'extensions.dataFiles.loading.progress',
                      'Loaded \`{{processedLines}}\` references.\n\n\`{{percent}}\` • {{secondsLeft}} seconds left.',
                      {
                        processedLines: fmtNumber(processedLines),
                        percent: fmtPercent(Math.min(processedLines / totalLines, 1), 'integer'),
                        secondsLeft: fmtNumber((totalLines - processedLines) * ((Date.now() - startTime) / 1000) / processedLines, 'oneDecimal')
                      }
                    ) || `Loading... ${fmtPercent(Math.min(processedLines / totalLines, 1), 'integer')}`
                  })
                  resolve()
                })
              }, 0)
            }))()
          }

          db.transaction(transaction => {
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['wca'])
          })

          return {
            totalRefs,
            version: fmtDateTimeNiceZulu(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      WCAData.totalRefs = data.totalRefs
      WCAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['wca'])
    }
  })
}

export async function wcaFindOneByReference(ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['wca', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function wcaFindAllByName(dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['wca', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function wcaFindAllByLocation(dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['wca', lat - delta, lat + delta, lon - delta, lon + delta],
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

function parseWCACSVRow(row, options) {
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
