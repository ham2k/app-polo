/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import { fmtDateNice } from '../../../tools/timeFormats'
import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const BCAData = {}

export function registerBCADataFile () {
  registerDataFile({
    key: 'bca-all-castles',
    name: 'BCA: All Castles',
    description: 'Database of all BCA references',
    infoURL: 'https://danny28287.wixsite.com/belgiumoutdoorshack/bos-maps',
    icon: 'file-certificate-outline',
    maxAgeInDays: 100,
    enabledByDefault: false,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://drive.google.com/uc?id=1p4uCYG4R48FdD5gihbEcdSQuOa6ko216&export=download'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const rawReferences = JSON.parse(body)?.features
          let totalRefs = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['bca'])
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
                    const [lon, lat] = reference.geometry.coordinates
                    const grid = locationToGrid6(lat, lon)
                    const data = {
                      ref: reference.properties.reference,
                      name: reference.properties.name?.trim(),
                      lat,
                      lon,
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
                  `, ['bca', 'ON', data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, 'ON', data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['bca'])
          })

          return {
            totalRefs,
            version: fmtDateNice(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      BCAData.totalRefs = data.totalRefs
      BCAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['bca'])
    }
  })
}

export async function bcaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['bca', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function bcaFindAllByName (dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['bca', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function bcaFindAllByLocation (dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['bca', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}
