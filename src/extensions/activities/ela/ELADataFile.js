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
import { fmtDateNice } from '../../../tools/timeFormats'
import { registerDataFile } from '../../../store/dataFiles'
import { database, dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'

import { Info } from './ELAInfo'

export const ELAData = {}

export function registerELADataFile () {
  registerDataFile({
    key: 'ela-all-lighthouses',
    name: 'ELA: All Lighthouses',
    description: 'Database of all ELA references',
    infoURL: 'https://ecaelastats.site/ela_refs.php',
    icon: 'file-certificate-outline',
    maxAgeInDays: 30,
    enabledByDefault: false,
    fetch: async ({ options, key, definition }) => {
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://www.ecaelastats.site/ELA_References.json'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      const rawReferences = JSON.parse(body)
      let totalRefs = 0

      const db = await database()
      db.transaction(transaction => {
        transaction.executeSql('UPDATE lookups SET updated = 0 WHERE category = ?', ['ela'])
      })

      const startTime = Date.now()
      let processedRawRefs = 0
      const totalRawRefs = rawReferences.length

      while (rawReferences.length > 0) {
        const batch = rawReferences.splice(0, 100)
        await (() => new Promise(resolve => {
          setTimeout(() => {
            db.transaction(async transaction => {
              for (const reference of batch) {
                if (Info.referenceRegex.test(reference?.['№ ELA'])) {
                  const lat = parseFloat(reference.Latitude)
                  const lon = parseFloat(reference.Longitude)
                  const grid = (!isNaN(lat) && !isNaN(lon)) ? locationToGrid6(lat, lon) : null
                  const data = {
                    ref: reference['№ ELA'],
                    name: reference['NAME OF LIGHTHOUSE'].trim(),
                    location: reference.Location,
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
                    `, ['ela', data.location, data.ref, data.name, JSON.stringify(data), data.lat, data.lon, 1, data.location, data.name, JSON.stringify(data), data.lat, data.lon, 1]
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
        transaction.executeSql('DELETE FROM lookups WHERE category = ? AND updated = 0', ['ela'])
      })

      const data = {
        totalRefs,
        version: fmtDateNice(new Date())
      }
      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      ELAData.totalRefs = data.totalRefs
      ELAData.version = data.version
    },
    onRemove: async () => {
      await dbExecute('DELETE FROM lookups WHERE category = ?', ['ela'])
    }
  })
}

export async function elaFindOneByReference (ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['ela', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function elaFindAllByName (dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['ela', `%${name}%`, `%${name}%`],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}

export async function elaFindAllByLocation (dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['ela', lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => row?.data ? JSON.parse(row.data) : {} }
  )
  return results
}
