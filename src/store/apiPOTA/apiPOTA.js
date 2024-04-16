/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bandForFrequency } from '@ham2k/lib-operation-data'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { POTAAllParks, abbreviatePOTAName } from '../../extensions/activities/pota/POTAAllParksData'
import { reportError } from '../../App'

/**

  POTA API
  https://api.pota.app/

  https://docs.pota.app/api/authentication.html

  - A list of park references in JSON format is available programmatically at: https://api.pota.app/location/parks/{location-code}.
  - A complete CSV file is available (generated nightly) at https://pota.app/all_parks_ext.csv.

  Interesting API Endpoints
  * https://api.pota.app/locations
  * https://api.pota.app/location/parks/US-NY
  * https://api.pota.app/spot/

  * https://api.pota.app/program/parks/YV

  * https://api.pota.app/user/stats/park
  * https://api.pota.app/park/YV-0001
  * https://api.pota.app/park/stats/YV-0001
  * https://api.pota.app/park/leaderboard/YV-0001?count=5
  * https://api.pota.app/park/activations/YV-0001?count=all

  * https://api.pota.app/profile/YV5RAB

 */

export const apiPOTA = createApi({
  reducerPath: 'apiPOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.pota.app/',
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      return headers
    }
  }),
  endpoints: builder => ({

    lookupPark: builder.query({
      query: ({ ref }) => `park/${ref}`,
      transformResponse: (response) => {
        try {
          if (response === null) {
            // This is what the API returns when a park was not found
            return { error: 'Park not found' }
          }
          response.originalName = response.name
          response.name = [response.name, response.parktypeDesc].filter(x => x).join(' ')
          response.shortName = abbreviatePOTAName(response.name)
        } catch (e) {
          reportError('Error in POTA API park lookup', e)
        }
        return response
      }
    }),

    spots: builder.query({
      query: () => 'spot/activator',
      transformResponse: (response) => {
        if (response === null) {
          return []
        }
        response.forEach(spot => {
          spot.shortName = abbreviatePOTAName(spot.name)
          spot.frequency = Number.parseFloat(spot.frequency)
          spot.band = bandForFrequency(spot.frequency)
          spot.timeInMillis = Date.parse(spot.spotTime + 'Z')
        })
        return response
      }
    })
  })
})

export const { actions } = apiPOTA
const POTA_REGEX = /[A-Z]{1,2}-[0-9]{4,5}/

export function useLookupParkQuery (arg, options) {
  let result

  if (!arg?.ref || !arg?.ref?.match(POTA_REGEX)) {
    result = apiPOTA.useLookupParkQuery('', { skip: true })
  } else if (POTAAllParks.byReference[arg.ref] && !options.online) {
    result = apiPOTA.useLookupParkQuery(arg.ref, { skip: true })
    result = { ...result } // It seems that redux queries reuse their data structures, so let's clone it first
    result.data = POTAAllParks.byReference[arg.ref]
    result.isError = false
    result.isUninitialized = false
    result.isFetching = false
    result.isLoading = false
    result.isSuccess = true
    result.status = 'fulfilled'

    result.isOffline = true
  } else {
    result = apiPOTA.useLookupParkQuery(arg, options)
  }

  if (result?.status === 'uninitialized') {
    return undefined
  } else {
    return result
  }
}

export const { endpoints, reducerPath, reducer, middleware, useSpotsQuery } = apiPOTA

export default apiPOTA.reducer
