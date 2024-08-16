/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import packageJson from '../../../../package.json'
import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'

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
    fetch: async ({ options, key, definition }) => {
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.sotadata.org.uk/summitslist.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const db = await database()
      db.transaction(transaction => {
        transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['sota'])
      })

      const approxTotalLines = 175000 // Better way to get this?
      let processedLines = 0
      let totalLines = 0
      let totalSummits = 0
      let headers

      async function processBatch (batch) {
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
                progress: `Loaded \`${fmtNumber(processedLines)}\` references.\n\n\`${fmtPercent(Math.min(processedLines / Math.max(totalLines, approxTotalLines), 1), 'integer')}\``
              })
              resolve()
            })
          }, 0)
        }))()
      }

      return new Promise((resolve, reject) => {
        let buffer = ''
        let versionRow
        const promises = []
        RNFetchBlob.fs.readStream(response.data, 'utf8', 102400, 400).then((stream) => {
          stream.onData((chunk) => {
            buffer += chunk
            const lines = buffer.split('\n')
            buffer = lines.pop()
            totalLines += lines.length
            if (lines.length > 0 && processedLines === 0) {
              versionRow = lines.shift()
              processedLines++
            }
            if (lines.length > 0 && processedLines === 1) {
              headers = parseSOTACSVRow(lines.shift()).filter(x => x)
              processedLines++
            }
            if (lines.length > 0) {
              promises.push(processBatch(lines))
            }
          })
          stream.onEnd(() => {
            RNFetchBlob.fs.unlink(response.data)
            if (buffer.length > 0) {
              promises.push(processBatch(buffer.split('\n')))
            }
            resolve(Promise.all(promises).then(() => {
              db.transaction(transaction => {
                transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['sota'])
              })
              return { totalSummits, version: versionRow }
            }))
          })
          stream.onError((err) => {
            RNFetchBlob.fs.unlink(response.data)
            reject(err)
          })
          stream.open()
        })
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
