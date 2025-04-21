/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { XMLParser } from 'fast-xml-parser'

import packageJson from '../../../../package.json'
import { capitalizeString } from '../../../tools/capitalizeString'
import { setAccountInfo } from '../../settings'

/**

  QRZ.com XML API
  https://www.qrz.com/XML/current_spec.html

 */

const DEBUG = false

const BASE_URL = 'https://xmldata.qrz.com/'

const API_TIMEOUT = 3000 // 3 seconds

function defaultParams (api) {
  const session = api.getState().settings?.accounts?.qrz?.session
  return {
    s: session,
    agent: `ham2k-polo-${packageJson.version}`
  }
}

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: `${BASE_URL}/xml/current`,
  timeout: API_TIMEOUT,
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
  },
  responseHandler: async (response) => {
    if (response.status === 200) {
      const body = await response.text()
      const parser = new XMLParser()
      const xml = parser.parse(body)
      if (DEBUG) console.log(`QRZApi ${response.url} ${response.status}`)
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
    result.data?.QRZDatabase?.Session?.Error?.startsWith('Invalid session key') ||
    result.data?.QRZDatabase?.Session?.Error?.startsWith('Session Timeout') ||
    result.data?.QRZDatabase?.Session?.Error?.startsWith('Username / password required')
  ) {
    // try to get a new session key
    const { login, password } = api.getState().settings?.accounts?.qrz ?? {}
    if (DEBUG) console.log('baseQueryWithReauth second call')
    result = await baseQueryWithSettings({
      url: '',
      params: {
        ...defaultParams(api),
        s: undefined,
        username: login,
        password
      }
    }, api, extraOptions)

    if (result.data?.QRZDatabase?.Session?.Error) return { error: result.data?.QRZDatabase?.Session?.Error, meta: result.meta }

    const newSession = result.data?.QRZDatabase?.Session?.Key
    if (newSession) {
      if (DEBUG) console.log('New Session', newSession)
      await api.dispatch(setAccountInfo({ qrz: { ...api.getState().settings?.accounts?.qrz, session: newSession } }))
      args.params = { ...args.params, ...defaultParams(api) } // Refresh params to include new session info

      if (DEBUG) console.log('baseQueryWithReauth third call')
      result = await baseQueryWithSettings(args, api, extraOptions)
    } else {
      await api.dispatch(setAccountInfo({ qrz: { ...api.getState().settings?.accounts?.qrz, session: undefined } }))
      return { error: 'Unexpected error logging into QRZ.com', result }
    }
  }
  return result
}

export const apiQRZ = createApi({
  reducerPath: 'apiQRZ',
  baseQuery: baseQueryWithReauth,
  endpoints: builder => ({

    // Lookup a callsign
    //   https://xmldata.qrz.com/xml/current/?s=SESSIONKEY;callsign=xx1xxx

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
          const error = xml?.QRZDatabase?.Session?.Error

          if (error) {
            if (error.startsWith('Not found')) {
              return { error: `${call} not found`, data: undefined }
            } else {
              return { ...response, error, data: undefined }
            }
          } else {
            const callsignInfo = xml?.QRZDatabase?.Callsign || {}

            return {
              ...response,
              error: undefined,
              data: {
                name: [
                  capitalizeString(callsignInfo.fname, { content: 'name', force: false }),
                  callsignInfo.nickname ? `“${capitalizeString(callsignInfo.nickname, { content: 'name', force: false })}”` : undefined,
                  capitalizeString(callsignInfo.name, { content: 'name', force: false })
                ].filter(x => x).join(' '),
                call: castString(callsignInfo.call),
                allCalls: [castString(callsignInfo.call)].concat(castString(callsignInfo.aliases).split(',')).concat([castString(callsignInfo.xref)]).filter(x => x),
                firstName: castString(callsignInfo.fname),
                lastName: castString(callsignInfo.name),
                tz: castString(callsignInfo.TimeZone),
                gmtOffset: castNumber(callsignInfo.GMTOffset),
                city: capitalizeString(callsignInfo.addr2, { content: 'address', force: false }),
                state: castString(callsignInfo.state),
                country: capitalizeString(callsignInfo.country, { force: false }),
                postal: castString(callsignInfo.zip),
                county: capitalizeString(callsignInfo.county, { force: false }),
                grid: castString(callsignInfo.grid),
                cqZone: castNumber(callsignInfo.cqzone),
                ituZone: castNumber(callsignInfo.ituzone),
                dxccCode: castNumber(callsignInfo.dxcc),
                lat: castNumber(callsignInfo.lat),
                lon: castNumber(callsignInfo.lon),
                image: castString(callsignInfo.image),
                imageInfo: (callsignInfo.imageinfo || '').split(':')
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

export const { actions } = apiQRZ

export const { useLookupCallQuery } = apiQRZ

export const { endpoints, reducerPath, reducer, middleware } = apiQRZ

export default apiQRZ.reducer
