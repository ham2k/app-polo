/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import packageJson from '../../../../package.json'
import { parseQRZCALLJson } from './parseQRZCALLJson'

/**

  QRZCALL.EU Premium JSON API
  https://qrzcall.eu/

  Authentication: a single long-lived Personal Access Token (PAT) the user
  generates at https://qrzcall.eu/ → My Profile → Account → API Tokens. The
  token is shaped `pat_<32 chars>`; PoLo stores it in
  settings.accounts.qrzcall.token and sends it as `Authorization: Bearer <token>`
  on every lookup.

  - GET /v1/pub/callsign_json.php?callsign=PA4R
        Authorization: Bearer pat_…
        → { success, api, data: { …fields } }   on a hit
        → { error: '…' }                          on a miss (HTTP 404) / failure

  Required tier: Data or Extra subscription on QRZCALL.EU (the upstream
  endpoint enforces this and returns 401/403 if the token's owner is on the
  Free tier).

  Why a PAT instead of callsign+password?
    - The user's QRZCALL.EU password never leaves the SPA where it's set
    - Each PoLo install (phone, tablet, laptop) gets its own revocable token
    - Revoking a single token doesn't break the user's other clients

 */

const DEBUG = false

const BASE_URL = 'https://api.qrzcall.eu/v1'
const JSON_PATH = '/pub/callsign_json.php'

const API_TIMEOUT = 5000 // 5 seconds

// 404 is a valid response (callsign not in database). Treat it as ok so the
// JSON parser / queryFn below can produce a friendly "not found" instead of
// surfacing a network error to the caller.
const baseQueryJson = fetchBaseQuery({
  baseUrl: `${BASE_URL}${JSON_PATH}`,
  timeout: API_TIMEOUT,
  validateStatus: (response) => response.status === 200 || response.status === 404,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().settings?.accounts?.qrzcall?.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
    return headers
  },
  responseHandler: async (response) => {
    const body = await response.text()
    if (response.status === 404) {
      return { _httpStatus: 404, _body: body }
    }
    try {
      const json = JSON.parse(body)
      if (DEBUG) console.log(`QRZCALLApi ${response.url} ${response.status}`)
      return json
    } catch (err) {
      return { _parseError: err.message, _body: body }
    }
  }
})

export const apiQRZCALL = createApi({
  reducerPath: 'apiQRZCALL',
  baseQuery: baseQueryJson,
  endpoints: builder => ({

    // Lookup a callsign
    //   GET https://api.qrzcall.eu/v1/pub/callsign_json.php?callsign=PA4R
    //   Authorization: Bearer pat_…

    lookupCall: builder.query({
      keepUnusedDataFor: 60 * 60 * 12, // 12 hours
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { call } = args
        if (!call || call.length < 3) return { data: {} }

        const token = api.getState().settings?.accounts?.qrzcall?.token
        if (!token) {
          return { error: 'QRZCALL.EU API token not configured', data: undefined }
        }

        const response = await baseQuery({
          url: '',
          params: { callsign: call }
        }, api, extraOptions)

        if (response.error) {
          // 401  = invalid or revoked token
          // 403  = subscription required (token's owner has no Data/Extra tier)
          // 429  = rate-limited
          // 5xx  = upstream broken
          const status = response.error?.status
          if (status === 401) {
            return { error: 'QRZCALL.EU token is invalid or has been revoked. Generate a new one in your account settings.', data: undefined }
          }
          if (status === 403) {
            return { error: 'QRZCALL.EU subscription required (Data or Extra tier).', data: undefined }
          }
          const detail = response.error?.data?.error || response.error?.error || JSON.stringify(response.error)
          return { error: `QRZCALL HTTP ${status || '???'}: ${detail}`, data: undefined }
        }

        if (response.data?._httpStatus === 404) {
          return { error: `${call} not found`, data: undefined }
        }

        if (response.data?._parseError) {
          return { error: `QRZCALL response parse failed: ${response.data._parseError}`, data: undefined }
        }

        if (response.data) {
          const parsed = parseQRZCALLJson(response.data, call)
          if (parsed.error) return { ...response, error: parsed.error, data: undefined }
          return { ...response, error: undefined, data: parsed.data, meta: response.meta }
        } else {
          return response
        }
      }
    })
  })
})

// JSON→record mapping + `cast*` helpers live in ./parseQRZCALLJson so they
// can be unit-tested without instantiating RTK Query / Redux.

export const { actions } = apiQRZCALL

export const { useLookupCallQuery } = apiQRZCALL

export const { endpoints, reducerPath, reducer, middleware } = apiQRZCALL

export default apiQRZCALL.reducer
