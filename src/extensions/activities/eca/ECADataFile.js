/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import { fmtDateNiceZulu } from '../../../tools/timeFormats'
import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const ECAData = {}

export function registerECADataFile() {
  registerDataFile({
    key: 'eca-all-castles',
    name: 'ECA: All Castles',
    description: 'Database of all ECA references',
    infoURL: 'https://ecaelastats.site/eca_refs.php',
    icon: 'file-certificate-outline',
    maxAgeInDays: 100,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://ham2k.com/data/cached/eca/ECA_References.json'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const rawReferences = JSON.parse(body)?.[2]?.data ?? []
          let totalRefs = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['eca'])
          })

          const startTime = Date.now()
          let processedRawRefs = 0
          const totalRawRefs = rawReferences.length

          while (rawReferences.length > 0) {
            const batch = rawReferences.splice(0, 500)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const reference of batch) {
                    const lat = parseFloat(reference.LATITUDE)
                    const lon = parseFloat(reference.LONGITUDE)
                    const grid = (!isNaN(lat) && !isNaN(lon)) ? locationToGrid6(lat, lon) : null
                    const data = {
                      ref: reference.WCA,
                      name: reference.NAME_OF_CASTLE?.trim(),
                      location: reference.LOCATION,
                      lat: isNaN(lat) ? null : lat,
                      lon: isNaN(lon) ? null : lon,
                      grid
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
                  `, ['eca', data.location, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.location, data.name, JSON.stringify(data), data.lat, data.lon, 1]
                    )
                    processedRawRefs++
                  }
                  options.onStatus && await options.onStatus({
                    key,
                    definition,
                    status: 'progress',
                    progress: `Loaded \`${fmtNumber(processedRawRefs)}\` references.\n\n\`${fmtPercent(Math.min(processedRawRefs / totalRawRefs, 1), 'integer')}\` • ${fmtNumber((totalRawRefs - processedRawRefs) * ((Date.now() - startTime) / 1000) / processedRawRefs, 'oneDecimal')} seconds left.`
                  })
                  resolve()
                })
              }, 0)
            }))()
          }

          db.transaction(transaction => {
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['eca'])
          })

          return {
            totalRefs,
            version: fmtDateNiceZulu(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      ECAData.totalRefs = data.totalRefs
      ECAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['eca'])
    }
  })
}

export async function ecaFindOneByReference(ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['eca', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function ecaFindAllByName(dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['eca', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function ecaFindAllByLocation(dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['eca', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}
