/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025-2026 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import Config from 'react-native-config'

import packageJson from '../../../../package.json'

const API_TIMEOUT = 3000 // 3 seconds

export const apiTOTA = createApi({
  reducerPath: 'apiTOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://rozhledny.eu/apidata/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
      return headers
    }
  }),
  endpoints: builder => ({
    spots: builder.query({
      query: () => ({
        url: 'cluster.php',
        params: {key: Config.TOTA_API_KEY}
      }),
      keepUnusedDataFor: 60 * 60 // 1 hour
    }),
    spot: builder.query({
      query: (body) => ({
        url: 'cluster_selfspot.php',
        method: 'POST',
        params: {key: Config.TOTA_API_KEY},
        body
      })
    })
  })
})

export const { actions } = apiTOTA

export const { endpoints, reducerPath, reducer, middleware } = apiTOTA

export default apiTOTA.reducer
