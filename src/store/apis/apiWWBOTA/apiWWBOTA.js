/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'

const DEBUG = false

const apiState = {}

const NONCE_RE = /id="wdtNonceFrontendServerSide_24"[^>]+ value="([0-9a-f]+)"/

const baseQueryFetchNonce = fetchBaseQuery({
  baseUrl: 'https://wwbota.org/',
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
  },
  responseHandler: async (response) => {
    if (response.status === 200) {
      const body = await response.text()
      return body.match(NONCE_RE)?.[1]
    } else {
      return ''
    }
  }
})

const baseQuery = fetchBaseQuery({
  baseUrl: 'https://wwbota.org/',
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('Referer', 'https://wwbota.org/cluster/')
    headers.set('Accept', 'application/json')
    headers.set('Content-type', 'application/x-www-form-urlencoded')
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
  }
})

const baseQueryWithFetchNonce = async (args, api, extraOptions) => {
  let result
  if (apiState?.nonce) {
    result = await baseQuery({ ...args, body: `${args.body}&wdtNonce=${apiState.nonce}` }, api, extraOptions)
    if (DEBUG) console.log('baseQueryWithFetchNonce first call', { args })
  } else if (DEBUG) {
    console.log('no nonce: skipping baseQueryWithFetchNonce first call', { args })
  }

  if (!result?.data?.data) {
    apiState.nonce = undefined
    // try to get a new nonce
    if (DEBUG) console.log('baseQueryWithFetchNonce second call')
    result = await baseQueryFetchNonce({ url: 'https://wwbota.org/cluster/' }, api, extraOptions)

    if (result.data) {
      if (DEBUG) console.log('New Nonce', result.data)
      apiState.nonce = result.data
      if (DEBUG) console.log('baseQueryWithFetchNonce third call')
      result = await baseQuery({ ...args, body: `${args.body}&wdtNonce=${apiState.nonce}` }, api, extraOptions)
    } else {
      apiState.nonce = undefined
      return { error: 'Unexpected error fetching WWBOTA cluster nonce' }
    }
  }
  return result
}

export const apiWWBOTA = createApi({
  reducerPath: 'apiWWBOTA',
  baseQuery: baseQueryWithFetchNonce,
  endpoints: builder => ({
    spots: builder.query({
      query: () => ({
        url: 'wp-admin/admin-ajax.php?action=get_wdtable&table_id=24',
        method: 'POST',
        body: Object.entries({
          draw: 1,
          'order[0][column]': 5,
          'order[0][dir]': 'desc',
          start: 0,
          length: 50
        }).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
      }),
      keepUnusedDataFor: 60 * 60, // 1 hour
      transformResponse: (response) => {
        if (response === null || !response?.data) {
          return []
        }
        if (DEBUG) console.log(response)
        return response.data.map(spot => ({
          call: spot[0]?.trim(),
          state: spot[1]?.trim(), // LIVE, QSY, QRT or TEST
          frequency: parseFloat(spot[2]),
          info: spot[3],
          index: spot[4],
          updated: spot[5],
          spotter: spot[6],
          created: spot[7],
          creator: spot[8]
        }))
      }
    })
  })
})

export const { actions } = apiWWBOTA

export const { endpoints, reducerPath, reducer, middleware } = apiWWBOTA

export default apiWWBOTA.reducer
