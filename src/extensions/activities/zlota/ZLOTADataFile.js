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
import { fmtDateNice } from '../../../tools/timeFormats'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const ZLOTAData = { }

export function registerZLOTADataFile () {
  registerDataFile({
    key: 'zlota-all-references',
    name: 'ZLOTA: All References',
    description: 'Database of all ZLOTA references',
    infoURL: 'https://ontheair.nz',
    icon: 'file-cloud-outline',
    maxAgeInDays: 100,
    enabledByDefault: true,
    fetch: async (args) => {
      const { key, definition, options } = args
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://ontheair.nz/assets/assets.json'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const refs = JSON.parse(body)

          const totalRefs = refs.length

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['zlota'])
          })

          const startTime = Date.now()
          let processedRefs = 0

          while (refs.length > 0) {
            const batch = refs.splice(0, 251)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const ref of batch) {
                    // fallback on code in reference
                    const grid = locationToGrid6(ref.y, ref.x)
                    const data = {
                      ref: ref.code,
                      name: ref.name,
                      assetType: ref.asset_type,
                      grid,
                      lat: ref.y,
                      lon: ref.x
                    }

                    transaction.executeSql(`
                    INSERT INTO lookups
                      (category, subCategory, key, name, data, lat, lon, flags, updated)
                    VALUES
                      (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    ON CONFLICT DO
                    UPDATE SET
                      subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                    `, ['zlota', data.assetType, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.assetType, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['zlota'])
          })

          return {
            totalReferences: totalRefs,
            version: fmtDateNice(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      ZLOTAData.totalRefs = data.totalRefs
      ZLOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['zlota'])
    }
  })
}

export async function zlotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['zlota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function zlotaFindAllByName (name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['zlota', `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function zlotaFindAllByLocation (lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['zlota', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  return results
}
