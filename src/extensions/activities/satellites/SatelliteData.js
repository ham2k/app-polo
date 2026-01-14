/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { registerDataFile } from '../../../store/dataFiles'
import { fetchAndProcessURL } from '../../../store/dataFiles/actions/dataFileFS'

export const SatelliteData = {}

export function registerSatelliteData() {
  registerDataFile({
    key: 'satellite-data',
    name: 'Satellites: Active Birds',
    description: 'Information about active Ham Satellites',
    infoURL: 'https://www.amsat.org/',
    icon: 'satellite-variant',
    maxAgeInDays: 28,
    fetch: async (args) => {
      const { key, definition, options } = args

      options.onStatus && await options.onStatus({ key, definition, status: 'progress', progress: 'Downloading raw data' })

      const url = 'https://polo.ham2k.com/data/satellites.json'

      return fetchAndProcessURL({
        ...args,
        url,
        process: async (body) => {
          const data = JSON.parse(body)

          const activeSatellites = data
          const satelliteByName = data.reduce((acc, sat) => {
            acc[sat.name] = sat
            return acc
          }, {})

          return { activeSatellites, satelliteByName }
        }
      })
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
