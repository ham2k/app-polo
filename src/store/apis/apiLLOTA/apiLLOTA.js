/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react'
import { bandForFrequency } from '@ham2k/lib-operation-data'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'

import { LLOTAAllRefs, llotaFindByReference } from '../../../extensions/activities/llota/LLOTAAllRefsData'
import { reportError } from '../../../distro'
import Config from 'react-native-config'

/**

  LLOTA API

  Requires a valid API Key

#SPOT:

curl -X POST https://llota.app/api/public/spot \
  -H "X-API-Key: TU_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "callsign": "KI2D",
    "frequency": "14.275",
    "mode": "SSB",
    "reference": "CL-0002",
    "comments": "QRV CQ LLOTA CQ LLOTA"
  }'
al crear el spot te entregara un id de spot



#RE-SPOT

curl -X POST https://llota.app/api/public/spot/{ID_DE_SPOT}/respot \
  -H "X-API-Key: TU_APP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "operator_callsign": "KI2D",
    "comments": "QSY Cambio de frecuencia",
    "frequency": "7.100",
    "mode": "SSB"
  }'

 */

const API_TIMEOUT = 3000 // 3 seconds

export const apiLLOTA = createApi({
  reducerPath: 'apiLLOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://llota.app/api/public/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
      headers.set('X-API-Key', Config.LLOTA_API_KEY)
      return headers
    }
  }),
  endpoints: builder => ({

    spots: builder.query({
      query: () => 'spots',
      keepUnusedDataFor: 60 * 60, // 1 hour
      transformResponse: (response) => {
        if (response === null) {
          return []
        }
        console.log('🔴🔴🔴 LLOTA spots', response)
        response.forEach(spot => {
          spot.frequency = Number.parseFloat(spot.frequency)
          spot.band = bandForFrequency(spot.frequency)
          spot.timeInMillis = Date.parse(spot.spotTime + 'Z')
        })
        return response
      }
    }),
  })
})

export const { actions } = apiLLOTA
const LLOTA_REGEX = /[A-Z]{1,2}-[0-9]{4,5}/

export const { endpoints, reducerPath, reducer, middleware, useSpotsQuery, useSpotCommentsQuery } = apiLLOTA

export default apiLLOTA.reducer
