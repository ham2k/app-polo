/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fmtNumber, fmtPercent } from '@ham2k/lib-format-tools'

import { registerDataFile } from '../../../store/dataFiles'
import { dbExecute, dbSelectAll, dbSelectOne } from '../../../store/db/db'
import { fetchAndProcessBatchedLines } from '../../../store/dataFiles/actions/dataFileFS'
import { logTimer } from '../../../tools/perfTools'
import { Info } from './POTAInfo'

export const POTAAllParks = { prefixByDXCCCode: {} }

const DEBUG = true

export function registerPOTAAllParksData() {
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA: All Parks',
    description: 'Database of all POTA references',
    title: Info.name,
    titleIcon: Info.icon,
    infoURL: 'https://pota.app/',
    icon: 'file-powerpoint-outline',
    maxAgeInDays: 28,
    version: 2,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://pota.app/all_parks_ext.csv'

      const dataRows = []

      // Since we're streaming, we cannot know how many references there are beforehand, so we need to take a guess
      const expectedReferences = 85000

      // Since the work is split in two phases, and their speeds are different,
      // we need to adjust the expected steps based on a ratio.
      // The ratio comes from the time in seconds it takes to complete each phase in an emulator
      const fetchWorkRatio = 1
      const dbWorkRatio = 1.5
      const expectedSteps = expectedReferences * (fetchWorkRatio + dbWorkRatio)

      let completedSteps = 0
      let totalParks = 0
      let totalActiveParks = 0
      const startTime = Date.now()

      let headers
      const prefixByDXCCCode = {}

      if (DEBUG) logTimer('pota-all-parks', 'Start', { reset: true })

      await dbExecute('DELETE FROM lookups WHERE category = ?', ['pota'])
      if (DEBUG) logTimer('pota-all-parks', 'Delete')

      const { etag } = await fetchAndProcessBatchedLines({
        ...args,
        url,
        chunkSize: 131072,
        processLineBatch: (lines) => {
          if (!headers) {
            headers = parsePOTACSVRow(lines.shift()).filter(x => x)
          }

          for (const line of lines) {
            const row = parsePOTACSVRow(line, { headers })
            const rowData = {
              ref: row.reference,
              dxccCode: Number.parseInt(row.entityId, 10) || 0,
              name: row.name,
              active: row.active === '1',
              grid: row.grid,
              lat: Number.parseFloat(row.latitude) || 0,
              lon: Number.parseFloat(row.longitude) || 0,
              location: row.locationDesc
            }

            if (rowData.ref && rowData.dxccCode) {
              totalParks++
              if (rowData.active) totalActiveParks++

              if (!prefixByDXCCCode[rowData.dxccCode]) prefixByDXCCCode[rowData.dxccCode] = rowData.ref.split('-')[0]

              dataRows.push(rowData)
              completedSteps += fetchWorkRatio
            }
          }

          options.onStatus && options.onStatus({
            key,
            definition,
            status: 'progress',
            progress: `Loaded \`${fmtNumber(Math.round(completedSteps / (fetchWorkRatio + dbWorkRatio)))}\` references.\n\n\`${fmtPercent(Math.min(completedSteps / expectedSteps, 1), 'integer')}\` • ${fmtNumber(Math.max(expectedSteps - completedSteps, 1) * ((Date.now() - startTime) / 1000) / completedSteps, 'oneDecimal')} seconds left.`
          })
        }
      })
      if (DEBUG) logTimer('pota-all-parks', 'File Read')

      while (dataRows.length > 0) {
        const batch = dataRows.splice(0, 1571) // prime number chunks make for more "random" progress updates
        await (() => new Promise(resolve => {
          setTimeout(async () => {
            await dbExecute(
              `
                INSERT INTO lookups
                  (category, subCategory, key, name, data, lat, lon, flags, updated)
                VALUES
                  ${batch.map(rowData => '(?, ?, ?, ?, ?, ?, ?, ?, 1)').join(', ')}
              `,
              batch.flatMap(rowData => ['pota', `${rowData.dxccCode}`, rowData.ref, rowData.name, JSON.stringify(rowData), rowData.lat, rowData.lon, rowData.active])
            )

            completedSteps += dbWorkRatio * batch.length

            options.onStatus && options.onStatus({
              key,
              definition,
              status: 'progress',
              progress: `Loaded \`${fmtNumber(Math.round(completedSteps / (fetchWorkRatio + dbWorkRatio)))}\` references.\n\n\`${fmtPercent(Math.min(completedSteps / expectedSteps, 1), 'integer')}\` • ${fmtNumber(Math.max(expectedSteps - completedSteps, 1) * ((Date.now() - startTime) / 1000) / completedSteps, 'oneDecimal')} seconds left.`
            })
            resolve()
          }, 0)
        }))()
      }
      if (DEBUG) logTimer('pota-all-parks', 'Rows Inserted')

      if (DEBUG) console.log('totalParks', totalParks)
      if (DEBUG) console.log('totalActiveParks', totalActiveParks)
      if (DEBUG) console.log('seconds', (Date.now() - startTime) / 1000)
      if (DEBUG) console.log('per second', (totalParks / (Date.now() - startTime) / 1000))

      return { totalParks, totalActiveParks, prefixByDXCCCode, etag }
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

export function potaPrefixForDXCCCode(code) {
  return (POTAAllParks.prefixByDXCCCode && POTAAllParks.prefixByDXCCCode[code]) || ''
}

export async function potaFindParkByReference(ref) {
  return await dbSelectOne('SELECT data FROM lookups WHERE category = ? AND key = ?', ['pota', ref], { row: row => row?.data ? JSON.parse(row.data) : {} })
}

export async function potaFindParksByName(dxccCode, name) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND (key LIKE ? OR name LIKE ?) AND flags = 1',
    ['pota', `${dxccCode}`, `%${name}%`, `%${name}%`],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

export async function potaFindParksByLocation(dxccCode, lat, lon, delta = 1) {
  const results = await dbSelectAll(
    'SELECT data FROM lookups WHERE category = ? AND subCategory = ? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND flags = 1',
    ['pota', `${dxccCode}`, lat - delta, lat + delta, lon - delta, lon + delta],
    { row: row => JSON.parse(row.data) }
  )
  return results
}

const QUOTED_CSV_ROW_REGEX = /"(([^"]|"")*)",{0,1}/g
function parsePOTACSVRow(row, options) {
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
