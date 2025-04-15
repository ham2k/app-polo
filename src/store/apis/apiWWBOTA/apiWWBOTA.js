/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'

const API_TIMEOUT = 3000 // 3 seconds

export const apiWWBOTA = createApi({
  reducerPath: 'apiWWBOTA',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.wwbota.org/',
    timeout: API_TIMEOUT,
    prepareHeaders: (headers, { getState, endpoint }) => {
      headers.set('Accept', 'application/json')
      headers.set('Content-type', 'application/json')
      headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
    }
  }),
  endpoints: builder => ({
    spots: builder.query({
      query: () => 'spots/',
      keepUnusedDataFor: 60 * 60 // 1 hour
    })
  })
})

export const { actions } = apiWWBOTA

export const { endpoints, reducerPath, reducer, middleware } = apiWWBOTA

export default apiWWBOTA.reducer
