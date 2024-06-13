/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import RNFetchBlob from 'react-native-blob-util'
import { Buffer } from 'buffer'

import packageJson from '../../../../package.json'

import { registerDataFile } from '../../../store/dataFiles'

export const SatelliteData = {}

export function registerSatelliteData () {
  registerDataFile({
    key: 'satellite-data',
    name: 'Satellites: Active Birds',
    description: 'Information about active Ham Satellites',
    infoURL: 'https://www.amsat.org/',
    icon: 'satellite-variant',
    maxAgeInDays: 28,
    enabledByDefault: true,
    fetch: async ({ key, definition, options }) => {
      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://polo.ham2k.com/data/satellites.json'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const data64 = await RNFetchBlob.fs.readFile(response.data, 'base64')
      const buffer = Buffer.from(data64, 'base64')
      const body = buffer.toString('utf8')

      const data = JSON.parse(body)

      const activeSatellites = data
      const satelliteByName = data.reduce((acc, sat) => {
        acc[sat.name] = sat
        return acc
      }, {})

      return { activeSatellites, satelliteByName }
    },
    onLoad: (data) => {
      SatelliteData.activeSatellites = data.activeSatellites
      SatelliteData.satelliteByName = data.satelliteByName
    },
    onRemove: async () => {
      SatelliteData.activeSatellites = []
      SatelliteData.satelliteByName = {}
    }
  })
}
