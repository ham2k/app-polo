/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'

const API_TIMEOUT = 3000 // 3 seconds

export const apiPnP = createApi({
  reducerPath: 'apiPnP',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://www.parksnpeaks.org/api/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers) => {
      headers.set('Accept', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
      return headers
    }
  }),
  endpoints: builder => ({
    spots: builder.query({
      query: () => 'VK',
      keepUnusedDataFor: 60 * 60 // 1 hour
    }),
    spot: builder.query({
      queryFn: async (data, api, extraOptions, baseQuery) => {
        const state = api.getState()
        const spot = {
          ...data,
          userID: state.settings?.accounts?.pnp?.userId,
          APIKey: state.settings?.accounts?.pnp?.apiKey
        }
        return await baseQuery({
          url: 'SPOT',
          method: 'POST',
          body: spot,
          headers: { 'Content-type': 'application/json' },
          responseHandler: (response) => response.text()
        }, api, extraOptions)
      }
    })
  })
})

export const { actions } = apiPnP

export const { endpoints, reducerPath, reducer, middleware } = apiPnP

export default apiPnP.reducer
