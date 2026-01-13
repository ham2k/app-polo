/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessBatchedLines, fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'
import { logTimer } from '../../../tools/perfTools'
import { Info } from './LLOTAInfo'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'
import { fmtDateNiceZulu } from '../../../tools/timeFormats'
import { DXCC_BY_CODE } from '@ham2k/lib-dxcc-data'

export const LLOTAAllReferences = {
  prefixByDXCCCode: Object.keys(DXCC_BY_CODE).reduce((acc, code) => {
    acc[code] = DXCC_BY_CODE[code]?.countryCode?.toUpperCase()
    return acc
  }, {})
}

console.log('🔴🔴🔴 LLOTAAllReferences.prefixByDXCCCode', LLOTAAllReferences.prefixByDXCCCode)


const DEBUG = true

export function registerLLOTAAllRefsData() {
  registerDataFile({
    key: 'llota-all-lakes',
    name: 'LLOTA: All Lakes',
    description: 'Database of all LLOTA references',
    title: Info.name,
    titleIcon: Info.icon,
    infoURL: 'https://llota.app/',
    icon: 'file-document-outline',
    maxAgeInDays: 28,
    version: 1,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://llota.app/api/public/references?version=lite'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const rawReferences = JSON.parse(body)
          let totalRefs = 0

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['llota'])
          })

          const startTime = Date.now()
          let processedRawRefs = 0
          const totalRawRefs = rawReferences.length

          console.log('rawReferences', rawReferences.slice(0, 10))
          while (rawReferences.length > 0) {
            const batch = rawReferences.splice(0, 100)
            await (() => new Promise(resolve => {
              setTimeout(() => {
                db.transaction(async transaction => {
                  for (const reference of batch) {
                    console.log('reference', reference)
                    if (Info.referenceRegex.test(reference?.reference_code)) {
                      const lat = reference.latitude
                      const lon = reference.longitude
                      const grid = (!isNaN(lat) && !isNaN(lon)) ? locationToGrid6(lat, lon) : null
                      const data = {
                        ref: reference.reference_code,
                        location: reference.reference_code.split('-')[0],
                        name: reference.name,
                        lat: isNaN(lat) ? null : lat,
                        lon: isNaN(lon) ? null : lon,
                        grid
                      }

                      console.log('data', data)

                      totalRefs++
                      transaction.executeSql(`
                        INSERT INTO lookups
                          (category, subCategory, key, name, data, lat, lon, flags, updated)
                        VALUES
                          (?, ?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT DO
                        UPDATE SET
                          subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                        `, ['llota', data.location, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.location, data.name, JSON.stringify(data), data.lat, data.lon, 1]
                      )
                    }
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['llota'])
          })

          return {
            totalReferences: totalRefs,
            totalActiveReferences: totalRefs,
            version: fmtDateNiceZulu(new Date())
          }
        }
      })
    },
    onLoad: (data) => {
      LLOTAAllReferences.totalReferences = data.totalReferences ?? 0
      LLOTAAllReferences.totalActiveReferences = data.totalActiveReferences ?? 0
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['llota'])
    }
  })
}

export function llotaPrefixForDXCCCode(code) {
  return (LLOTAAllReferences.prefixByDXCCCode && LLOTAAllReferences.prefixByDXCCCode[code]) || ''
}

export async function llotaFindByReference(ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['llota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function llotaFindByName(dxccCode, name) {
  const prefix = llotaPrefixForDXCCCode(dxccCode)
  console.log('llotaFindByName', dxccCode, prefix, name)
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['llota', `${prefix}`, `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  console.log('results', results)
  return results
}

export async function llotaFindByLocation(dxccCode, lat, lon, delta = 1) {
  console.log('llotaFindByLocation', dxccCode, lat, lon, delta)
  const prefix = llotaPrefixForDXCCCode(dxccCode)
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['llota', `${prefix}`, lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  console.log('results', results)
  return results
}
