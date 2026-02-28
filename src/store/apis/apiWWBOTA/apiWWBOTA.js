/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024-2026 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { setAccountInfo } from '../../settings'

import packageJson from '../../../../package.json'

const API_TIMEOUT = 3000 // 3 seconds
const TOKEN_TIMEOUT = 10000

DEBUG = false

const tokenQuery = fetchBaseQuery({
  baseUrl: 'https://wwbota.net/wp-json/wwbota/v1/',
  timeout: TOKEN_TIMEOUT,
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json')
    headers.set('Content-type', 'application/json')
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
  },
})

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: 'https://api.wwbota.org/',
  timeout: API_TIMEOUT,
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('Accept', 'application/json')
    headers.set('Content-type', 'application/json')
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
    if (!(endpoint === 'spots' || endpoint === 'spot' || endpoint === 'editSpot')) {
      headers.set('Authorization', `Bearer ${getState().settings?.accounts?.wwbota?.token}`)
    }
  },
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  if (DEBUG) console.log('baseQueryWithReauth first call', { args })
  let result = await baseQueryWithSettings(args, api, extraOptions)

  if (result.error && result.error.status === 401) {
    // try to get a new session key
    const { login, password } = api.getState().settings?.accounts?.wwbota ?? {}
    if (DEBUG) console.log('baseQueryWithReauth second call')
    result = await tokenQuery({
      method: 'POST',
      url: 'token',
      body: { username: login, password },
    }, api, extraOptions)

    if (result.error) return result

    const newToken = result.data?.token
    if (newToken) {
      if (DEBUG) console.log('New Token', newToken)
      await api.dispatch(setAccountInfo({ wwbota: { ...api.getState().settings?.accounts?.wwbota, token: newToken } }))

      if (DEBUG) console.log('baseQueryWithReauth third call')
      result = await baseQueryWithSettings(args, api, extraOptions)
    } else {
      await api.dispatch(setAccountInfo({ wwbota: { ...api.getState().settings?.accounts?.wwbota, token: undefined } }))
      return { error: 'Unexpected error logging into WWBOTA', result }
    }
  }
  return result
}

export const apiWWBOTA = createApi({
  reducerPath: 'apiWWBOTA',
  baseQuery: baseQueryWithReauth,
  endpoints: builder => ({
    spots: builder.query({
      query: () => 'spots/',
      keepUnusedDataFor: 60 * 60 // 1 hour
    }),
    spot: builder.query({
      query: (body) => ({
        url: 'spots/',
        method: 'POST',
        body
      })
    }),
    editSpot: builder.query({
      query: ({ id, body }) => ({
        url: `spots/${id}`,
        method: 'PUT',
        body
      })
    }),
    logUpload: builder.query({
      query: (body) => ({
        url: 'logs/',
        method: 'POST',
        body
      })
    }),
    deleteQSO: builder.query({
      query: ({id}) => ({
        url: `logs/${id}`,
        method: 'DELETE'
      })
    })
  })
})

export const { actions } = apiWWBOTA

export const { endpoints, reducerPath, reducer, middleware } = apiWWBOTA

export default apiWWBOTA.reducer
