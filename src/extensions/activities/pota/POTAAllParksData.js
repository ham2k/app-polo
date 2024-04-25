/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../../../package.json'

import { registerDataFile } from '../../../store/dataFiles'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'

export const POTAAllParks = { prefixByDXCCCode: {} }

export function registerPOTAAllParksData () {
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA: All Parks',
    description: 'Database of all POTA references',
    infoURL: 'https://pota.app/',
    icon: 'file-powerpoint-outline',
    maxAgeInDays: 7,
    enabledByDefault: true,
    fetch: async () => {
      const url = 'https://pota.app/all_parks_ext.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      await dbExecute('UPDATE lookups SET updated = 0 WHERE category = ?', ['pota'])

      const lines = body.split('\n')
      const headers = parsePOTACSVRow(lines.shift())

      let totalActiveParks = 0
      let totalParks = 0
      const prefixByDXCCCode = {}

      for (const line of lines) {
        const row = parsePOTACSVRow(line, { headers })
        const data = {
          ref: row.reference,
          dxccCode: Number.parseInt(row.entityId, 10),
          name: row.name,
          shortName: abbreviatePOTAName(row.name),
          active: row.active === '1',
          grid: row.grid,
          lat: Number.parseFloat(row.latitude) ?? 0,
          lon: Number.parseFloat(row.longitude) ?? 0
        }

        if (data.ref && data.dxccCode) {
          totalParks++
          if (data.active) totalActiveParks++

          if (!prefixByDXCCCode[data.dxccCode]) prefixByDXCCCode[data.dxccCode] = data.ref.split('-')[0]

          await dbExecute(`
            INSERT INTO lookups
              (category, subCategory, key, name, data, lat, lon, flags, updated)
            VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT DO
            UPDATE SET
              subCategory = ?, name = ?, data = ?, lat = ?, lon = ?, flags = ?, updated = 1
            `, ['pota', `${data.dxccCode}`, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, data.active, `${data.dxccCode}`, data.name, JSON.stringify(data), data.lat, data.lon, data.active])
        }
      }

      await dbExecute('DELETE FROM lookups WHERE category = ? AND updated = 0', ['pota'])

      const data = {
        totalParks,
        totalActiveParks,
        prefixByDXCCCode
      }

      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
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
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['pota', ref], { row: row => JSON.parse(row.data) })
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

const ABBREVIATIONS = [
  ['National Historical Park', 'NHP'],
  ['National Historical Site', 'NHS'],
  ['National Heritage Area', 'NHA'],
  ['National Park', 'NP'],
  ['National Preserve', 'NPr'],
  ['National Monument', 'NMo'],
  ['National Seashore', 'NSs'],
  ['National Scenic River', 'NSRv'],
  ['National Scenic Trail', 'NSTr'],
  ['National Nature Reserve', 'NNRe'],
  ['Wild and Scenic River', 'WSRv'],
  ['State Conservation Area', 'SCA'],
  ['State Historic Site', 'SHS'],
  ['State Game Land', 'SGL'],
  ['State Park', 'SP'],
  ['State Preserve', 'SPr'],
  ['State Forest', 'SF'],
  ['Wildlife Management Area', 'WMA'],
  ['Conservation Area', 'CA'],
  ['Management Area', 'MgA'],
  ['Recreation Park', 'RP'],
  ['Country Park', 'CP'],
  ['Natura 2000', 'N2K']
]

export function abbreviatePOTAName (name) {
  for (const [long, short] of ABBREVIATIONS) {
    name = name?.replace(long, short)
  }
  return name
}
