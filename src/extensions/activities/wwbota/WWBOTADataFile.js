/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { Buffer } from 'buffer'

import packageJson from '../../../../package.json'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fmtDateNice } from '../../../tools/timeFormats'

export const WWBOTAData = { }

export function registerWWBOTADataFile () {
  registerDataFile({
    key: 'wwbota-all-bunkers',
    name: 'WWBOTA: All Bunkers',
    description: 'Database of all WWBOTA references',
    infoURL: 'https://bunkerbase.org',
    icon: 'file-cloud-outline',
    maxAgeInDays: 100,
    enabledByDefault: true,
    fetch: async ({ key, definition, options }) => {
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://drive.google.com/uc?id=1ea3j9S4VzcDttMPs_9WOj-4L_DzfcUhR'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const data64 = await RNFetchBlob.fs.readFile(response.data, 'base64')
      const buffer = Buffer.from(data64, 'base64')
      const body = buffer.toString('utf8')

      const lines = body.split('\n')
      const headers = parseWWBOTACSVRow(lines.shift())
      headers[0] = headers[0].replace(/^\uFEFF/, '')

      let totalReferences = 0

      const db = await database()
      db.transaction(transaction => {
        transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['wwbota'])
      })

      const startTime = Date.now()
      let processedLines = 0
      const totalLines = lines.length

      while (lines.length > 0) {
        const batch = lines.splice(0, 500)
        await (() => new Promise(resolve => {
          setTimeout(() => {
            db.transaction(async transaction => {
              for (const line of batch) {
                const row = parseWWBOTACSVRow(line, { headers })
                const ref = row['UKBOTA Reference']
                if (ref) {
                  row.Maidenhead &&= row.Maidenhead.replace(/[A-Z]{2}$/, x => x.toLowerCase())
                  const data = {
                    ref,
                    entityPrefix: ref.split('-')[0].split('/')[1],
                    name: row['Bunker Name'],
                    area: row.Area,
                    grid: row.Maidenhead,
                    lat: Number.parseFloat(row.Latitude),
                    lon: Number.parseFloat(row.Longitude)
                  }

                  totalReferences++
                  transaction.executeSql(`
                  INSERT INTO lookups
                    (category, subCategory, key, name, data, lat, lon, flags, updated)
                  VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, 1)
                  ON CONFLICT DO
                  UPDATE SET
                    subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                  `, ['wwbota', data.entityPrefix, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.entityPrefix, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
        transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['wwbota'])
      })

      db.transaction(transaction => {
        transaction.executeSql('DELETE FROM lookups WHERE category = ?', ['ukbota']) // Legacy
      })

      const data = {
        totalReferences,
        version: fmtDateNice(new Date())
      }

      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      WWBOTAData.totalRefs = data.totalRefs
      WWBOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['wwbota'])
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['ukbota']) // Legacy
    }
  })
}

export async function wwbotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['wwbota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function wwbotaFindAllByName (entityPrefix, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['wwbota', entityPrefix, `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function wwbotaFindAllByLocation (entityPrefix, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['wwbota', entityPrefix, lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

const OPTIONAL_QUOTED_CSV_ROW_REGEX = /(?<=^|,)(?:(?:"((?:[^"]|"")*)")|([^,]*))(?:,|$)/g
function parseWWBOTACSVRow (row, options) {
  const parts = [...row.matchAll(OPTIONAL_QUOTED_CSV_ROW_REGEX)].map(
    match => match[1] ? match[1].replaceAll('""', '"') : match[2])
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
