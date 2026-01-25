/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024-2026 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fmtDateNiceZulu } from '../../../tools/timeFormats'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const TOTAData = { }
import Config from 'react-native-config'

export function registerTOTADataFile() {
  registerDataFile({
    key: 'tota-all-towers',
    name: 'TOTA: All Towers',
    description: 'Database of all TOTA references',
    infoURL: 'https://www.rozhledny.eu/seznam/',
    icon: 'file-cloud-outline',
    maxAgeInDays: 100,
    enabledByDefault: true,
    fetch: async (args) => {
      const { key, definition, options } = args
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = `https://www.rozhledny.eu/apidata/tower.php?key=${Config.TOTA_API_KEY}`

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const refs = JSON.parse(body)

          const totalReferences = refs.length

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['tota'])
          })

          const startTime = Date.now()
          let processedRefs = 0


          while (refs.length > 0) {
            const batch = refs.splice(0, 251)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const ref of batch) {
                    const grid = locationToGrid6(ref.lat, ref.lon)
                    const prefix = ref.ref.split("-")[0] // May be useful later
                    const data = {
                      ...ref,
                      grid,
                    }

                    transaction.executeSql(`
                    INSERT INTO lookups
                      (category, subCategory, key, name, data, lat, lon, flags, updated)
                    VALUES
                      (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    ON CONFLICT DO
                    UPDATE SET
                      subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                    `, ['tota', prefix, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.entityPrefix, data.name, JSON.stringify(data), data.lat, data.lon, 1]
                    )
                    processedRefs++
                  }
                  options.onStatus && await options.onStatus({
                    key,
                    definition,
                    status: 'progress',
                    progress: `Loaded \`${fmtNumber(processedRefs)}\` references.\n\n\`${fmtPercent(Math.min(processedRefs / totalReferences, 1), 'integer')}\` • ${fmtNumber((totalReferences - processedRefs) * ((Date.now() - startTime) / 1000) / processedRefs, 'oneDecimal')} seconds left.`
                  })
                  resolve()
                })
              }, 0)
            }))()
          }

          db.transaction(transaction => {
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['tota'])
          })

          return {
            totalReferences,
            version: fmtDateNiceZulu(new Date()),
          }
        }
      })
    },
    onLoad: (data) => {
      TOTAData.totalRefs = data.totalRefs
      TOTAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['tota'])
    }
  })
}

export async function totaFindOneByReference(ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['tota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function totaFindAllByName(name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['tota', `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function totaFindAllByLocation(lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['tota', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  return results
}
