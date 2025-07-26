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
import { Info } from './SiOTAInfo'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const SiOTAData = { }

export function registerSiOTADataFile () {
  registerDataFile({
    key: 'siota-all-silos',
    name: 'SiOTA: All Silos',
    description: 'Database of all SiOTA references',
    infoURL: 'https://www.silosontheair.com',
    icon: 'file-cloud-outline',
    maxAgeInDays: 100,
    enabledByDefault: true,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.silosontheair.com/data/silos.csv'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const headers = parseSiOTACSVRow(lines.shift())

          let totalReferences = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['siota'])
          })

          const startTime = Date.now()
          let processedLines = 0
          const totalLines = lines.length

          while (lines.length > 0) {
            const batch = lines.splice(0, 250)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const line of batch) {
                    const row = parseSiOTACSVRow(line, { headers })
                    const ref = row.SILO_CODE
                    if (Info.referenceRegex.test(ref)) {
                      const data = {
                        ref,
                        name: row.NAME,
                        location: row.LOCALITY,
                        state: row.STATE,
                        grid: row.LOCATOR,
                        lat: Number.parseFloat(row.LAT),
                        lon: Number.parseFloat(row.LNG)
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
                      `, ['siota', data.state, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.state, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['siota'])
          })

          return {
            totalReferences,
            version: fmtDateNice(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      SiOTAData.totalRefs = data.totalRefs
      SiOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['siota'])
    }
  })
}

export async function siotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['siota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function siotaFindAllByName (name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['siota', `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function siotaFindAllByLocation (lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['siota', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

const OPTIONAL_QUOTED_CSV_ROW_REGEX = /(?<=^|,)(?:(?:"((?:[^"]|"")*)")|([^,]*))(?:,|$)/g
function parseSiOTACSVRow (row, options) {
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
