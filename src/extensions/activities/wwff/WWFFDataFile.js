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

export const WWFFData = { prefixByDXCCCode: {} }

export function registerWWFFDataFile () {
  registerDataFile({
    key: 'wwff-all-parks',
    name: 'WWFF: All Parks',
    description: 'Database of all WWFF references',
    infoURL: 'https://wwff.co/directory/',
    icon: 'file-word-outline',
    maxAgeInDays: 7,
    enabledByDefault: false,
    fetch: async ({ options, key, definition }) => {
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data (might take longer than you\'d expect)' })

      const url = 'https://wwff.co/wwff-data/wwff_directory.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      const prefixByDXCCCode = {}

      const lines = body.split('\n')
      const headers = parseWWFFCSVRow(lines.shift()).filter(x => x)

      let totalReferences = 0

      const db = await database()
      db.transaction(transaction => {
        transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['wwff'])
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
                const row = parseWWFFCSVRow(line, { headers })
                if (row.status === 'active') {
                  const lat = Number.parseFloat(row.latitude) || 0
                  const lon = Number.parseFloat(row.longitude) || 0
                  const grid = !row.iaruLocator ? locationToGrid6(lat, lon) : row.iaruLocator.replace(/[A-Z]{2}$/, x => x.toLowerCase())
                  const data = {
                    ref: row.reference.toUpperCase(),
                    dxccCode: Number.parseInt(row.dxccEnum, 10) || 0,
                    name: row.name,
                    grid,
                    lat,
                    lon
                  }

                  totalReferences++

                  if (!prefixByDXCCCode[data.dxccCode]) prefixByDXCCCode[data.dxccCode] = data.ref.split('-')[0]

                  transaction.executeSql(`
                    INSERT INTO lookups
                      (category, subCategory, key, name, data, lat, lon, flags, updated)
                    VALUES
                      (?, ?, ?, ?, ?, ?, ?, ?, 1)
                    ON CONFLICT DO
                    UPDATE SET
                      subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
                    `, ['wwff', `${data.dxccCode}`, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, `${data.dxccCode}`, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
        transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['wwff'])
      })

      RNFetchBlob.fs.unlink(response.data)

      return {
        totalReferences,
        prefixByDXCCCode
      }
    },
    onLoad: (data) => {
      if (data.references) return false // Old data - TODO: Remove this after a few months
      WWFFData.prefixByDXCCCode = data.prefixByDXCCCode
      WWFFData.totalReferences = data.totalReferences
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['wwff'])
    }
  })
}

export function wwffPrefixForDXCCCode (code) {
  return (WWFFData.prefixByDXCCCode && WWFFData.prefixByDXCCCode[code]) || ''
}

export async function wwffFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['wwff', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function wwffFindAllByName (dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['wwff', `${dxccCode}`, `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function wwffFindAllByLocation (dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['wwff', `${dxccCode}`, lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
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

function parseWWFFCSVRow (row, options) {
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
