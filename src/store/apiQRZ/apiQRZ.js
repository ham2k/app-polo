import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { XMLParser } from 'fast-xml-parser'

import packageJson from '../../../package.json'
import { setAccountInfo } from '../settings'
import { capitalizeString } from '../../tools/capitalizeString'

/**

  QRZ.com XML API
  https://www.qrz.com/XML/current_spec.html

 */

const BASE_URL = 'https://xmldata.qrz.com/'

function defaultParams (api) {
  const session = api.getState().settings?.accounts?.qrz?.session
  return {
    s: session,
    agent: `ham2k-polo-${packageJson.version}`
  }
}

const baseQueryWithSettings = fetchBaseQuery({
  baseUrl: `${BASE_URL}/xml/current`,
  responseHandler: async (response) => {
    if (response.status === 200) {
      const body = await response.text()
      const parser = new XMLParser()
      const xml = parser.parse(body)
      // console.log(`QRZApi ${response.url} ${response.status}`)
      // console.log(xml)
      return xml
    } else {
      return {}
    }
  }
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQueryWithSettings(args, api, extraOptions)

  console.log('baseQueryWithReauth first call', result?.data?.QRZDatabase)
  if ((result.error && result.error.status === 401) ||
    result.data?.QRZDatabase?.Session?.Error?.startsWith('Invalid session key') ||
    result.data?.QRZDatabase?.Session?.Error?.startsWith('Session Timeout') ||
    result.data?.QRZDatabase?.Session?.Error?.startsWith('Username / password required')
  ) {
    api.dispatch(setAccountInfo({ qrz: { session: undefined } }))
    // try to get a new session key
    const { login, password } = api.getState().settings?.accounts?.qrz
    result = await baseQueryWithSettings({
      url: '',
      params: {
        ...defaultParams(api),
        username: login,
        password
      }
    }, api, extraOptions)

    console.log('baseQueryWithReauth second call', result?.data?.QRZDatabase)

    if (result.data?.QRZDatabase?.Session?.Error) return { error: result.data?.QRZDatabase?.Session?.Error, meta: result.meta }

    const session = result.data?.QRZDatabase?.Session?.Key
    if (session) {
      api.dispatch(setAccountInfo({ qrz: { session } }))

      result = await baseQueryWithSettings(args, api, extraOptions)
      console.log('baseQueryWithReauth third call', result?.data?.QRZDatabase)
    } else {
      api.dispatch(setAccountInfo({ qrz: { session: undefined } }))
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
      // responseHandler: async (response) => {
      //   console.log('lookupCall responseHandler', response)
      //   return response
      // },
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
                  callsignInfo.nickname ? `“${callsignInfo.nickname}”` : undefined,
                  capitalizeString(callsignInfo.name, { content: 'name', force: false })
                ].filter(x => x).join(' '),
                call: callsignInfo.call,
                firstName: callsignInfo.fname,
                lastName: callsignInfo.name,
                tz: callsignInfo.TimeZone,
                gmtOffset: callsignInfo.GMTOffset,
                city: capitalizeString(callsignInfo.addr2, { force: false }),
                state: callsignInfo.state,
                country: capitalizeString(callsignInfo.country, { force: false }),
                postal: callsignInfo.zip,
                county: capitalizeString(callsignInfo.county, { force: false }),
                grid: callsignInfo.grid,
                cqZone: callsignInfo.cqzone,
                ituZone: callsignInfo.ituzone,
                dxccCode: callsignInfo.dxcc,
                lat: callsignInfo.lat,
                lon: callsignInfo.lon,
                image: callsignInfo.image,
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

export const { actions } = apiQRZ

export const { useLookupCallQuery } = apiQRZ

export const { endpoints, reducerPath, reducer, middleware } = apiQRZ

export default apiQRZ.reducer
