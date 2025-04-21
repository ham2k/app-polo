/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'

import { POTAAllParks, potaFindParkByReference } from '../../../extensions/activities/pota/POTAAllParksData'
import { reportError } from '../../../distro'

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

const API_TIMEOUT = 3000 // 3 seconds

export const apiPOTA = createApi({
  reducerPath: 'apiPOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.pota.app/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
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
        } catch (e) {
          reportError('Error in POTA API park lookup', e)
        }
        return response
      }
    }),

    spots: builder.query({
      query: () => 'spot/activator',
      keepUnusedDataFor: 60 * 60, // 1 hour
      transformResponse: (response) => {
        if (response === null) {
          return []
        }
        response.forEach(spot => {
          spot.frequency = Number.parseFloat(spot.frequency)
          spot.band = bandForFrequency(spot.frequency)
          spot.timeInMillis = Date.parse(spot.spotTime + 'Z')
        })
        return response
      }
    }),

    spotComments: builder.query({
      query: ({ call, park }) => `spot/comments/${encodeURIComponent(call)}/${park}`,
      keepUnusedDataFor: 15,
      transformResponse: (response) => {
        if (response === null) {
          return []
        }
        response.forEach(spot => {
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

  const [lookupData, setLookupData] = useState()

  if (!arg?.ref || !arg?.ref?.match(POTA_REGEX)) {
    result = apiPOTA.useLookupParkQuery('', { skip: true })
  } else if (POTAAllParks.byReference && POTAAllParks.byReference[arg.ref] && !options.online) {
    result = apiPOTA.useLookupParkQuery(arg.ref, { skip: true })
    result = { ...result } // It seems that redux queries reuse their data structures, so let's clone it first

    if (lookupData) {
      result.data = lookupData
      result.isError = false
      result.isUninitialized = false
      result.isFetching = false
      result.isLoading = false
      result.isSuccess = true
      result.status = 'fulfilled'
      result.isOffline = true
    } else {
      potaFindParkByReference(arg.ref).then(data => {
        setLookupData(data)
      })
    }
  } else {
    result = apiPOTA.useLookupParkQuery(arg, options)
  }

  if (result?.status === 'uninitialized') {
    return undefined
  } else {
    return result
  }
}

export const { endpoints, reducerPath, reducer, middleware, useSpotsQuery, useSpotCommentsQuery } = apiPOTA

export default apiPOTA.reducer
