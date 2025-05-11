/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import Config from 'react-native-config'

import packageJson from '../../../../package.json'

const API_TIMEOUT = 3000 // 3 seconds

export const apiWWFF = createApi({
  reducerPath: 'apiWWFF',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://spots.wwff.co/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers, { getState, endpoint }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
      if (endpoint === 'spot') {
        headers.set('X-API-Key', Config.WWFF_API_KEY)
      }
      return headers
    }
  }),
  endpoints: builder => ({
    spots: builder.query({
      query: () => 'static/spots.json',
      keepUnusedDataFor: 60 * 60 // 1 hour
    }),
    spot: builder.query({
      query: (body) => ({
        url: 'api/spots/add',
        method: 'POST',
        body
      })
    })
  })
})

export const { actions } = apiWWFF

export const { endpoints, reducerPath, reducer, middleware } = apiWWFF

export default apiWWFF.reducer
