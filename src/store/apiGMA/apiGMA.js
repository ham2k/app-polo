/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import packageJson from '../../../package.json'

/**

  GMA API
  https://www.cqgma.org/infoapi.php

**/

export const apiGMA = createApi({
  reducerPath: 'apiGMA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://www.cqgma.org/api/',
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
      return headers
    }
  }),
  endpoints: builder => ({
    spots: builder.query({
      query: (arg) => `spots/${arg}/`,
      transformResponse: (response) => {
        if (response === null || !response?.RCD) {
          return []
        }
        response.RCD.forEach(spot => {
          spot.ACTIVATOR = spot.ACTIVATOR.toUpperCase()
          spot.SPOTTER = spot.SPOTTER.toUpperCase()
          spot.frequency = Number.parseFloat(spot.QRG)
          spot.band = bandForFrequency(spot.frequency)
          spot.mode = spot.MODE.toUpperCase()
          const date = `${spot.DATE.slice(0, 4)}-${spot.DATE.slice(4, 6)}-${spot.DATE.slice(6, 8)}`
          const time = `${spot.TIME.slice(0, 2)}:${spot.TIME.slice(2, 4)}:00`
          spot.timeInMillis = Date.parse(`${date}T${time}Z`)
        })
        return response.RCD
      }
    })
  })
})

export const { actions } = apiGMA

export const { endpoints, reducerPath, reducer, middleware } = apiGMA

export default apiGMA.reducer
