/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'

import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const POTAAllParks = { prefixByDXCCCode: {} }

export function registerPOTAAllParksData () {
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA: All Parks',
    description: 'Database of all POTA references',
    infoURL: 'https://pota.app/',
    icon: 'file-powerpoint-outline',
    maxAgeInDays: 28,
    enabledByDefault: true,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://pota.app/all_parks_ext.csv'

      const data = await fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const lines = body.split('\n')
          const headers = parsePOTACSVRow(lines.shift())

          let totalActiveParks = 0
          let totalParks = 0
          const prefixByDXCCCode = {}

          const db = await database()
          db.transaction(transaction => {
            transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['pota'])
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
                    const row = parsePOTACSVRow(line, { headers })
                    const park = {
                      ref: row.reference,
                      dxccCode: Number.parseInt(row.entityId, 10) || 0,
                      name: row.name,
                      active: row.active === '1',
                      grid: row.grid,
                      lat: Number.parseFloat(row.latitude) || 0,
                      lon: Number.parseFloat(row.longitude) || 0
                    }

                    if (park.ref && park.dxccCode) {
                      totalParks++
                      if (park.active) totalActiveParks++

                      if (!prefixByDXCCCode[park.dxccCode]) prefixByDXCCCode[park.dxccCode] = park.ref.split('-')[0]

                      transaction.executeSql(`
                  INSERT INTO lookups
                    (category, subCategory, key, name, data, lat, lon, flags, updated)
                  VALUES
                    (?, ?, ?, ?, ?, ?, ?, ?, 1)
                  ON CONFLICT DO
                  UPDATE SET
                    subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                  `, ['pota', `${park.dxccCode}`, park.ref, park.name, JSON.stringify(park), park.lat, park.lon, park.active, `${park.dxccCode}`, park.name, JSON.stringify(park), park.lat, park.lon, park.active]
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
            transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['pota'])
          })

          return {
            totalParks,
            totalActiveParks,
            prefixByDXCCCode
          }
        }
      })

      return data
    },
    onLoad: (data) => {
      if (data.activeParks) return false // Old data - TODO: Remove this after a few months

      POTAAllParks.prefixByDXCCCode = data.prefixByDXCCCode ?? {}
      POTAAllParks.totalParks = data.totalParks ?? 0
      POTAAllParks.totalActiveParks = data.totalActiveParks ?? 0
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['pota'])
    }
  })
}

export function potaPrefixForDXCCCode (code) {
  return (POTAAllParks.prefixByDXCCCode && POTAAllParks.prefixByDXCCCode[code]) || ''
}

export async function potaFindParkByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['pota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function potaFindParksByName (dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['pota', `${dxccCode}`, `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function potaFindParksByLocation (dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['pota', `${dxccCode}`, lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

const QUOTED_CSV_ROW_REGEX = /"(([^"]|"")*)",{0,1}/g
function parsePOTACSVRow (row, options) {
  const parts = [...row.matchAll(QUOTED_CSV_ROW_REGEX)].map(match => match[1].replaceAll('""', '"'))

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
