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
import { dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'

export const SOTAData = {}

export function registerSOTADataFile () {
  registerDataFile({
    key: 'sota-all-summits',
    name: 'SOTA: All Summits',
    description: 'Database of all SOTA references',
    infoURL: 'https://www.sotadata.org.uk/en/summits',
    icon: 'file-image-outline',
    maxAgeInDays: 7,
    enabledByDefault: false,
    fetch: async ({ options, key, definition }) => {
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.sotadata.org.uk/summitslist.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      await dbExecute('PRAGMA locking_mode = EXCLUSIVE') // improves performance of inserts

      await dbExecute('UPDATE lookups SET updated = 0 WHERE category = ?', ['sota'])

      let totalSummits = 0

      const lines = body.split('\n')
      const versionRow = lines.shift()
      const headers = parseSOTACSVRow(lines.shift()).filter(x => x)

      for (const line of lines) {
        const row = parseSOTACSVRow(line, { headers })
        if (row.SummitCode && row.ValidTo === '31/12/2099') {
          const lon = Number.parseFloat(row.Longitude) || 0
          const lat = Number.parseFloat(row.Latitude) || 0
          const data = {
            ref: row.SummitCode.toUpperCase(),
            grid: locationToGrid6(lat, lon),
            altitude: Number.parseInt(row.AltM, 10),
            region: row.RegionName,
            association: row.RegionName,
            lat,
            lon
          }
          if (data.ref !== row.SummitName) data.name = row.SummitName

          totalSummits++
          if (totalSummits % 89 === 0) { // using a prime number results in "smoother" progress updates
            options.onStatus && await options.onStatus({
              key,
              definition,
              status: 'progress',
              progress: `Loaded \'${fmtNumber(totalSummits)}\' summits (\'${fmtPercent(Math.min(totalSummits / 152000, 1), 'integer')}\')`
            })
          }

          await dbExecute(`
            INSERT INTO lookups
              (category, subCategory, key, name, data, lat, lon, flags, updated)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT DO
            UPDATE SET
              subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
            `, ['sota', data.region, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.region, data.name, JSON.stringify(data), data.lat, data.lon, 1])
        }
      }

      await dbExecute('DELETE FROM lookups WHERE category = ? AND updated = 0', ['sota'])

      await dbExecute('PRAGMA locking_mode = NORMAL')

      const data = {
        totalSummits,
        version: versionRow
      }
      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      if (data.regions) {
        SOTAData.totalSummits = data.totalSummits
        SOTAData.version = data.version
      } else {
        SOTAData.totalSummits = 0
        SOTAData.version = null
      }
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['sota'])
    }
  })
}

export async function sotaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['sota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function sotaFindAllByName (dxccCode, name) {
  console.log('pota find by name', { dxccCode, name })
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['sota', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  console.log(results)
  return results
}

export async function sotaFindAllByLocation (dxccCode, lat, lon, delta = 1) {
  console.log('pota find by location', { dxccCode, lat, lon, delta })
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['sota', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  console.log(results)
  return results
}

const CSV_ROW_REGEX = /(?:"((?:[^"]|"")*)"|([^",]*))(?:,|\s*$)/g
// (?:              # Start of non-capturing group for each column
//   "((?:[^"]|"")*)" #   Match a quoted string, capturing the contents
//   |              #   Or
//   ([^",]*)         #   Match an unquoted string
// )                # End of non-capturing group for each column
// (?:,|\s*$)       # Match either a comma or the end of the line

function parseSOTACSVRow (row, options) {
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
