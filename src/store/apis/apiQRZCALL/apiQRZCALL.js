/*
 * Copyright ©️ 2026 Ronald de Heer <PA4R>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { XMLParser } from 'fast-xml-parser'

import packageJson from '../../../../package.json'
import { setAccountInfo } from '../../settings'
import { parseQRZCALLXml } from './parseQRZCALLXml'

/**

  QRZCALL.EU Premium XML API
  https://qrzcall.eu/

  - POST  /v1/auth/login.php       { callsign, password } → { token, expires_in }
  - GET   /v1/pub/callsign_xml.php  Authorization: Bearer <jwt>
            Returns a QRZ-compatible <QRZCALLDatabase> document.

  Required: a Data or Extra subscription on QRZCALL.EU.

 */

const DEBUG = false

const BASE_URL = 'https://api.qrzcall.eu/v1'
const AUTH_PATH = '/auth/login.php'
const XML_PATH = '/pub/callsign_xml.php'

const API_TIMEOUT = 5000 // 5 seconds

// 404 is a valid response (callsign not in database). Treat it as ok so the
// XML parser can process the body (or so we can return a clean "not found"
// from the queryFn below). 401 stays an error → triggers re-auth.
const baseQueryXml = fetchBaseQuery({
  baseUrl: `${BASE_URL}${XML_PATH}`,
  timeout: API_TIMEOUT,
  validateStatus: (response) => response.status === 200 || response.status === 404,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().settings?.accounts?.qrzcall?.session
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
      const parser = new XMLParser()
      const xml = parser.parse(body)
      if (DEBUG) console.log(`QRZCALLApi ${response.url} ${response.status}`)
      return xml
    } catch (err) {
      return { _parseError: err.message, _body: body }
    }
  }
})

/**
 * Wraps the XML query with automatic JWT re-issuance.  If the XML endpoint
 * returns 401 (expired/invalid JWT) or the JWT is absent, we POST to
 * /auth/login.php with the stored callsign + password, store the new JWT,
 * and retry the original call once.
 */
const baseQueryWithReauth = async (args, api, extraOptions) => {
  if (DEBUG) console.log('QRZCALL reauth first call', { args })
  let result = await baseQueryXml(args, api, extraOptions)

  const needsAuth = result.error?.status === 401 || !api.getState().settings?.accounts?.qrzcall?.session

  if (needsAuth) {
    const { login, password } = api.getState().settings?.accounts?.qrzcall ?? {}
    if (!login || !password) {
      return { error: 'QRZCALL.EU credentials not configured', meta: result.meta }
    }

    if (DEBUG) console.log('QRZCALL fetching new JWT')
    let authResponse
    try {
      authResponse = await fetch(`${BASE_URL}${AUTH_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `ham2k-polo-${packageJson.version}`
        },
        body: JSON.stringify({ callsign: String(login).toUpperCase(), password })
      })
    } catch (err) {
      return { error: `QRZCALL.EU network error: ${err.message}`, meta: result.meta }
    }

    if (authResponse.status !== 200) {
      let body
      try { body = await authResponse.json() } catch { body = {} }
      await api.dispatch(setAccountInfo({ qrzcall: { ...api.getState().settings?.accounts?.qrzcall, session: undefined } }))
      const msg = body?.error || `HTTP ${authResponse.status}`
      return { error: `QRZCALL.EU login failed: ${msg}`, meta: result.meta }
    }

    const authJson = await authResponse.json()
    const token = authJson?.token
    if (!token) {
      await api.dispatch(setAccountInfo({ qrzcall: { ...api.getState().settings?.accounts?.qrzcall, session: undefined } }))
      return { error: 'QRZCALL.EU returned no token', meta: result.meta }
    }

    if (DEBUG) console.log('QRZCALL got new JWT, retrying')
    await api.dispatch(setAccountInfo({ qrzcall: { ...api.getState().settings?.accounts?.qrzcall, session: token } }))
    result = await baseQueryXml(args, api, extraOptions)
  }

  return result
}

export const apiQRZCALL = createApi({
  reducerPath: 'apiQRZCALL',
  baseQuery: baseQueryWithReauth,
  endpoints: builder => ({

    // Lookup a callsign
    //   GET https://api.qrzcall.eu/v1/pub/callsign_xml.php?callsign=PA4R
    //   Authorization: Bearer <jwt>

    lookupCall: builder.query({
      keepUnusedDataFor: 60 * 60 * 12, // 12 hours
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { call } = args
        if (!call || call.length < 3) return { data: {} }

        const response = await baseQuery({
          url: '',
          params: { callsign: call }
        }, api, extraOptions)

        if (response.error) {
          // 401 means reauth failed (handled in baseQueryWithReauth already returned an error).
          // 429 means rate-limited. Anything else is unexpected.
          const status = response.error?.status
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
          const parsed = parseQRZCALLXml(response.data, call)
          if (parsed.error) return { ...response, error: parsed.error, data: undefined }
          return { ...response, error: undefined, data: parsed.data, meta: response.meta }
        } else {
          return response
        }
      }
    })
  })
})

// XML→record mapping + `cast*` helpers live in ./parseQRZCALLXml so they
// can be unit-tested without instantiating RTK Query / Redux.

export const { actions } = apiQRZCALL

export const { useLookupCallQuery } = apiQRZCALL

export const { endpoints, reducerPath, reducer, middleware } = apiQRZCALL

export default apiQRZCALL.reducer
