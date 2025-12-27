/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'

// Slow API
const API_TIMEOUT = 10000 // 10 seconds

export const apiZLOTA = createApi({
  reducerPath: 'apiZLOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://ontheair.nz/api/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers) => {
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
      return headers
    }
  }),
  endpoints: builder => ({
    spots: builder.query({
      query: () => ({
        url: 'spots.js',
        params: { zlota_only: true },
        headers: { Accept: 'application/json' }
      }),
      keepUnusedDataFor: 60 * 60 // 1 hour
    }),
    spot: builder.query({
      queryFn: async (data, api, extraOptions, baseQuery) => {
        const state = api.getState()
        const formData = new FormData()
        formData.append('userID', state.settings?.accounts?.zlota?.userId)
        formData.append('APIKey', state.settings?.accounts?.zlota?.pin)
        formData.append('do_not_lookup', true)
        Object.entries(data).forEach(([key, value]) => formData.append(key, value))

        return await baseQuery({
          url: 'spots',
          method: 'POST',
          body: formData
        }, api, extraOptions)
      }
    })
  })
})

export const { actions } = apiZLOTA

export const { endpoints, reducerPath, reducer, middleware } = apiZLOTA

export default apiZLOTA.reducer
