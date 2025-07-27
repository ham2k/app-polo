/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fmtDateNice } from '../../../tools/timeFormats'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const HSOTAData = { }

export function registerHSOTADataFile () {
  registerDataFile({
    key: 'hsota-all-references',
    name: 'HSOTA: All References',
    description: 'Database of all HSOTA references',
    infoURL: 'https://hamlog.online/geo/hsota/listreferences/',
    icon: 'file-cloud-outline',
    maxAgeInDays: 100,
    enabledByDefault: true,
    fetch: async (args) => {
      const { key, definition, options } = args
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://hamlog.online/api/v1/hsota/hsotalist/'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const refsObj = JSON.parse(body)
          const refs = Object.entries(refsObj)
          console.log(refs)

          const totalRefs = refs.length

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['hsota'])
          })

          const startTime = Date.now()
          let processedRefs = 0

          while (refs.length > 0) {
            const batch = refs.splice(0, 50)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const ref of batch) {
                    const data = {
                      ref: ref[0],
                      name: ref[1].name,
                      grid: ref[1].loc?.replace(/[A-Z]{2}$/, x => x.toLowerCase()),
                      lat: ref[1].lat,
                      lon: ref[1].lon,
                      prefix: ref[0].split('/', 1)[0]
                    }

                    transaction.executeSql(`
                    INSERT INTO lookups
                      (category, subCategory, key, name, data, lat, lon, flags, updated)
                    VALUES
                      (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    ON CONFLICT DO
                    UPDATE SET
                      subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                    `, ['hsota', data.prefix, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.assetType, data.name, JSON.stringify(data), data.lat, data.lon, 1]
                    )
                    processedRefs++
                  }
                  options.onStatus && await options.onStatus({
                    key,
                    definition,
                    status: 'progress',
                    progress: `Loaded \`${fmtNumber(processedRefs)}\` references.\n\n\`${fmtPercent(Math.min(processedRefs / totalRefs, 1), 'integer')}\` • ${fmtNumber((totalRefs - processedRefs) * ((Date.now() - startTime) / 1000) / processedRefs, 'oneDecimal')} seconds left.`
                  })
                  resolve()
                })
              }, 0)
            }))()
          }

          db.transaction(transaction => {
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['hsota'])
          })

          return {
            totalReferences: totalRefs,
            version: fmtDateNice(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      HSOTAData.totalRefs = data.totalRefs
      HSOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['hsota'])
    }
  })
}

export async function hsotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['hsota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function hsotaFindAllByName (name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['hsota', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function hsotaFindAllByLocation (lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['hsota', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}
