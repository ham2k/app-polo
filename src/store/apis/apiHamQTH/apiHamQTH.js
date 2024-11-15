/*
/
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { XMLParser } from 'fast-xml-parser'

import packageJson from '../../../../package.json'
import { capitalizeString } from '../../../tools/capitalizeString'

/**

  HamQTH.com XML API
  https://www.hamqth.com/developers.php

 */

const DEBUG = false

const BASE_URL = 'https://www.hamqth.com/'

const apiState = {}

function defaultParams (api) {
  const session = apiState.session
  return {
    id: session,
    prg: `ham2k-polo-${packageJson.version}`
  }
}

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: `${BASE_URL}/xml.php`,
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
  },
  responseHandler: async (response) => {
    if (response.status === 200) {
      const body = await response.text()
      const parser = new XMLParser()
      const xml = parser.parse(body)
      if (DEBUG) console.log(`HamQTHApi ${response.url} ${response.status}`)
      if (DEBUG) console.log('-- url', response.url)
      if (DEBUG) console.log('-- response', xml)
      return xml
    } else {
      return {}
    }
  }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  if (DEBUG) console.log('baseQueryWithReauth first call', { args })
  let result = await baseQueryWithSettings(args, api, extraOptions)

  if ((result.error && result.error.status === 401) ||
    result.data?.HamQTH?.session?.error?.startsWith('Username or password missing') ||
    result.data?.HamQTH?.session?.error?.startsWith('Session does not exist or expired') ||
    result.data?.HamQTH?.session?.error?.startsWith('Wrong user name or password')
  ) {
    apiState.session = undefined
    // try to get a new session key
    const { login, password } = api.getState().settings?.accounts?.hamqth ?? {}
    if (DEBUG) console.log('baseQueryWithReauth second call')
    result = await baseQueryWithSettings({
      url: '',
      params: {
        ...defaultParams(api),
        u: login,
        p: password
      }
    }, api, extraOptions)

    if (result.data?.HamQTH?.session?.error) return { error: result.data?.HamQTH?.session?.error, meta: result.meta }

    const session = result.data?.HamQTH?.session?.session_id
    if (session) {
      if (DEBUG) console.log('New Session', session)
      apiState.session = session
      args.params = { ...args.params, ...defaultParams(api) } // Refresh params to include new session info

      if (DEBUG) console.log('baseQueryWithReauth third call')
      result = await baseQueryWithSettings(args, api, extraOptions)
    } else {
      apiState.session = undefined
      return { error: 'Unexpected error logging into HamQTH' }
    }
  }
  return result
}

export const apiHamQTH = createApi({
  reducerPath: 'apiHamQTH',
  baseQuery: baseQueryWithReauth,
  endpoints: builder => ({

    // Lookup a callsign
    //   https://www.hamqth.com/xml.php?id=SESSIONKEY&callsign=xx2xxx&prg=YOUR_PROGRAM_NAME

    lookupCall: builder.query({
      keepUnusedDataFor: 60 * 60 * 12, // 12 hours
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { call } = args
        if (!call || call.length < 3) return { data: {} }

        const response = await baseQuery({
          url: '',
          params: {
            ...defaultParams(api),
            callsign: call
          }
        }, api, extraOptions)

        if (response.data) {
          const xml = response.data
          const error = xml?.HamQTH?.session?.error

          if (error) {
            if (error.startsWith('Callsign not found')) {
              return { error: `${call} not found`, data: undefined }
            } else {
              return { ...response, error, data: undefined }
            }
          } else {
            const callsignInfo = xml?.HamQTH?.search || {}

            // Image always returned...lets drop default images
            let image = castString(callsignInfo.picture)
            if (image.startsWith('https://www.hamqth.com/images/default/')) {
              image = undefined
            }

            return {
              ...response,
              error: undefined,
              data: {
                name: capitalizeString(callsignInfo.nick, { content: 'name', force: false }),
                call: castString(callsignInfo.callsign).toUpperCase(),
                gmtOffset: castNumber(callsignInfo.utc_offset),
                city: capitalizeString(callsignInfo.qth, { content: 'address', force: false }),
                state: castString(callsignInfo.us_state),
                country: capitalizeString(callsignInfo.country, { force: false }),
                postal: castString(callsignInfo.adr_zip),
                county: capitalizeString(callsignInfo.us_county, { force: false }),
                grid: castString(callsignInfo.grid),
                cqZone: castNumber(callsignInfo.CQ),
                ituZone: castNumber(callsignInfo.itu),
                dxccCode: castNumber(callsignInfo.adif),
                lat: castNumber(callsignInfo.latitude),
                lon: castNumber(callsignInfo.longitude),
                image
              },
              meta: response.meta
            }
          }
        } else {
          return response
        }
      }
    })
  })
})

function castString (value) {
  if (value === undefined || value === null) return ''
  return String(value)
}

function castNumber (value) {
  if (value === undefined || value === null) return null
  const number = Number(value)
  if (isNaN(number)) return null
  return number
}

export const { actions } = apiHamQTH

export const { useLookupCallQuery } = apiHamQTH

export const { endpoints, reducerPath, reducer, middleware } = apiHamQTH

export default apiHamQTH.reducer
