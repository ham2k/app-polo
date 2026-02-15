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

const BASE_URL = 'https://'

const API_TIMEOUT = 3000 // 3 seconds

function defaultParams (api) {
  const session = api.getState().settings?.accounts?.qrz?.session
  return {
    s: session,
    agent: `ham2k-polo-${packageJson.version}`
  }
}

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: `${BASE_URL}`,
  timeout: API_TIMEOUT,
  prepareHeaders: (headers, { getState, endpoint }) => {
    headers.set('User-Agent', `ham2k-polo-${packageJson.version}`)
  },
  responseHandler: async (response) => {
    if (response.ok) {
      const contentType = response.headers.get('content-type') || ''
      const body = await response.text()
      let data
      if (contentType.includes('xml')) {
        const parser = new XMLParser()
        data = parser.parse(body)
      } else if (contentType.includes('plain')) {
        const parsed = new URLSearchParams(body)
        data = Object.fromEntries(parsed.entries())
      }
      if (DEBUG) console.log(`QRZApi ${response.url} ${response.status}`)
      if (DEBUG) console.log('-- url', response.url)
      if (DEBUG) console.log('-- content-type', contentType)
      if (DEBUG) console.log('-- response', data)
      return data || body
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
      url: 'xmldata.qrz.com/xml/current/',
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
  endpoints: builder => ({

    // Lookup a callsign
    //   https://xmldata.qrz.com/xml/current/?s=SESSIONKEY;callsign=xx1xxx

    lookupCall: builder.query({
      keepUnusedDataFor: 60 * 60 * 12, // 12 hours
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { call } = args
        if (!call || call.length < 3) return { data: {} }

        const response = await baseQueryWithReauth({
          url: 'xmldata.qrz.com/xml/current/',
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
    }),
    logbookStatus: builder.query({
      keepUnusedDataFor: 60 * 60 * 12, // 12 hours
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { apiKey } = args
        const formData = new FormData()
        formData.append('KEY', apiKey)
        formData.append('ACTION', 'STATUS')
        const response = await baseQueryWithSettings({
          url: 'logbook.qrz.com/api',
          method: 'POST',
          body: formData
        }, api, extraOptions)
        if (response.data) {
          const data = response.data
          if (data?.RESULT !== 'OK') {
            return { ...response, error: data, data: undefined }
          }
          return {
            ...response,
            error: undefined,
            data: {
              callsign: data.CALLSIGN,
              name: data.BOOK_NAME,
              startDate: data.START_DATE ? new Date(`${data.START_DATE}T00:00:00Z`) : null,
              endDate: data.END_DATE ? new Date(`${data.END_DATE}T00:00:00Z`) : null,
            }
          }
        } else {
          return response
        }
      }
    }),
    logbookInsert: builder.query({
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { apiKey, adif } = args
        const formData = new FormData()
        formData.append('KEY', apiKey)
        formData.append('ACTION', 'INSERT')
        formData.append('ADIF', adif)
        formData.append('OPTION', 'REPLACE')
        const response = await baseQueryWithSettings({
          url: 'logbook.qrz.com/api',
          method: 'POST',
          body: formData
        }, api, extraOptions)
        if (response.data) {
          const data = response.data
          if (!(data?.RESULT == 'OK' || data?.RESULT == 'REPLACE')) {
            return { ...response, error: data, data: undefined }
          }
          return {
            ...response,
            error: undefined,
            data: {
              result: data.RESULT,  // "OK" or "REPLACE"
              logId: data.LOGID
            }
          }
        } else {
          return response
        }
      }
    }),
    logbookDelete: builder.query({
      queryFn: async (args, api, extraOptions, baseQuery) => {
        const { apiKey, logIds } = args
        const formData = new FormData()
        formData.append('KEY', apiKey)
        formData.append('ACTION', 'DELETE')
        formData.append('LOGIDS', logIds.join(','))
        const response = await baseQueryWithSettings({
          url: 'logbook.qrz.com/api',
          method: 'POST',
          body: formData
        }, api, extraOptions)
        if (response.data) {
          const data = response.data
          if (!(data?.RESULT === 'OK' || data?.RESULT === 'PARTIAL')) {
            return { ...response, error: data, data: undefined }
          }
          return {
            ...response,
            error: undefined,
            data: {
              result: data.RESULT,  // "OK" or "PARTIAL"
              logIds: data?.LOGIDS ? data.LOGIDS.split(',') : [],
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
