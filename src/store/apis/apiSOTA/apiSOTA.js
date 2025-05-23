/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { refresh } from 'react-native-app-auth'

import packageJson from '../../../../package.json'
import { setAccountInfo } from '../../settings'

/**

  SOTA API v2
  https://api2.sota.org.uk/docs/index.html

 */

const DEBUG = false

const API_TIMEOUT = 3000 // 3 seconds

export const SOTASSOConfig = {
  issuer: 'https://sso.sota.org.uk/auth/realms/SOTA/',
  clientId: 'polo',
  redirectUrl: 'com.ham2k.polo://sota',
  scopes: ['openid']
}

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: 'https://',
  timeout: API_TIMEOUT,
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('Accept', 'application/json')
    headers.set('Content-type', 'application/json')
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
    if (!(endpoint === 'spots' || endpoint === 'epoch')) {
      headers.set('Authorization', `bearer ${getState().settings?.accounts?.sota?.accessToken}`)
      headers.set('id_token', getState().settings?.accounts?.sota?.idToken) // Required by spot API
    }
    return headers
  },
  responseHandler: async (response) => {
    if (DEBUG) console.log(`SOTAApi ${response.url} ${response.status}`)
    if (response.status === 200 || response.status === 201) { // 201 for spotting
      let data
      if (response.url.endsWith('epoch')) {
        data = await response.text()
      } else {
        data = await response.json()
      }
      if (DEBUG) console.log('-- response', data)
      return data
    } else {
      const body = await response.text()
      if (DEBUG) console.log('-- response', body)
      return { message: body }
    }
  }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  if (DEBUG) console.log('baseQueryWithReauth first call', { args })
  let result = await baseQueryWithSettings(args, api, extraOptions)

  let getNewToken = false
  if (result.error && result.meta.request.headers.has('id_Token')) {
    if (result.error.status === 401 || result.error.status === 403 || result.error.status === 500) {
      getNewToken = true
    }
  }

  if (getNewToken) {
    // try to get a new access token
    const refreshToken = api.getState().settings?.accounts?.sota?.refreshToken

    if (DEBUG) console.log('baseQueryWithReauth second call')
    try {
      const refreshResult = await refresh(SOTASSOConfig, { refreshToken })
      if (DEBUG) console.log('New access token received')
      api.dispatch(setAccountInfo({
        sota: {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken
        }
      }))
    } catch (error) {
      console.log(error)
      // react-native-app-auth Issue #861
      if (error.message.includes('Connection error') || error.message.includes('Network error')) {
        if (DEBUG) console.log('Connection error')
      } else if (error.code === 'invalid_grant') {
        console.log('Refresh token failed, logged out...')
        api.dispatch(setAccountInfo({ sota: { idToken: undefined } }))
      } else {
        // Let's not be too hasty clearing token
        console.log('Unknown error refreshing token', error.code)
      }
      // return original result
      return result
    }

    if (DEBUG) console.log('baseQueryWithReauth third call')
    result = await baseQueryWithSettings(args, api, extraOptions)
  }

  return result
}

export const apiSOTA = createApi({
  reducerPath: 'apiSOTA',
  baseQuery: baseQueryWithReauth,
  endpoints: builder => ({
    account: builder.query({
      query: () => 'sso.sota.org.uk/auth/realms/SOTA/account'
    }),
    spot: builder.query({
      query: (body) => ({
        url: 'api-db2.sota.org.uk/api/spots',
        method: 'POST',
        body
      })
    }),
    epoch: builder.query({
      query: () => 'api-db2.sota.org.uk/api/spots/epoch'
    }),
    spots: builder.query({
      query: ({ epoch, limit, band, mode }) => ({ // epoch used to invalidate cache
        url: `api-db2.sota.org.uk/api/spots/${limit}/${band ?? 'all'}/${mode ?? 'all'}/`
      }),
      keepUnusedDataFor: 15 * 60 // 15 minutes
    })
  })
})

export const { actions } = apiSOTA

export const { endpoints, reducerPath, reducer, middleware, useAccountQuery, useLazySpotQuery } = apiSOTA

export default apiSOTA.reducer
